import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_HISTORY_KEY,
  CHAT_HISTORY_VERSION,
  loadHistory,
  parseHistory,
  saveHistory,
  clearHistory,
  serializeHistory,
  slimMessage,
  type StorageLike,
} from '../src/services/chatHistoryStore.js';
import type { ChatMessage } from '../src/types/otto.js';

function memoryStorage(): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map),
  };
}

const msg = (id: string, text = 'oi', sender: 'user' | 'otto' = 'user'): ChatMessage => ({
  id,
  sender,
  text,
  timestamp: '10:00',
});

describe('chatHistoryStore: persistência', () => {
  test('salva e recupera a conversa', () => {
    const storage = memoryStorage();
    const messages = [msg('a', 'primeira'), msg('b', 'resposta', 'otto')];
    assert.equal(saveHistory(messages, storage), true);
    const restored = loadHistory(storage);
    assert.deepEqual(restored.map((m) => m.id), ['a', 'b']);
    assert.equal(restored[1].text, 'resposta');
  });

  test('sobrevive a histórico vazio removendo a chave', () => {
    const storage = memoryStorage();
    saveHistory([msg('a')], storage);
    saveHistory([], storage);
    assert.equal(storage.getItem(CHAT_HISTORY_KEY), null);
  });

  test('clearHistory apaga tudo', () => {
    const storage = memoryStorage();
    saveHistory([msg('a')], storage);
    clearHistory(storage);
    assert.deepEqual(loadHistory(storage), []);
  });

  test('não quebra com JSON inválido, versão antiga ou lixo', () => {
    assert.deepEqual(parseHistory('{oops'), []);
    assert.deepEqual(parseHistory(null), []);
    assert.deepEqual(parseHistory(JSON.stringify({ version: 0, messages: [msg('a')] })), []);
    assert.deepEqual(parseHistory(JSON.stringify({ version: CHAT_HISTORY_VERSION, messages: 'x' })), []);
  });

  test('storage que lança não derruba a aplicação', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('boom');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('boom');
      },
    };
    assert.deepEqual(loadHistory(broken), []);
    assert.equal(saveHistory([msg('a')], broken), false);
    assert.doesNotThrow(() => clearHistory(broken));
  });
});

describe('chatHistoryStore: limites', () => {
  test('guarda apenas as últimas N mensagens', () => {
    const storage = memoryStorage();
    const many = Array.from({ length: 120 }, (_, i) => msg(`m${i}`));
    saveHistory(many, storage);
    const restored = loadHistory(storage);
    assert.equal(restored.length, 80);
    assert.equal(restored[restored.length - 1].id, 'm119');
  });

  test('respeita o teto de bytes cortando o começo', () => {
    const many = Array.from({ length: 40 }, (_, i) => msg(`m${i}`, 'x'.repeat(4000)));
    const payload = serializeHistory(many, { maxBytes: 30_000 });
    assert.ok(payload);
    assert.ok(payload!.length <= 30_000);
    const restored = parseHistory(payload);
    assert.ok(restored.length > 0 && restored.length < 40);
    assert.equal(restored[restored.length - 1].id, 'm39');
  });

  test('descarta anexos grandes em base64 mas mantém o texto', () => {
    const big: ChatMessage = {
      ...msg('img', 'veja a imagem'),
      attachedImage: { dataUrl: 'data:image/png;base64,' + 'A'.repeat(50_000), name: 'foto.png' },
      images: [{ url: 'data:image/png;base64,' + 'B'.repeat(50_000), title: 'x' } as any],
    };
    const slim = slimMessage(big)!;
    assert.equal(slim.text, 'veja a imagem');
    assert.equal(slim.attachedImage?.dataUrl, '');
    assert.equal(slim.attachedImage?.name, 'foto.png');
    assert.equal(slim.images?.[0].url, '');
  });

  test('rejeita mensagens sem formato mínimo', () => {
    assert.equal(slimMessage(null as any), null);
    assert.equal(slimMessage({ id: 'x' } as any), null);
    assert.equal(slimMessage({ ...msg('x'), sender: 'system' } as any), null);
  });
});
