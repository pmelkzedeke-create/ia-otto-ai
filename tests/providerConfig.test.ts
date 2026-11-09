import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  ProviderError,
  clearProviderConfig,
  fetchProviderModels,
  getProviderConfig,
  normalizeBaseUrl,
  publicProviderStatus,
  saveProviderConfig,
} from '../server/providerConfig.js';
import { WORKSPACE_DIR } from '../server/memoryStore.js';

const VALID_KEY = 'chave-de-teste-123';
let server: http.Server;
let baseUrl = '';

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/v1/models') {
      if (req.headers.authorization !== `Bearer ${VALID_KEY}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'invalid api key' } }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          object: 'list',
          data: [
            { id: 'openai/gpt-oss-120b', owned_by: 'openai', context_window: 131072 },
            { id: 'openai/gpt-oss-20b', owned_by: 'openai' },
            { id: 'whisper-large-v3', owned_by: 'openai' },
            { id: 'text-embedding-3-small', owned_by: 'openai' },
          ],
        })
      );
      return;
    }

    if (req.url === '/ollama/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [{ name: 'qwen3:8b' }] }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address && typeof address === 'object') baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  clearProviderConfig();
});

describe('Provedor de IA: URL', () => {
  test('remove barra final e caminho de chat colado por engano', () => {
    assert.equal(normalizeBaseUrl('https://api.groq.com/openai/v1/'), 'https://api.groq.com/openai/v1');
    assert.equal(
      normalizeBaseUrl('https://api.groq.com/openai/v1/chat/completions'),
      'https://api.groq.com/openai/v1'
    );
  });

  test('recusa URL vazia, sem protocolo ou de outro esquema', () => {
    assert.throws(() => normalizeBaseUrl(''), ProviderError);
    assert.throws(() => normalizeBaseUrl('api.groq.com/v1'), ProviderError);
    assert.throws(() => normalizeBaseUrl('ftp://servidor/v1'), ProviderError);
  });
});

describe('Provedor de IA: teste de conexão', () => {
  test('lista modelos e classifica por tipo', async () => {
    const result = await fetchProviderModels({ baseUrl: `${baseUrl}/v1`, apiKey: VALID_KEY });

    assert.equal(result.models.length, 4);
    const kinds = Object.fromEntries(result.models.map((model) => [model.id, model.kind]));
    assert.equal(kinds['openai/gpt-oss-120b'], 'chat');
    assert.equal(kinds['whisper-large-v3'], 'audio');
    assert.equal(kinds['text-embedding-3-small'], 'embedding');

    // conversa vem primeiro na ordenação
    assert.equal(result.models[0].kind, 'chat');
    assert.equal(result.models[0].contextLength, 131072);
  });

  test('chave errada vira BAD_KEY, não erro genérico', async () => {
    await assert.rejects(
      () => fetchProviderModels({ baseUrl: `${baseUrl}/v1`, apiKey: 'errada' }),
      (error: unknown) => error instanceof ProviderError && error.code === 'BAD_KEY'
    );
  });

  test('endpoint inexistente não finge sucesso', async () => {
    await assert.rejects(
      () => fetchProviderModels({ baseUrl: `${baseUrl}/inexistente`, apiKey: VALID_KEY }),
      (error: unknown) => error instanceof ProviderError
    );
  });

  test('provedor fora do ar vira NETWORK com mensagem clara', async () => {
    await assert.rejects(
      () => fetchProviderModels({ baseUrl: 'http://127.0.0.1:1/v1', apiKey: VALID_KEY, timeoutMs: 2000 }),
      (error: unknown) => error instanceof ProviderError && error.code === 'NETWORK'
    );
  });

  test('aceita formato do Ollama ({ models: [...] })', async () => {
    const result = await fetchProviderModels({ baseUrl: `${baseUrl}/ollama`, apiKey: '' });
    assert.equal(result.models[0].id, 'qwen3:8b');
  });
});

describe('Provedor de IA: persistência', () => {
  test('salvar aplica no processo e grava com permissão 0600', () => {
    const config = saveProviderConfig({
      baseUrl: `${baseUrl}/v1`,
      apiKey: VALID_KEY,
      model: 'openai/gpt-oss-20b',
    });

    const file = path.join(WORKSPACE_DIR, '.otto_provider.json');
    assert.ok(fs.existsSync(file));
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);

    assert.equal(process.env.AI_MODEL, 'openai/gpt-oss-20b');
    assert.equal(process.env.GROQ_BASE_URL, `${baseUrl}/v1`);
    assert.equal(getProviderConfig()?.apiKey, VALID_KEY);
    assert.equal(config.model, 'openai/gpt-oss-20b');
  });

  test('status público nunca devolve a chave inteira', () => {
    const status = publicProviderStatus();
    assert.equal(status.hasKey, true);
    assert.equal(status.keyPreview, 'chave-…-123');
    assert.equal(JSON.stringify(status).includes(VALID_KEY), false);
  });

  test('chave vazia mantém a anterior (trocar só o modelo)', () => {
    const config = saveProviderConfig({ baseUrl: `${baseUrl}/v1`, apiKey: '', model: 'openai/gpt-oss-120b' });
    assert.equal(config.apiKey, VALID_KEY);
  });

  test('modelo vazio é recusado', () => {
    assert.throws(
      () => saveProviderConfig({ baseUrl: `${baseUrl}/v1`, apiKey: VALID_KEY, model: '' }),
      (error: unknown) => error instanceof ProviderError && error.code === 'NO_MODEL'
    );
  });
});
