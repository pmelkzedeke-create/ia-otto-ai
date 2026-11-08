import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware de Autenticação Central do OTTO.
 * Exige que toda rota /api/ contenha o cabeçalho 'x-otto-token' com valor
 * correspondente à variável de ambiente OTTO_ACCESS_TOKEN.
 * Rotas estáticas do frontend permanecem acessíveis publicamente.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Rotas estáticas e recursos do frontend não requerem autenticação
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const expectedToken = process.env.OTTO_ACCESS_TOKEN;

  // Se OTTO_ACCESS_TOKEN estiver configurado no ambiente, exige x-otto-token válido
  if (expectedToken) {
    const providedToken = req.headers['x-otto-token'];
    if (!providedToken || providedToken !== expectedToken) {
      return res.status(401).json({
        error: 'Não autorizado: Token de acesso ausente ou inválido no cabeçalho x-otto-token.',
      });
    }
  }

  next();
}
