/**
 * Sessão / Token de acesso do OTTO.
 *
 * Regras:
 * - Se OTTO_ACCESS_TOKEN estiver definido no ambiente, ele é o token oficial.
 * - Caso contrário, um token aleatório é gerado no primeiro boot e persistido
 *   em `otto_workspace/.otto_token` (permissão 0600), de modo que o servidor
 *   NUNCA fica sem autenticação.
 * - O token é entregue ao frontend pela tag <meta name="otto-token"> injetada
 *   no HTML (protegido pela same-origin policy) e exigido no header
 *   `x-otto-token` em todas as rotas /api.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TOKEN_FILE_NAME = '.otto_token';
let cachedToken: string | null = null;

export function initSessionToken(workspaceDir: string): string {
  const explicit = (process.env.OTTO_ACCESS_TOKEN || '').trim();
  if (explicit) {
    cachedToken = explicit;
    process.env.OTTO_SESSION_TOKEN = explicit;
    return explicit;
  }

  if (cachedToken) return cachedToken;

  const tokenFile = path.join(workspaceDir, TOKEN_FILE_NAME);
  try {
    if (fs.existsSync(tokenFile)) {
      const fromDisk = fs.readFileSync(tokenFile, 'utf-8').trim();
      if (fromDisk.length >= 16) {
        cachedToken = fromDisk;
        process.env.OTTO_SESSION_TOKEN = fromDisk;
        return fromDisk;
      }
    }
  } catch {
    // segue para geração
  }

  const generated = crypto.randomBytes(24).toString('hex');
  try {
    if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(tokenFile, generated, { encoding: 'utf-8', mode: 0o600 });
  } catch (err) {
    console.warn('[OTTO] Não foi possível persistir o token de sessão:', err);
  }

  cachedToken = generated;
  process.env.OTTO_SESSION_TOKEN = generated;
  return generated;
}

export function getSessionToken(): string {
  return cachedToken || process.env.OTTO_SESSION_TOKEN || '';
}

export function isUsingExplicitToken(): boolean {
  return Boolean((process.env.OTTO_ACCESS_TOKEN || '').trim());
}
