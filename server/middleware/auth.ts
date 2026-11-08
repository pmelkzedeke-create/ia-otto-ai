import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getSessionToken } from '../session.js';

/**
 * Autenticação central do OTTO.
 *
 * - Todas as rotas /api exigem o header `x-otto-token` (ou `Authorization: Bearer <token>`).
 * - Única exceção: /api/health (read-only, sem dados sensíveis).
 * - O token nunca fica vazio: vem de OTTO_ACCESS_TOKEN ou é gerado/persistido no boot
 *   (ver server/session.ts). O frontend recebe o token por <meta name="otto-token">.
 */
const PUBLIC_API_PATHS = new Set(['/api/health']);

function extractToken(req: Request): string {
  const headerToken = req.headers['x-otto-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) return headerToken.trim();

  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api')) return next();
  if (PUBLIC_API_PATHS.has(req.path)) return next();

  // Preflight CORS nunca é autenticado.
  if (req.method === 'OPTIONS') return next();

  const expected = getSessionToken();
  if (!expected) {
    return res.status(503).json({
      error: 'Servidor sem token de sessão inicializado. Reinicie o OTTO.',
    });
  }

  const provided = extractToken(req);
  if (!provided || provided.length !== expected.length) {
    return res.status(401).json({
      error:
        'Não autorizado. Envie o header x-otto-token com o token de sessão do OTTO ' +
        '(disponível em otto_workspace/.otto_token ou na meta tag otto-token da página).',
    });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Não autorizado: token inválido.' });
  }

  return next();
}
