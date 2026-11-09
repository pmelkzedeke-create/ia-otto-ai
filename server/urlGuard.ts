/**
 * Guarda de saída (anti-SSRF) para qualquer URL que venha do cliente.
 *
 * O OTTO expõe rotas que buscam URLs arbitrárias (proxy de imagem, leitura de
 * artigo). Sem esta guarda, qualquer pessoa com o token poderia usar o servidor
 * como ponte para a rede interna, para o próprio loopback ou para o endpoint de
 * metadados da nuvem (169.254.169.254).
 *
 * Política:
 * - apenas http/https;
 * - hostname não pode ser localhost, .local, .internal ou nome de metadados;
 * - IP explícito não pode ser privado, loopback, link-local, CGNAT ou multicast;
 * - hostname é resolvido por DNS e **todos** os IPs retornados são validados;
 * - redirecionamentos são seguidos manualmente, um a um, revalidando cada salto;
 * - timeout e tamanho máximo de corpo obrigatórios no download.
 */

import dns from 'node:dns/promises';
import net from 'node:net';

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

export class PayloadTooLargeError extends Error {
  constructor(limit: number) {
    super(`Conteúdo excede o limite de ${Math.round(limit / 1024)} KB.`);
    this.name = 'PayloadTooLargeError';
  }
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'metadata',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
]);

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa', '.lan'];

/** true quando o IP (v4 ou v6) está em faixa que não deve ser alcançável de fora. */
export function isPrivateIp(raw: string): boolean {
  const ip = raw.trim().replace(/^\[|\]$/g, '').toLowerCase();
  if (!ip) return true;

  const version = net.isIP(ip);

  if (version === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local + metadados de nuvem
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 192 && b === 0) return true; // 192.0.0/24 e 192.0.2/24
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast + reservado
    return false;
  }

  if (version === 6) {
    if (ip === '::' || ip === '::1') return true;
    if (ip.startsWith('::ffff:')) {
      // IPv4 mapeado em IPv6 — valida o IPv4 embutido.
      return isPrivateIp(ip.slice('::ffff:'.length));
    }
    if (/^f[cd][0-9a-f]{2}:/.test(ip)) return true; // fc00::/7 (ULA)
    if (/^fe[89ab][0-9a-f]:/.test(ip)) return true; // fe80::/10 (link-local)
    if (ip.startsWith('ff')) return true; // multicast
    return false;
  }

  // Não é IP: quem chama deve ter resolvido antes.
  return false;
}

/** Validação síncrona de sintaxe e hostname (não resolve DNS). */
export function assertUrlSyntax(raw: string): URL {
  let url: URL;
  try {
    url = new URL(String(raw));
  } catch {
    throw new UnsafeUrlError('URL inválida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Apenas URLs http e https são permitidas.');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs com credenciais embutidas não são permitidas.');
  }

  const host = url.hostname.toLowerCase();

  if (!host) throw new UnsafeUrlError('URL sem host.');
  if (BLOCKED_HOSTNAMES.has(host)) throw new UnsafeUrlError('Host não permitido.');
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new UnsafeUrlError('Host não permitido.');
  }
  // URL de IPv6 mantém os colchetes no hostname.
  const bareHost = host.replace(/^\[|\]$/g, '');
  if (net.isIP(bareHost) && isPrivateIp(bareHost)) {
    throw new UnsafeUrlError('Endereço de rede interna não é permitido.');
  }

  return url;
}

/** Validação completa: sintaxe + resolução DNS (todos os IPs precisam ser públicos). */
export async function assertSafeRemoteUrl(raw: string): Promise<URL> {
  const url = assertUrlSyntax(raw);
  const host = url.hostname;
  const bareHost = host.replace(/^\[|\]$/g, '');

  if (net.isIP(bareHost)) return url; // já validado na etapa síncrona

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(bareHost, { all: true });
  } catch {
    throw new UnsafeUrlError(`Não foi possível resolver o host "${host}".`);
  }

  if (!addresses.length) throw new UnsafeUrlError(`Host "${host}" não resolve.`);
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new UnsafeUrlError('O host resolve para um endereço de rede interna.');
    }
  }
  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  maxRedirects?: number;
  acceptContentTypes?: string[];
}

/** fetch com validação de destino em cada salto, timeout e verificação de tipo. */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const {
    timeoutMs = 8000,
    maxRedirects = 3,
    headers = {},
    acceptContentTypes = [],
  } = options;

  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const url = await assertSafeRemoteUrl(current);

    const response = await fetch(url, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get('location');

    if (isRedirect && location) {
      if (hop === maxRedirects) {
        throw new UnsafeUrlError('Redirecionamentos demais.');
      }
      current = new URL(location, url).toString();
      continue;
    }

    if (acceptContentTypes.length) {
      const type = (response.headers.get('content-type') || '').toLowerCase();
      if (!acceptContentTypes.some((allowed) => type.startsWith(allowed))) {
        throw new UnsafeUrlError(`Tipo de conteúdo não permitido: ${type || 'desconhecido'}.`);
      }
    }

    return response;
  }

  throw new UnsafeUrlError('Não foi possível concluir a requisição.');
}

/** Lê o corpo respeitando um teto de bytes (evita encher a memória do processo). */
export async function readBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared && declared > maxBytes) throw new PayloadTooLargeError(maxBytes);

  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new PayloadTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}
