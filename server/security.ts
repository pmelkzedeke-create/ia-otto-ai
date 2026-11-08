/**
 * Módulo de Segurança do OTTO:
 * - Validação estrita por Lista Branca (Whitelist) de comandos de terminal
 * - Bloqueio de injeções shell, encadeamento (; && || | &), interpolação (` $()) e redirecionamentos (> <)
 */

export const ALLOWED_BASE_COMMANDS = [
  'ls',
  'cat',
  'pwd',
  'echo',
  'mkdir',
  'node',
  'python3',
  'npm',
  'bun',
] as const;

/**
 * Valida se um comando de terminal pertence à lista branca segura.
 * Comandos permitidos: ls, cat, pwd, echo, mkdir, node, python3, git status, git log, npm, bun.
 */
export function isCommandAllowed(command: string): boolean {
  if (!command || typeof command !== 'string') return false;
  const trimmed = command.trim();
  if (!trimmed) return false;

  // Bloqueia qualquer caractere ou padrão de encadeamento, injeção de comandos, subshells e pipes
  if (/[\;&|`$\n\r><]/.test(trimmed)) {
    return false;
  }

  // Decompõe comando em argumentos básicos
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  const baseCmd = tokens[0];

  // Comandos diretos permitidos na lista branca
  if ((ALLOWED_BASE_COMMANDS as readonly string[]).includes(baseCmd)) {
    return true;
  }

  // Git permitido estritamente para "git status" e "git log"
  if (baseCmd === 'git') {
    const subCmd = tokens[1];
    if (subCmd === 'status' || subCmd === 'log') {
      return true;
    }
    return false;
  }

  return false;
}
