import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { isInside, resolveInside, PathEscapeError } from '../server/paths.js';

const BASE = path.resolve('/tmp/otto_ws_base');

describe('paths: contenção no workspace', () => {
  test('aceita caminho dentro do workspace', () => {
    assert.equal(isInside(BASE, path.join(BASE, 'a/b.txt')), true);
    assert.equal(resolveInside(BASE, 'sub', 'arquivo.txt'), path.join(BASE, 'sub/arquivo.txt'));
  });

  test('aceita o próprio diretório base', () => {
    assert.equal(isInside(BASE, BASE), true);
  });

  test('rejeita travessia com ..', () => {
    assert.equal(isInside(BASE, path.join(BASE, '../fora.txt')), false);
    assert.throws(() => resolveInside(BASE, '../fora.txt'), PathEscapeError);
    assert.throws(() => resolveInside(BASE, 'a/../../fora.txt'), PathEscapeError);
  });

  test('rejeita diretório irmão com prefixo parecido', () => {
    // o bug clássico do startsWith()
    assert.equal(isInside(BASE, `${BASE}_backup/segredo.txt`), false);
    assert.throws(() => resolveInside(BASE, '../otto_ws_base_backup/x'), PathEscapeError);
  });

  test('rejeita caminho absoluto injetado', () => {
    assert.throws(() => resolveInside(BASE, '/etc/passwd'), PathEscapeError);
  });

  test('rejeita NUL byte', () => {
    assert.equal(isInside(BASE, `${BASE}/a\0b`), false);
  });
});
