import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommand, isCommandAllowed } from '../server/security.js';

describe('security: whitelist do terminal', () => {
  test('permite comandos de leitura simples', () => {
    for (const cmd of ['ls', 'ls -la', 'pwd', 'cat notas.txt', 'echo ola', 'mkdir nova-pasta', 'git status', 'git log']) {
      assert.equal(isCommandAllowed(cmd), true, `deveria permitir: ${cmd}`);
    }
  });

  test('bloqueia execução de código arbitrário', () => {
    for (const cmd of ['node script.js', 'python3 x.py', 'npm install', 'bun run dev', 'bash -c x']) {
      assert.equal(isCommandAllowed(cmd), false, `deveria bloquear: ${cmd}`);
    }
  });

  test('bloqueia encadeamento e injeção de shell', () => {
    for (const cmd of ['ls; id', 'ls && id', 'ls | cat', 'echo $(whoami)', 'echo `id`', 'ls > out.txt', 'ls\nid']) {
      assert.equal(isCommandAllowed(cmd), false, `deveria bloquear: ${cmd}`);
    }
  });

  test('bloqueia leitura fora do diretório de trabalho', () => {
    for (const cmd of ['cat /etc/passwd', 'cat ~/.ssh/id_rsa', 'cat ../../etc/passwd', 'ls /home']) {
      assert.equal(isCommandAllowed(cmd), false, `deveria bloquear: ${cmd}`);
    }
  });

  test('bloqueia glob e expansão', () => {
    for (const cmd of ['cat *', 'ls ?', 'echo {a,b}']) {
      assert.equal(isCommandAllowed(cmd), false, `deveria bloquear: ${cmd}`);
    }
  });

  test('rejeita entrada vazia ou não-string', () => {
    assert.equal(isCommandAllowed(''), false);
    // @ts-expect-error entrada inválida proposital
    assert.equal(isCommandAllowed(null), false);
    assert.equal(validateCommand('   ').allowed, false);
  });
});
