/**
 * Cliente HTTP único das chamadas de API do OTTO.
 *
 * Todas as rotas /api do servidor exigem o header `x-otto-token`.
 * O token chega pela meta tag <meta name="otto-token"> injetada no HTML
 * (dev: plugin do Vite; produção: Express) e pode ser sobrescrito em runtime
 * com setAccessToken — útil quando a página é servida por outro host.
 */

const SESSION_TOKEN_STORAGE_KEY = 'otto_session_token';

export class ApiAuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiAuthError';
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

/** fetch com header de autenticação e erros de rede padronizados. */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = readSessionToken();
  if (token) headers.set('x-otto-token', token);

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    throw new ApiAuthError(
      'Sessão do OTTO não autorizada. Recarregue a página; se persistir, cole o token de otto_workspace/.otto_token nas configurações.',
      401
    );
  }
  if (res.status === 429) {
    throw new ApiAuthError('Muitas requisições em pouco tempo. Aguarde alguns segundos.', 429);
  }
  return res;
}
