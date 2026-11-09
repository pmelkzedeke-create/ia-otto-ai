/**
 * Resolução segura de caminhos dentro do workspace.
 *
 * `startsWith(base)` é insuficiente: `/data/ws_evil` também "começa com" `/data/ws`.
 * Aqui usamos path.relative + checagem de escape real, bloqueando também NUL bytes.
 */
import path from 'path';

export class PathEscapeError extends Error {
  constructor(target: string) {
    super(`Acesso negado: caminho fora do workspace (${target})`);
    this.name = 'PathEscapeError';
  }
}

export function isInside(baseDir: string, targetPath: string): boolean {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (target.includes('\0')) return false;
  if (base === target) return true;
  const rel = path.relative(base, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

export function resolveInside(baseDir: string, ...segments: string[]): string {
  const base = path.resolve(baseDir);
  const cleaned = segments.filter((s) => typeof s === 'string' && s.trim() !== '');
  const target = path.resolve(base, ...cleaned);
  if (!isInside(base, target)) throw new PathEscapeError(target);
  return target;
}
