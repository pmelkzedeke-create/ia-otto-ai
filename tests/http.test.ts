import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiFetch,
  describeApiError,
  ApiAuthError,
  ApiTimeoutError,
} from '../src/services/http.js';

const originalFetch = globalThis.fetch;

function restore() {
  globalThis.fetch = originalFetch;
}

describe('http: timeout e retry', () => {
  beforeEach(() => {
    restore();
  });
  afterEach(() => {
    restore();
  });

  test('estoura o tempo limite em vez de esperar para sempre', async () => {
    globalThis.fetch = ((_input: any, init: any) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })) as typeof fetch;

    await assert.rejects(
      () => apiFetch('http://otto.local/api/teste', {}, { timeoutMs: 30, retries: 0 }),
      ApiTimeoutError
    );
  });

  test('repete uma vez em 503 e devolve a resposta seguinte', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) return new Response('indisponível', { status: 503 });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const res = await apiFetch('http://otto.local/api/teste', {}, { retries: 1, retryDelayMs: 1 });
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });

  test('não repete em 401 e explica a sessão', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response('no', { status: 401 });
    }) as typeof fetch;

    await assert.rejects(
      () => apiFetch('http://otto.local/api/teste', {}, { retries: 3, retryDelayMs: 1 }),
      (err: unknown) => err instanceof ApiAuthError && err.status === 401
    );
    assert.equal(calls, 1);
  });

  test('propaga o Retry-After na mensagem de 429', async () => {
    globalThis.fetch = (async () =>
      new Response('slow down', { status: 429, headers: { 'retry-after': '7' } })) as typeof fetch;

    await assert.rejects(
      () => apiFetch('http://otto.local/api/teste', {}, { retries: 0 }),
      (err: unknown) => err instanceof ApiAuthError && /7s/.test((err as Error).message)
    );
  });

  test('não repete quando o corpo é um stream', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;

    const body = new ReadableStream();
    await assert.rejects(
      () => apiFetch('http://otto.local/api/teste', { method: 'POST', body: body as any }, { retries: 3, retryDelayMs: 1 }),
      TypeError
    );
    assert.equal(calls, 1);
  });
});

describe('http: mensagens de erro para o usuário', () => {
  test('traduz falha de rede', () => {
    assert.match(describeApiError(new TypeError('Failed to fetch')), /Sem conexão/i);
  });

  test('traduz timeout', () => {
    assert.match(describeApiError(new ApiTimeoutError()), /demorou demais/i);
  });

  test('traduz 503 do provedor', () => {
    assert.match(describeApiError(new Error('Serviço indisponível (503).')), /instável/i);
  });

  test('traduz erro de chave', () => {
    assert.match(describeApiError(new Error('401 invalid api key')), /Chave de API/i);
  });

  test('preserva mensagem desconhecida e tem fallback', () => {
    assert.equal(describeApiError(new Error('erro específico do domínio')), 'erro específico do domínio');
    assert.match(describeApiError(null), /Algo deu errado/i);
  });
});
