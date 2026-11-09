/**
 * Módulo de Segurança do OTTO — validação de comandos de terminal.
 *
 * Política: o terminal do agente é SOMENTE LEITURA + criação de diretório.
 * Execução de código (node, python, npm, bun...) NÃO passa por aqui — ela é
 * feita exclusivamente pelo CodeSandbox isolado (`/api/sandbox/execute`), que
 * roda em diretório temporário com ambiente limpo, timeout e cap de output.
 *
 * Também bloqueia:
 * - encadeamento/injeção de shell: ; & | ` $ ( ) { } > < nova linha
 * - glob e expansão: * ? [ ] ! ~
 * - caminhos absolutos e travessia com ".." (leitura de qualquer arquivo do host)
 */

export const ALLOWED_BASE_COMMANDS = ['ls', 'cat', 'pwd', 'echo', 'mkdir'] as const;

const SHELL_METACHARACTERS = /[;&|`$\n\r><(){}[\]*?!~\\]/;

export interface CommandValidation {
  allowed: boolean;
  reason?: string;
}

/** Valida um argumento de caminho: precisa ser relativo e ficar no diretório atual. */
function isSafePathArgument(arg: string): boolean {
  if (arg.startsWith('-')) return true; // flags (ex.: ls -la) não são caminhos
  if (arg.startsWith('/')) return false; // caminho absoluto
  if (arg.startsWith('~')) return false; // home do usuário
  if (arg.split('/').includes('..')) return false; // travessia
  if (arg.includes(':')) return false; // ex.: file:// ou scp-like
  return true;
}

export function validateCommand(command: string): CommandValidation {
  if (!command || typeof command !== 'string') {
    return { allowed: false, reason: 'Comando vazio.' };
  }

  const trimmed = command.trim();
  if (!trimmed) return { allowed: false, reason: 'Comando vazio.' };
  if (trimmed.length > 512) return { allowed: false, reason: 'Comando muito longo.' };

  if (SHELL_METACHARACTERS.test(trimmed)) {
    return {
      allowed: false,
      reason: 'Caracteres de encadeamento/expansão de shell não são permitidos.',
    };
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const baseCmd = tokens[0];

  const isGitReadOnly =
    baseCmd === 'git' && (tokens[1] === 'status' || tokens[1] === 'log' || tokens[1] === 'diff');

  if (!(ALLOWED_BASE_COMMANDS as readonly string[]).includes(baseCmd) && !isGitReadOnly) {
    return {
      allowed: false,
      reason: `Comando "${baseCmd}" fora da lista permitida: ${ALLOWED_BASE_COMMANDS.join(', ')}, git status/log/diff.`,
    };
  }

  // Nenhum argumento pode apontar para fora do diretório de execução.
  const pathArgs = isGitReadOnly ? tokens.slice(2) : tokens.slice(1);
  for (const arg of pathArgs) {
    if (!isSafePathArgument(arg)) {
      return {
        allowed: false,
        reason: `Argumento "${arg}" aponta para fora do diretório de trabalho (caminho absoluto ou "..").`,
      };
    }
  }

  return { allowed: true };
}

/** Compatibilidade com chamadas existentes. */
export function isCommandAllowed(command: string): boolean {
  return validateCommand(command).allowed;
}

export const ALLOWED_COMMANDS_HINT = `${ALLOWED_BASE_COMMANDS.join(', ')}, git status/log/diff`;
