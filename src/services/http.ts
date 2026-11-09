/**
 * Cliente HTTP único das chamadas de API do OTTO.
 *
 * Todas as rotas /api do servidor exigem o header `x-otto-token`.
 * O token chega pela meta tag <meta name="otto-token"> injetada no HTML
 * (dev: plugin do Vite; produção: Express) e pode ser sobrescrito em runtime
 * com setAccessToken — útil quando a página é servida por outro host.
 *
 * Regras de resiliência (antes não existiam):
 * - toda requisição tem timeout — nunca fica em spinner infinito;
 * - falhas transitórias (rede, 502, 503, 504) têm retry com backoff;
 * - erros são traduzidos para uma frase útil em português via describeApiError.
 */

const SESSION_TOKEN_STORAGE_KEY = 'otto_session_token';

/** Tempo máximo por tentativa quando o chamador não define outro. */
export const DEFAULT_TIMEOUT_MS = 30_000;
/** Tentativas extras para GET/POST simples em falha transitória. */
export const DEFAULT_RETRIES = 1;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

export class ApiAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/** A requisição estourou o tempo limite (ou foi abortada pelo usuário). */
export class ApiTimeoutError extends Error {
  constructor(message = 'A resposta do OTTO demorou demais. Tente novamente.') {
    super(message);
    this.name = 'ApiTimeoutError';
  }
}

export function readSessionToken(): string {
  if (typeof document === 'undefined') return '';
  try {
    const stored = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* localStorage indisponível */
  }
  const meta = document.querySelector('meta[name="otto-token"]');
  return meta?.getAttribute('content') || '';
}

export function setAccessToken(token: string): void {
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export interface ApiFetchOptions {
  /** Tempo máximo por tentativa. Use 0 para desligar. */
  timeoutMs?: number;
  /** Tentativas extras em erro transitório (padrão 1). */
  retries?: number;
  /** Base do backoff exponencial, em ms. */
  retryDelayMs?: number;
}

function isAbortError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === 'AbortError' || name === 'TimeoutError';
}

function canRetry(init: RequestInit): boolean {
  // Corpos em stream não podem ser reenviados.
  const body = init.body as unknown;
  if (body && typeof body === 'object' && 'getReader' in (body as object)) return false;
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSignal(timeoutMs: number, external?: AbortSignal | null): { signal?: AbortSignal; cancel: () => void } {
  if (!timeoutMs && !external) return { signal: undefined, cancel: () => {} };

  const controller = new AbortController();
  const timer =
    timeoutMs > 0
      ? setTimeout(() => controller.abort(new ApiTimeoutError()), timeoutMs)
      : undefined;

  const onExternalAbort = () => controller.abort(external?.reason);

  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cancel: () => {
      if (timer) clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
}

/** fetch com header de autenticação, timeout, retry e erros padronizados. */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ApiFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = 500,
  } = options;

  const headers = new Headers(init.headers || {});
  const token = readSessionToken();
  if (token) headers.set('x-otto-token', token);

  const maxAttempts = Math.max(1, (canRetry(init) ? retries : 0) + 1);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { signal, cancel } = buildSignal(timeoutMs, init.signal);

    try {
      const res = await fetch(input, { ...init, headers, signal });

      if (res.status === 401) {
        throw new ApiAuthError(
          'Sessão do OTTO não autorizada. Recarregue a página; se persistir, cole o token de otto_workspace/.otto_token nas configurações.',
          401
        );
      }
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 0);
        const wait = retryAfter > 0 ? ` Aguarde ${retryAfter}s.` : ' Aguarde alguns segundos.';
        throw new ApiAuthError(`Muitas requisições em pouco tempo.${wait}`, 429);
      }
      if (RETRYABLE_STATUS.has(res.status) && attempt < maxAttempts - 1) {
        lastError = new Error(`Serviço indisponível (${res.status}).`);
        await delay(retryDelayMs * 2 ** attempt);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;

      if (error instanceof ApiAuthError) throw error;
      if (init.signal?.aborted) throw new ApiTimeoutError('Requisição cancelada.');

      if (isAbortError(error)) {
        throw new ApiTimeoutError();
      }

      const transient = error instanceof TypeError; // falha de rede no fetch
      if (!transient || attempt >= maxAttempts - 1) throw error;
      await delay(retryDelayMs * 2 ** attempt);
    } finally {
      cancel();
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha de rede ao falar com o OTTO.');
}

/** Traduz qualquer erro de API em uma frase que o usuário entende. */
export function describeApiError(error: unknown): string {
  if (!error) return 'Algo deu errado. Tente novamente.';

  if (error instanceof ApiAuthError) return error.message;

  if (error instanceof ApiTimeoutError) {
    return 'A resposta do OTTO demorou demais. Verifique a conexão e tente novamente.';
  }

  const message = (error as Error)?.message || String(error);

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'Sem conexão com o servidor do OTTO. Verifique sua internet ou se o app está rodando.';
  }
  if (/\b50[234]\b/.test(message)) {
    return 'O provedor de IA está instável agora. Tentando de novo em instantes…';
  }
  if (/quota|rate limit|429/i.test(message)) {
    return 'Limite de uso do provedor atingido. Aguarde um pouco ou troque de chave nas configurações.';
  }
  if (/api key|chave|unauthorized|401/i.test(message)) {
    return 'Chave de API ausente ou inválida. Abra Configurações e confira a chave do provedor.';
  }

  return message || 'Algo deu errado. Tente novamente.';
}
