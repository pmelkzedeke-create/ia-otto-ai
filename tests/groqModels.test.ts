import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GroqService, type GroqChatOptions } from '../server/groqService.js';

const originalEnv = {
  AI_MODEL: process.env.AI_MODEL,
  AI_MODEL_FAST: process.env.AI_MODEL_FAST,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('Groq: escolha de modelo (GPT-OSS 120b / 20b)', () => {
  beforeEach(() => {
    delete process.env.AI_MODEL;
    delete process.env.AI_MODEL_FAST;
  });
  afterEach(restoreEnv);

  test('apelidos do usuário viram ids da Groq', () => {
    assert.equal(GroqService.resolveModel('120b'), 'openai/gpt-oss-120b');
    assert.equal(GroqService.resolveModel('20b'), 'openai/gpt-oss-20b');
    assert.equal(GroqService.resolveModel('GPT-OSS 120B'), 'openai/gpt-oss-120b');
    assert.equal(GroqService.resolveModel('openai/gpt-oss-20b'), 'openai/gpt-oss-20b');
    assert.equal(GroqService.resolveModel('oss_20b'), 'openai/gpt-oss-20b');
  });

  test('outros modelos da Groq passam intactos', () => {
    assert.equal(GroqService.resolveModel('qwen/qwen3-32b'), 'qwen/qwen3-32b');
    assert.equal(GroqService.resolveModel('moonshotai/kimi-k2-instruct'), 'moonshotai/kimi-k2-instruct');
  });

  test('chave colada no lugar do modelo não vira modelo', () => {
    assert.equal(GroqService.resolveModel('gsk_exemploDeChaveColadaPorEngano123'), 'openai/gpt-oss-120b');
    assert.equal(GroqService.resolveModel(''), 'openai/gpt-oss-120b');
  });

  test('AI_MODEL define o padrão; sem ele é o 120b', () => {
    assert.equal(GroqService.DEFAULT_MODEL, 'openai/gpt-oss-120b');
    process.env.AI_MODEL = '20b';
    assert.equal(GroqService.DEFAULT_MODEL, 'openai/gpt-oss-20b');
  });

  test('tier decide entre raciocínio e velocidade', () => {
    assert.equal(GroqService.modelForTier('deep'), 'openai/gpt-oss-120b');
    assert.equal(GroqService.modelForTier('fast'), 'openai/gpt-oss-20b');
    assert.equal(GroqService.modelForTier(), 'openai/gpt-oss-120b');

    process.env.AI_MODEL_FAST = '120b';
    assert.equal(GroqService.FAST_MODEL, 'openai/gpt-oss-120b');
  });
});

describe('Groq: corpo da requisição', () => {
  const baseMessages: GroqChatOptions['messages'] = [
    { role: 'system', content: 'Você é o OTTO.' },
    { role: 'user', content: 'oi' },
  ];

  test('usa max_completion_tokens, nunca max_tokens', () => {
    const payload = GroqService.buildPayload({ messages: baseMessages, maxTokens: 512 }, 'openai/gpt-oss-120b');
    assert.equal(payload.max_completion_tokens, 512);
    assert.equal(payload.max_tokens, undefined);
  });

  test('repassa reasoning_effort e modo JSON', () => {
    const payload = GroqService.buildPayload(
      { messages: baseMessages, reasoningEffort: 'low', responseFormat: 'json' },
      'openai/gpt-oss-120b'
    );
    assert.equal(payload.reasoning_effort, 'low');
    assert.deepEqual(payload.response_format, { type: 'json_object' });
  });

  test('ferramentas vão sem chamadas paralelas (GPT-OSS não suporta)', () => {
    const payload = GroqService.buildPayload(
      {
        messages: baseMessages,
        tools: [
          {
            type: 'function',
            function: { name: 'search_web', description: 'busca', parameters: { type: 'object', properties: {} } },
          },
        ],
      },
      'openai/gpt-oss-120b'
    );
    assert.equal(payload.tools.length, 1);
    assert.equal(payload.tool_choice, 'auto');
    assert.equal(payload.parallel_tool_calls, false);
  });

  test('o payload carrega o modelo escolhido e o contexto enxuto', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: 'user' as const, content: `msg ${i}` }));
    const payload = GroqService.buildPayload({ messages: [{ role: 'system', content: 'sys' }, ...many] }, 'openai/gpt-oss-20b');
    assert.equal(payload.model, 'openai/gpt-oss-20b');
    assert.equal(payload.messages[0].role, 'system');
    assert.ok(payload.messages.length <= 13, 'histórico precisa ser aparado');
  });
});
