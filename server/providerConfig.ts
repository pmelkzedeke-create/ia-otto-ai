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
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function normalizeBaseUrl(raw: string): string {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) throw new ProviderError('Informe a URL da API (ex: https://api.groq.com/openai/v1).', 'BAD_URL');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProviderError('URL inválida. Precisa começar com http:// ou https://.', 'BAD_URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ProviderError('Só aceito http:// ou https://.', 'BAD_URL');
  }

  // quem cola ".../v1/chat/completions" quer ".../v1"
  return value.replace(/\/chat\/completions$/, '');
}

/**
 * Consulta a lista de modelos do provedor. Sem rede, devolve erro claro em vez de travar.
 */
export async function fetchProviderModels(options: {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}): Promise<{ models: ProviderModel[]; baseUrl: string; raw: number }> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const apiKey = String(options.apiKey || '').trim();
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 12_000, 2_000), 30_000);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: controller.signal,
    });

    const text = await response.text();
    if (text.length > MAX_MODELS_RESPONSE_BYTES) {
      throw new ProviderError('A resposta do provedor é grande demais para ser uma lista de modelos.', 'BAD_RESPONSE');
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderError('A chave foi recusada pelo provedor (401/403). Confira a API key.', 'BAD_KEY');
    }
    if (!response.ok) {
      throw new ProviderError(`O provedor respondeu ${response.status}. ${text.slice(0, 120)}`, 'HTTP_ERROR');
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ProviderError('A resposta não é JSON. Confira se a URL aponta para a API certa.', 'BAD_RESPONSE');
    }

    // OpenAI/Groq usam { data: [...] }; Ollama usa { models: [...] }
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : null;
    if (!list) {
      throw new ProviderError('A resposta não tem lista de modelos. Confira a URL base (ex: .../openai/v1).', 'BAD_RESPONSE');
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
      throw new ProviderError('O provedor respondeu, mas sem modelos. A chave tem permissão?', 'EMPTY');
    }

    // conversa primeiro, depois alfabético
    models.sort((a, b) => {
      const weight = (kind: ProviderModel['kind']) => (kind === 'chat' ? 0 : kind === 'other' ? 1 : 2);
      return weight(a.kind) - weight(b.kind) || a.id.localeCompare(b.id);
    });

    return { models, baseUrl, raw: list.length };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new ProviderError(`O provedor não respondeu em ${Math.round(timeoutMs / 1000)}s.`, 'TIMEOUT');
    }

    const cause = (error as any)?.cause?.code || (error as any)?.code;
    throw new ProviderError(
      `Não consegui falar com o provedor${cause ? ` (${cause})` : ''}. Confira a URL, a internet ou o proxy.`,
      'NETWORK'
    );
  } finally {
    clearTimeout(timer);
  }
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
