/**
 * Configuração do provedor de IA pela interface.
 *
 * O usuário informa URL + chave, o servidor consulta `${baseUrl}/models` (contrato
 * OpenAI) e devolve a lista. Ao salvar, a configuração é aplicada em memória e gravada
 * em `otto_workspace/.otto_provider.json` (0600) — a chave nunca volta para o cliente
 * inteira, só um recorte.
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { WORKSPACE_DIR } from './memoryStore.js';

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  updatedAt: string;
}

export interface ProviderModel {
  id: string;
  ownedBy?: string;
  contextLength?: number;
  kind: 'chat' | 'audio' | 'embedding' | 'other';
}

const CONFIG_PATH = path.join(WORKSPACE_DIR, '.otto_provider.json');
const MAX_MODELS_RESPONSE_BYTES = 512 * 1024;

/** Ids que não conversam (embeddings, TTS, moderação…) ficam fora da lista padrão. */
function classifyModel(id: string): ProviderModel['kind'] {
  const lower = id.toLowerCase();
  if (/(embed|rerank)/.test(lower)) return 'embedding';
  if (/(whisper|tts|audio|speech|voice)/.test(lower)) return 'audio';
  if (/^(text-|bge-|clip)/.test(lower)) return 'other';
  return 'chat';
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public hint?: string,
    public triedUrl?: string
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function normalizeBaseUrl(raw: string): string {
  let value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) {
    throw new ProviderError('Informe a URL da API (ex: https://api.groq.com/openai/v1).', 'BAD_URL');
  }

  // "api.groq.com/v1" é o que a maioria cola; completa o protocolo em vez de recusar.
  // Servidor local (Ollama, LM Studio) quase sempre é http, não https.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(value);
    value = `${isLocal ? 'http' : 'https'}://${value}`;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProviderError('URL inválida. Precisa começar com http:// ou https://.', 'BAD_URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ProviderError('Só aceito http:// ou https://.', 'BAD_URL');
  }

  if (url.protocol === 'http:' && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/.test(url.hostname)) {
    // Chave indo em texto claro pela rede: avisa, mas não bloqueia (rede interna existe).
    console.warn(`[Provider] URL http:// sem TLS para ${url.hostname} — a chave viaja sem criptografia.`);
  }

  // quem cola ".../v1/chat/completions" quer ".../v1"
  return value.replace(/\/chat\/completions$/, '');
}

/**
 * Consulta a lista de modelos do provedor. Sem rede, devolve erro claro em vez de travar.
 *
 * `apiKey` vazio cai na chave já salva (ou do .env): quem deixou o campo em branco
 * quer testar o que já está configurado, não testar "sem chave".
 */
export async function fetchProviderModels(options: {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** Chave usada quando o campo vem vazio. */
  fallbackKey?: string;
}): Promise<{ models: ProviderModel[]; baseUrl: string; raw: number; usedKeyPreview: string | null }> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const apiKey = String(options.apiKey || '').trim() || String(options.fallbackKey || '').trim();
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 12_000, 2_000), 30_000);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const requestModels = async (url: string) => {
    const response = await fetch(`${url}/models`, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: controller.signal,
    });
    return response;
  };

  let triedUrl = `${baseUrl}/models`;

  try {
    let response = await requestModels(baseUrl);

    // Muita gente cola ".../openai" sem o /v1. Se deu 404 e a URL não tem versão, tenta /v1.
    if (response.status === 404 && !/\/v\d+$/.test(baseUrl)) {
      const retryUrl = `${baseUrl}/v1`;
      triedUrl = `${retryUrl}/models`;
      response = await requestModels(retryUrl);
      if (response.ok) {
        const retried = await parseModelsResponse(response, triedUrl);
        return { ...retried, baseUrl: retryUrl, usedKeyPreview: previewKey(apiKey) };
      }
    }

    const parsed = await parseModelsResponse(response, triedUrl);
    return { ...parsed, baseUrl, usedKeyPreview: previewKey(apiKey) };
  } catch (error) {
    throw describeProviderFailure(error, triedUrl, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}

/** Converte a resposta em modelos, com erros específicos por status. */
async function parseModelsResponse(
  response: Response,
  triedUrl: string
): Promise<{ models: ProviderModel[]; raw: number; usedKeyPreview: string | null }> {
  {
    const text = await response.text();
    if (text.length > MAX_MODELS_RESPONSE_BYTES) {
      throw new ProviderError(
        'A resposta do provedor é grande demais para ser uma lista de modelos.',
        'BAD_RESPONSE',
        'Confira se a URL aponta para a API (ex: .../openai/v1), não para um site.',
        triedUrl
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderError(
        'O provedor recusou a chave (401/403).',
        'BAD_KEY',
        'Cole a chave de novo — se o campo estiver vazio, a chave salva é usada. Confira também se ela é do mesmo provedor da URL.',
        triedUrl
      );
    }
    if (response.status === 404) {
      throw new ProviderError(
        'O provedor respondeu 404 nessa URL.',
        'HTTP_ERROR',
        'Falta o caminho da API. Groq e OpenAI usam /openai/v1 e /v1 no fim da URL.',
        triedUrl
      );
    }
    if (!response.ok) {
      throw new ProviderError(
        `O provedor respondeu ${response.status}. ${text.slice(0, 120)}`,
        'HTTP_ERROR',
        'Se o status for 429, é limite de requisições da sua conta.',
        triedUrl
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ProviderError(
        'A resposta não é JSON.',
        'BAD_RESPONSE',
        'A URL provavelmente aponta para um site ou painel, não para a API.',
        triedUrl
      );
    }

    // OpenAI/Groq usam { data: [...] }; Ollama usa { models: [...] }
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : null;
    if (!list) {
      throw new ProviderError(
        'A resposta não tem lista de modelos.',
        'BAD_RESPONSE',
        'Confira a URL base (ex: https://api.groq.com/openai/v1).',
        triedUrl
      );
    }

    const models: ProviderModel[] = list
      .map((item: any) => {
        const id = String(item?.id || item?.name || item?.model || '').trim();
        if (!id) return null;
        return {
          id,
          ownedBy: item?.owned_by || item?.ownedBy || item?.publisher,
          contextLength:
            item?.context_window || item?.context_length || item?.contextWindow || item?.max_context_length,
          kind: classifyModel(id),
        } satisfies ProviderModel;
      })
      .filter(Boolean) as ProviderModel[];

    if (models.length === 0) {
      throw new ProviderError(
        'O provedor respondeu, mas sem modelos.',
        'EMPTY',
        'A chave pode não ter permissão para listar modelos, ou a conta está sem acesso.',
        triedUrl
      );
    }

    // conversa primeiro, depois alfabético
    models.sort((a, b) => {
      const weight = (kind: ProviderModel['kind']) => (kind === 'chat' ? 0 : kind === 'other' ? 1 : 2);
      return weight(a.kind) - weight(b.kind) || a.id.localeCompare(b.id);
    });

    return { models, raw: list.length, usedKeyPreview: null };
  }
}

export function previewKey(key: string): string | null {
  const value = String(key || '').trim();
  if (!value) return null;
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : '••••';
}

/** Traduz falha de rede/timeout em algo que diz onde procurar o problema. */
function describeProviderFailure(error: unknown, triedUrl: string, timeoutMs: number): ProviderError {
  if (error instanceof ProviderError) return error;

  if ((error as Error)?.name === 'AbortError') {
    return new ProviderError(
      `O provedor não respondeu em ${Math.round(timeoutMs / 1000)}s.`,
      'TIMEOUT',
      'A máquina pode estar lenta ou bloqueando a saída. Tente de novo.',
      triedUrl
    );
  }

  const cause = (error as any)?.cause?.code || (error as any)?.code || '';
  const host = (() => {
    try {
      return new URL(triedUrl).host;
    } catch {
      return triedUrl;
    }
  })();

  return new ProviderError(
    `Não consegui falar com ${host}${cause ? ` (${cause})` : ''}.`,
    'NETWORK',
    `Isso é a máquina onde o OTTO roda, não a chave: ela não abriu conexão com ${host}. ` +
      'Se o OTTO está rodando numa nuvem/preview, o provedor pode estar bloqueado lá — na sua máquina funciona.',
    triedUrl
  );
}

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------

export function getProviderConfig(): ProviderConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    if (!parsed?.baseUrl || !parsed?.model) return null;
    return {
      baseUrl: String(parsed.baseUrl),
      apiKey: String(parsed.apiKey || ''),
      model: String(parsed.model),
      updatedAt: String(parsed.updatedAt || ''),
    };
  } catch {
    return null;
  }
}

/** Aplica no processo atual: a partir daqui o OTTO usa esse provedor/modelo. */
export function applyProviderConfig(config: ProviderConfig): void {
  process.env.GROQ_BASE_URL = normalizeBaseUrl(config.baseUrl);
  process.env.AI_MODEL = config.model;
  if (config.apiKey) {
    process.env.GROQ_API_KEY = config.apiKey;
  }
}

export function saveProviderConfig(input: { baseUrl: string; apiKey: string; model: string }): ProviderConfig {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const model = String(input.model || '').trim();
  if (!model) throw new ProviderError('Escolha um modelo da lista antes de salvar.', 'NO_MODEL');

  const existing = getProviderConfig();
  const config: ProviderConfig = {
    baseUrl,
    // chave vazia mantém a anterior (o usuário pode trocar só o modelo)
    apiKey: String(input.apiKey || '').trim() || existing?.apiKey || '',
    model,
    updatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
  try {
    fs.chmodSync(CONFIG_PATH, 0o600);
  } catch {}

  applyProviderConfig(config);
  return config;
}

/** Remove a configuração da interface e volta ao que estiver no .env. */
export function clearProviderConfig(): void {
  try {
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
  } catch {}

  // O processo guarda os valores aplicados em memória: relê o .env para restaurar.
  dotenv.config({ override: true });
  if (!process.env.GROQ_API_KEY) delete process.env.GROQ_API_KEY;
  if (!process.env.AI_MODEL) delete process.env.AI_MODEL;
  if (!process.env.GROQ_BASE_URL) delete process.env.GROQ_BASE_URL;
}

/** Chamado no boot: a escolha do usuário sobrevive ao restart. */
export function loadProviderConfigOnBoot(): ProviderConfig | null {
  const config = getProviderConfig();
  if (config) {
    applyProviderConfig(config);
    console.log(`[Provider] Usando ${config.model} em ${config.baseUrl} (configurado pela interface).`);
  }
  return config;
}

/** Chave em vigor: a salva pela interface ou a do .env. */
export function currentProviderKey(): string {
  return getProviderConfig()?.apiKey || process.env.GROQ_API_KEY || '';
}

export function publicProviderStatus() {
  const config = getProviderConfig();
  const baseUrl = config?.baseUrl || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const key = config?.apiKey || process.env.GROQ_API_KEY || '';
  return {
    baseUrl,
    model: config?.model || process.env.AI_MODEL || 'openai/gpt-oss-120b',
    hasKey: Boolean(key),
    keyPreview: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null,
    source: config ? 'interface' : 'env',
    updatedAt: config?.updatedAt || null,
  };
}
