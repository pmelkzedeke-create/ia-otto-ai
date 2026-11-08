import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Endurecimento HTTP básico do OTTO (sem dependências externas).
 * - headers de segurança
 * - rate limit em memória por IP para /api
 * - middleware de erro global com resposta JSON padronizada
 */

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // A página carrega o token de sessão na meta tag: não pode ser cacheada por terceiros.
  if (!req.path.startsWith('/api') && !req.path.startsWith('/src') && !req.path.startsWith('/@')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = Number(process.env.OTTO_RATE_LIMIT_PER_MIN || 600);

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export const apiRateLimit: RequestHandler = (req, res, next) => {
  if (!req.path.startsWith('/api') || MAX_REQUESTS_PER_WINDOW <= 0) return next();

  const now = Date.now();
  const key = clientKey(req);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({
      error: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
    });
  }
  next();
};

// Limpeza periódica para não crescer indefinidamente.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60_000).unref?.();

export function notFoundApiHandler(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api')) return next();
  return res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[OTTO][error] ${req.method} ${req.path}:`, err);
  if (res.headersSent) return;
  res.status(500).json({
    error: 'Erro interno no servidor do OTTO.',
    details: process.env.NODE_ENV === 'production' ? undefined : message,
  });
}
