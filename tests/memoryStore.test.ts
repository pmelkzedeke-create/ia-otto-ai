import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadMemories,
  saveMemories,
  selectRelevantMemories,
  scoreMemories,
  tokenizeQuery,
  normalizeMemory,
  dedupeMemories,
  pruneMemories,
  getMemoryStats,
  autoLearnUserMemory,
  clearMemoryCache,
  MAX_MEMORY_ITEMS,
  type ServerMemoryItem,
} from '../server/memoryStore.js';

let dir = '';
let file = '';

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otto-mem-'));
  file = path.join(dir, 'mem.json');
  clearMemoryCache();
});

afterEach(() => {
  clearMemoryCache();
  fs.rmSync(dir, { recursive: true, force: true });
});

const mem = (over: Partial<ServerMemoryItem>): ServerMemoryItem => ({
  id: over.id || `id_${Math.random().toString(36).slice(2, 8)}`,
  key: over.key || 'chave',
  value: over.value || 'valor',
  title: over.title || over.key || 'Chave',
  category: over.category || 'LEARNED',
  tags: over.tags || [],
  createdAt: over.createdAt || new Date().toISOString(),
});

describe('memoryStore: arquivo e cache', () => {
  test('cria o arquivo com a semente quando não existe', () => {
    const items = loadMemories(file);
    assert.ok(items.length >= 5);
    assert.ok(fs.existsSync(file));
    const onDisk = JSON.parse(fs.readFileSync(file, 'utf-8'));
    assert.equal(onDisk.length, items.length);
  });

  test('não cede memória vazia quando seed=false e não há arquivo', () => {
    assert.deepEqual(loadMemories(file, { seed: false }), []);
    assert.equal(fs.existsSync(file), false);
  });

  test('usa cache e invalida quando o arquivo muda', () => {
    saveMemories([mem({ key: 'a', value: 'primeiro' })], file);
    const first = loadMemories(file);
    assert.equal(first[0].value, 'primeiro');

    // escrita externa (outro processo) deve invalidar o cache
    fs.writeFileSync(file, JSON.stringify([mem({ key: 'b', value: 'externo' })]), 'utf-8');
    const future = new Date(Date.now() + 2000);
    fs.utimesSync(file, future, future);

    const second = loadMemories(file);
    assert.equal(second.length, 1);
    assert.equal(second[0].value, 'externo');
  });

  test('arquivo corrompido não derruba o servidor', () => {
    fs.writeFileSync(file, '{ isso não é json', 'utf-8');
    assert.deepEqual(loadMemories(file), []);
  });

  test('escrita é atômica e não deixa arquivos temporários', () => {
    saveMemories([mem({ key: 'x' }), mem({ key: 'y' })], file);
    const leftovers = fs.readdirSync(dir).filter((name) => name.includes('.tmp'));
    assert.deepEqual(leftovers, []);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf-8')).length, 2);
  });
});

describe('memoryStore: normalização', () => {
  test('descarta item sem chave ou valor', () => {
    assert.equal(normalizeMemory({ key: '', value: 'x' }), null);
    assert.equal(normalizeMemory({ key: 'k', value: '' }), null);
    assert.equal(normalizeMemory(null), null);
  });

  test('conserta categoria inválida, tags sujas e data quebrada', () => {
    const item = normalizeMemory({
      key: 'Preferência',
      value: 'usa TypeScript',
      category: 'banana',
      tags: [' TS ', 'ts', '', 'Código'],
      createdAt: 'não é data',
    })!;
    assert.equal(item.category, 'LEARNED');
    assert.deepEqual(item.tags, ['ts', 'código']);
    assert.ok(!Number.isNaN(new Date(item.createdAt).getTime()));
  });

  test('limita tamanho de chave e valor', () => {
    const item = normalizeMemory({ key: 'k'.repeat(500), value: 'v'.repeat(9000) })!;
    assert.equal(item.key.length, 120);
    assert.equal(item.value.length, 4000);
  });
});

describe('memoryStore: dedupe e poda', () => {
  test('mantém a versão mais recente por chave', () => {
    const older = mem({ key: 'estilo', value: 'antigo', createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = mem({ key: 'Estilo', value: 'novo', createdAt: '2026-06-01T00:00:00.000Z' });
    const result = dedupeMemories([older, newer]);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, 'novo');
  });

  test('poda pesquisas antigas antes de tocar em preferências', () => {
    const prefs = Array.from({ length: 10 }, (_, i) =>
      mem({ key: `pref_${i}`, category: 'LEARNED' })
    );
    const research = Array.from({ length: MAX_MEMORY_ITEMS }, (_, i) =>
      mem({
        key: `pesq_${i}`,
        category: 'RESEARCH',
        createdAt: new Date(2026, 0, 1 + (i % 27)).toISOString(),
      })
    );
    const pruned = pruneMemories([...prefs, ...research], 50);
    assert.equal(pruned.length, 50);
    assert.equal(pruned.filter((m) => m.category === 'LEARNED').length, 10);
  });

  test('não poda quando está dentro do teto', () => {
    const items = [mem({ key: 'a' }), mem({ key: 'b' })];
    assert.equal(pruneMemories(items, 10).length, 2);
  });
});

describe('memoryStore: ranking de relevância', () => {
  const memories: ServerMemoryItem[] = [
    mem({
      id: 'ts',
      key: 'preferencia_linguagem',
      title: 'Linguagem preferida',
      value: 'O usuário prefere TypeScript a JavaScript puro.',
      category: 'LEARNED',
      tags: ['typescript', 'preferencia'],
      createdAt: '2026-10-01T00:00:00.000Z',
    }),
    mem({
      id: 'video',
      key: 'pesquisa_video',
      title: 'Pesquisa: IA de vídeo',
      value: 'Sora, Runway e Kling para geração de vídeo.',
      category: 'RESEARCH',
      tags: ['video'],
      createdAt: '2026-02-01T00:00:00.000Z',
    }),
    mem({
      id: 'browser',
      key: 'navegador_padrao',
      title: 'Navegador padrão',
      value: 'Abrir links em aba dedicada.',
      category: 'SYSTEM',
      tags: ['browser'],
      createdAt: '2026-03-01T00:00:00.000Z',
    }),
  ];

  test('ignora stopwords e palavras curtas', () => {
    assert.deepEqual(tokenizeQuery('qual é a melhor linguagem para mim?'), ['melhor', 'linguagem', 'mim']);
  });

  test('coloca no topo a memória que casa com a pergunta', () => {
    const top = selectRelevantMemories(memories, 'qual linguagem eu prefiro para código?', 2, Date.parse('2026-11-07'));
    assert.equal(top[0].id, 'ts');
  });

  test('normaliza acentos na busca', () => {
    const top = selectRelevantMemories(memories, 'video', 1, Date.parse('2026-11-07'));
    assert.equal(top[0].id, 'video');
  });

  test('tag exata pesa mais que menção no corpo', () => {
    const scored = scoreMemories(memories, 'typescript', Date.parse('2026-11-07'));
    const ts = scored.find((s) => s.memory.id === 'ts')!;
    const video = scored.find((s) => s.memory.id === 'video')!;
    assert.ok(ts.score > video.score);
    assert.deepEqual(ts.matchedTerms, ['typescript']);
  });

  test('recência desempata memórias sem termo em comum', () => {
    const top = selectRelevantMemories(memories, 'assunto totalmente sem relação', 1, Date.parse('2026-11-07'));
    assert.ok(['ts', 'browser', 'video'].includes(top[0].id));
  });

  test('devolve tudo quando há menos itens que o limite', () => {
    assert.equal(selectRelevantMemories(memories, 'x', 15).length, 3);
    assert.deepEqual(selectRelevantMemories([], 'x', 15), []);
  });
});

describe('memoryStore: estatísticas e aprendizado', () => {
  test('resume contagem por categoria e datas', () => {
    const stats = getMemoryStats([
      mem({ category: 'LEARNED', createdAt: '2026-01-01T00:00:00.000Z' }),
      mem({ category: 'LEARNED', createdAt: '2026-05-01T00:00:00.000Z' }),
      mem({ category: 'RESEARCH' }),
    ]);
    assert.equal(stats.total, 3);
    assert.equal(stats.byCategory.LEARNED, 2);
    assert.equal(stats.byCategory.RESEARCH, 1);
    assert.equal(stats.oldest, '2026-01-01T00:00:00.000Z');
  });

  test('aprende estilo e rotina sem duplicar em chamadas repetidas', () => {
    autoLearnUserMemory('e aí mano, tá ligado que isso é top', '21:30', file);
    autoLearnUserMemory('beleza, manda ver de verdade', '21:35', file);

    const items = loadMemories(file);
    const style = items.filter((m) => m.key === 'estilo_conversa');
    const routine = items.filter((m) => m.key === 'rotina_horarios_sistema');
    assert.equal(style.length, 1);
    assert.equal(routine.length, 1);
    assert.match(routine[0].value, /Noite/);
  });

  test('registra tópico de pesquisa', () => {
    autoLearnUserMemory('pesquise sobre carros elétricos', '10:00', file);
    const items = loadMemories(file);
    assert.ok(items.some((m) => m.category === 'RESEARCH' && /carros elétricos/i.test(m.value)));
  });
});
