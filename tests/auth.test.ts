import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { authMiddleware } from '../server/middleware/auth.js';
import { initSessionToken, getSessionToken } from '../server/session.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function run(headers: Record<string, string>, pathname = '/api/system/info') {
  const req: any = { path: pathname, method: 'GET', headers };
  const res = mockRes();
  let passed = false;
  authMiddleware(req, res, () => {
    passed = true;
  });
  return { passed, res };
}

describe('auth: middleware de token', () => {
  before(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otto-session-'));
    initSessionToken(dir);
  });

  test('libera rotas estáticas', () => {
    const { passed } = run({}, '/');
    assert.equal(passed, true);
  });

  test('/api/health é público', () => {
    const { passed } = run({}, '/api/health');
    assert.equal(passed, true);
  });

  test('bloqueia /api sem token', () => {
    const { passed, res } = run({});
    assert.equal(passed, false);
    assert.equal(res.statusCode, 401);
  });

  test('bloqueia token errado', () => {
    const { passed, res } = run({ 'x-otto-token': 'valor-errado' });
    assert.equal(passed, false);
    assert.equal(res.statusCode, 401);
  });

  test('aceita header x-otto-token correto', () => {
    const { passed } = run({ 'x-otto-token': getSessionToken() });
    assert.equal(passed, true);
  });

  test('aceita Authorization: Bearer', () => {
    const { passed } = run({ authorization: `Bearer ${getSessionToken()}` });
    assert.equal(passed, true);
  });
});
