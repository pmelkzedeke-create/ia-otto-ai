import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

/**
 * Memória de longo prazo do OTTO — fonte única da verdade.
 *
 * Antes existiam DUAS implementações (esta e uma cópia dentro de server.ts),
 * ambas lendo e escrevendo o mesmo arquivo com `readFileSync`/`writeFileSync`
 * a cada chamada. Resultado: corrida entre as duas, JSON truncado em caso de
 * crash durante a escrita e parsing repetido a cada mensagem enviada.
 *
 * Agora:
 * - cache em memória invalidado por mtime/tamanho (parse só quando o arquivo muda);
 * - escrita atômica (arquivo temporário + rename), sem risco de JSON pela metade;
 * - normalização de entrada (id, categoria válida, tags, datas) e dedupe por chave;
 * - poda automática de pesquisas antigas quando a memória cresce demais;
 * - ranking de relevância com peso por campo (tag > título > chave > corpo),
 *   decaimento de recência e boost de categoria — em vez do "SYSTEM ganha 60".
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const WORKSPACE_DIR = path.resolve(__dirname, '..', 'otto_workspace');
export const MEMORY_FILE = path.join(WORKSPACE_DIR, '.otto_memory.json');

/** Teto de itens: acima disso as pesquisas mais antigas saem. */
export const MAX_MEMORY_ITEMS = 400;

export type MemoryCategory = 'KNOWLEDGE' | 'LEARNED' | 'RESEARCH' | 'SYSTEM';

export interface ServerMemoryItem {
  id: string;
  key: string;
  value: string;
  title?: string;
  category?: MemoryCategory;
  summary?: string;
  tags?: string[];
  color?: string;
  createdAt: string;
}

const VALID_CATEGORIES: MemoryCategory[] = ['KNOWLEDGE', 'LEARNED', 'RESEARCH', 'SYSTEM'];

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  KNOWLEDGE: '#38bdf8',
  LEARNED: '#34d399',
  RESEARCH: '#f472b6',
  SYSTEM: '#fbbf24',
};

// ---------------------------------------------------------------------------
// Seed inicial
// ---------------------------------------------------------------------------

export const SEED_MEMORIES: ServerMemoryItem[] = [
  {
    id: 'mem_1',
    key: 'ia_video',
    title: 'IAs que geram vídeo',
    value:
      'Principais ferramentas neurais de vídeo: Sora (OpenAI), Runway Gen-3, Kling AI, Luma Dream Machine e Pika Labs.',
    category: 'LEARNED',
    color: CATEGORY_COLORS.LEARNED,
    tags: ['ia', 'video', 'neural', 'sora', 'runway', 'kling'],
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'mem_2',
    key: 'projeto_principal',
    title: 'Projeto OTTO Core',
    value: 'Projeto central de inteligência e controle de computador, na pasta Projetos.',
    category: 'LEARNED',
    color: '#a78bfa',
    tags: ['projeto', 'workspace', 'codigo'],
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'mem_3',
    key: 'capacidades_sistema',
    title: 'Arquitetura e sistema',
    value: 'Controle de volume, navegador Chrome, terminal de comandos e execução de ferramentas em disco.',
    category: 'KNOWLEDGE',
    color: CATEGORY_COLORS.KNOWLEDGE,
    tags: ['sistema', 'controle', 'voz'],
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'mem_4',
    key: 'pesquisa_ia_video',
    title: 'Pesquisa: IA de vídeo',
    value: 'Levantamento das melhores IAs geradoras de vídeo na web.',
    category: 'RESEARCH',
    color: CATEGORY_COLORS.RESEARCH,
    tags: ['pesquisa', 'google', 'ia', 'video'],
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'mem_5',
    key: 'pesquisa_imagens',
    title: 'Pesquisa: imagens',
    value: 'Buscas de imagem feitas na web para referência visual.',
    category: 'RESEARCH',
    color: '#fb923c',
    tags: ['pesquisa', 'imagens', 'google'],
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'mem_6',
    key: 'navegador_padrao',
    title: 'Navegador padrão',
    value: 'Sempre preferir abrir links e pesquisas no navegador integrado ou em aba dedicada.',
    category: 'SYSTEM',
    color: CATEGORY_COLORS.SYSTEM,
    tags: ['preferencia', 'browser'],
    createdAt: '2026-01-01T12:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Normalização, dedupe e poda
// ---------------------------------------------------------------------------

function asCategory(value: unknown): MemoryCategory {
  const upper = String(value || '').toUpperCase() as MemoryCategory;
  return VALID_CATEGORIES.includes(upper) ? upper : 'LEARNED';
}

function asIsoDate(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** Garante um item utilizável; devolve null para lixo. */
export function normalizeMemory(raw: unknown, fallbackId = ''): ServerMemoryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<ServerMemoryItem>;

  const key = String(item.key || '').trim();
  const value = String(item.value || '').trim();
  if (!key || !value) return null;

  const category = asCategory(item.category);
  const tags = Array.isArray(item.tags)
    ? Array.from(new Set(item.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))).slice(0, 12)
    : [];

  return {
    id: String(item.id || fallbackId || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    key: key.slice(0, 120),
    value: value.slice(0, 4000),
    title: String(item.title || key).slice(0, 160),
    category,
    summary: String(item.summary || value).slice(0, 240),
    tags,
    color: String(item.color || CATEGORY_COLORS[category]),
    createdAt: asIsoDate(item.createdAt),
  };
}

/** Remove duplicatas de chave mantendo o item mais recente. */
export function dedupeMemories(items: ServerMemoryItem[]): ServerMemoryItem[] {
  const byKey = new Map<string, ServerMemoryItem>();

  for (const item of items) {
    const normalizedKey = item.key.trim().toLowerCase();
    const current = byKey.get(normalizedKey);
    if (!current) {
      byKey.set(normalizedKey, item);
      continue;
    }
    const currentTime = new Date(current.createdAt).getTime();
    const nextTime = new Date(item.createdAt).getTime();
    byKey.set(normalizedKey, nextTime >= currentTime ? item : current);
  }

  return Array.from(byKey.values());
}

/**
 * Limita o tamanho da memória.
 * Nunca descarta preferências/estilo (LEARNED, KNOWLEDGE, SYSTEM):
 * corta primeiro as pesquisas (RESEARCH) mais antigas.
 */
export function pruneMemories(items: ServerMemoryItem[], max = MAX_MEMORY_ITEMS): ServerMemoryItem[] {
  if (items.length <= max) return items;

  const research = items
    .filter((item) => asCategory(item.category) === 'RESEARCH')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const keep = new Set(items.filter((item) => asCategory(item.category) !== 'RESEARCH').map((item) => item.id));
  let remaining = max - keep.size;
  if (remaining < 0) remaining = 0;

  // Se ainda passar do teto, remove as pesquisas mais antigas até caber.
  const survivors = new Set(research.slice(Math.max(0, research.length - remaining)).map((item) => item.id));

  return items.filter((item) => keep.has(item.id) || survivors.has(item.id));
}

// ---------------------------------------------------------------------------
// Leitura e escrita com cache + escrita atômica
// ---------------------------------------------------------------------------

interface CacheEntry {
  mtimeMs: number;
  size: number;
  items: ServerMemoryItem[];
}

const cache = new Map<string, CacheEntry>();

function seedToDisk(filePath: string): ServerMemoryItem[] {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    writeMemoryFile(filePath, SEED_MEMORIES);
  } catch {
    /* sem permissão de escrita: segue só em memória */
  }
  return SEED_MEMORIES;
}

function writeMemoryFile(filePath: string, items: ServerMemoryItem[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export interface LoadMemoriesOptions {
  /** Cria o arquivo com o conteúdo inicial quando ele não existe (padrão: true). */
  seed?: boolean;
  /** Ignora o cache e força releitura (útil em testes). */
  fresh?: boolean;
}

export function loadMemories(
  filePath: string = MEMORY_FILE,
  options: LoadMemoriesOptions = {}
): ServerMemoryItem[] {
  const { seed = true, fresh = false } = options;

  let stat: fs.Stats | null = null;
  try {
    stat = fs.statSync(filePath);
  } catch {
    stat = null;
  }

  const cached = cache.get(filePath);
  if (!fresh && cached && stat && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.items;
  }

  if (!stat) {
    if (!seed) return [];
    const seeded = seedToDisk(filePath);
    const after = (() => {
      try {
        return fs.statSync(filePath);
      } catch {
        return null;
      }
    })();
    if (after) cache.set(filePath, { mtimeMs: after.mtimeMs, size: after.size, items: seeded });
    return seeded;
  }

  let items: ServerMemoryItem[] = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (Array.isArray(parsed)) {
      items = parsed
        .map((raw, index) => normalizeMemory(raw, `mem_${index}`))
        .filter((item): item is ServerMemoryItem => item !== null);
    }
  } catch (error) {
    console.error('[memoryStore] Arquivo de memória inválido, recomeçando vazio:', error);
    items = [];
  }

  cache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, items });
  return items;
}

export function saveMemories(items: ServerMemoryItem[], filePath: string = MEMORY_FILE): ServerMemoryItem[] {
  const clean = pruneMemories(
    dedupeMemories(
      items
        .map((item, index) => normalizeMemory(item, `mem_${index}`))
        .filter((item): item is ServerMemoryItem => item !== null)
    )
  );

  try {
    writeMemoryFile(filePath, clean);
    const stat = fs.statSync(filePath);
    cache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, items: clean });
  } catch (error) {
    console.error('[memoryStore] Falha ao gravar memória:', error);
    cache.set(filePath, { mtimeMs: -1, size: -1, items: clean });
  }

  return clean;
}

/** Limpa o cache (testes e casos de troca de arquivo). */
export function clearMemoryCache(filePath?: string): void {
  if (filePath) cache.delete(filePath);
  else cache.clear();
}

// ---------------------------------------------------------------------------
// Ranking de relevância
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'que', 'com', 'para', 'uma', 'como', 'mais', 'este', 'essa', 'isso', 'você', 'voce',
  'onde', 'qual', 'quais', 'sobre', 'dos', 'das', 'por', 'mas', 'seu', 'sua', 'tem',
  'foi', 'ser', 'está', 'esta', 'aqui', 'então', 'entao', 'também', 'tambem', 'não', 'nao',
]);

const RECENCY_HALF_LIFE_DAYS = 45;
const CATEGORY_BOOST: Record<MemoryCategory, number> = {
  SYSTEM: 12,
  LEARNED: 8,
  KNOWLEDGE: 6,
  RESEARCH: 4,
};

interface Haystack {
  key: string;
  title: string;
  value: string;
  tags: string[];
}

const haystackCache = new WeakMap<ServerMemoryItem, Haystack>();

function haystackOf(memory: ServerMemoryItem): Haystack {
  const cached = haystackCache.get(memory);
  if (cached) return cached;
  const built: Haystack = {
    key: (memory.key || '').toLowerCase(),
    title: (memory.title || '').toLowerCase(),
    value: `${memory.summary || ''} ${memory.value || ''}`.toLowerCase(),
    tags: (memory.tags || []).map((tag) => tag.toLowerCase()),
  };
  haystackCache.set(memory, built);
  return built;
}

export function tokenizeQuery(query: string): string[] {
  return Array.from(
    new Set(
      (query || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    )
  ).slice(0, 12);
}

export interface ScoredMemory {
  memory: ServerMemoryItem;
  score: number;
  matchedTerms: string[];
}

/** Pontua todas as memórias para uma consulta (exportado para teste/inspeção). */
export function scoreMemories(
  memories: ServerMemoryItem[],
  query: string,
  now: number = Date.now()
): ScoredMemory[] {
  const terms = tokenizeQuery(query);

  return memories.map((memory) => {
    const hay = haystackOf(memory);
    const category = asCategory(memory.category);

    let score = CATEGORY_BOOST[category];
    const matched: string[] = [];

    for (const term of terms) {
      let termScore = 0;
      if (hay.tags.some((tag) => tag === term)) termScore += 18;
      else if (hay.tags.some((tag) => tag.includes(term))) termScore += 10;

      if (hay.title.includes(term)) termScore += 12;
      if (hay.key.includes(term)) termScore += 10;
      if (hay.value.includes(term)) termScore += 6;

      if (termScore > 0) {
        score += Math.min(termScore, 30); // um termo não pode dominar tudo
        matched.push(term);
      }
    }

    // Cobertura da consulta vale mais que repetição de um único termo.
    if (terms.length > 1 && matched.length > 1) {
      score += 8 * (matched.length / terms.length);
    }

    // Recência com decaimento suave (nunca zera).
    const created = new Date(memory.createdAt).getTime();
    if (!Number.isNaN(created)) {
      const ageDays = Math.max(0, (now - created) / 86_400_000);
      score += 14 * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    }

    return { memory, score, matchedTerms: matched };
  });
}

/**
 * Seleciona as memórias mais relevantes para a pergunta atual.
 * Sem termos úteis na consulta, devolve as mais recentes das categorias fortes.
 */
export function selectRelevantMemories(
  memories: ServerMemoryItem[],
  userQuery: string,
  limit = 15,
  now: number = Date.now()
): ServerMemoryItem[] {
  if (!Array.isArray(memories) || memories.length === 0) return [];
  if (memories.length <= limit) return memories;

  const scored = scoreMemories(memories, userQuery, now).sort(
    (a, b) =>
      b.score - a.score ||
      new Date(b.memory.createdAt).getTime() - new Date(a.memory.createdAt).getTime()
  );

  return scored.slice(0, limit).map((entry) => entry.memory);
}

export interface MemoryStats {
  total: number;
  byCategory: Record<MemoryCategory, number>;
  newest: string | null;
  oldest: string | null;
  totalChars: number;
}

export function getMemoryStats(memories: ServerMemoryItem[]): MemoryStats {
  const byCategory: Record<MemoryCategory, number> = { KNOWLEDGE: 0, LEARNED: 0, RESEARCH: 0, SYSTEM: 0 };
  let newest: number | null = null;
  let oldest: number | null = null;
  let totalChars = 0;

  for (const memory of memories) {
    byCategory[asCategory(memory.category)] += 1;
    const time = new Date(memory.createdAt).getTime();
    if (!Number.isNaN(time)) {
      newest = newest === null ? time : Math.max(newest, time);
      oldest = oldest === null ? time : Math.min(oldest, time);
    }
    totalChars += (memory.key?.length || 0) + (memory.value?.length || 0);
  }

  return {
    total: memories.length,
    byCategory,
    newest: newest === null ? null : new Date(newest).toISOString(),
    oldest: oldest === null ? null : new Date(oldest).toISOString(),
    totalChars,
  };
}

// ---------------------------------------------------------------------------
// Aprendizado automático
// ---------------------------------------------------------------------------

const SLANG_MARKERS = [
  'tá ligado', 'ta ligado', 'bagulho', 'top', 'mano', 'cara', 'bora', 'show',
  'manda ver', 'fala aí', 'fala ai', 'beleza', 'né',
];

const EXECUTION_MARKERS = [
  'de verdade', 'funcione de verdade', 'sem mentira', 'sem enrolação', 'direto',
];

const RESEARCH_MARKERS = ['pesquise', 'procure', 'busca', 'tem ia', 'slide', 'site'];

function periodOf(hour: number): string {
  if (hour >= 0 && hour < 6) return 'Madrugada';
  if (hour < 12) return 'Manhã';
  if (hour < 18) return 'Tarde';
  return 'Noite';
}

/**
 * Aprende, a partir da fala do usuário: estilo de conversa, rotina de uso e
 * tópicos pesquisados. Escreve no máximo uma vez por chamada.
 */
export function autoLearnUserMemory(
  prompt: string,
  currentTime?: string,
  filePath: string = MEMORY_FILE
): ServerMemoryItem[] {
  try {
    const memories = loadMemories(filePath);
    const normalized = (prompt || '').toLowerCase().trim();
    if (!normalized) return memories;

    const timeStr =
      currentTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const hour = Number.parseInt(timeStr.split(':')[0] || '', 10) || new Date().getHours();
    const period = periodOf(hour);
    const uptimeHours = (os.uptime() / 3600).toFixed(1);
    let changed = false;

    const upsert = (item: ServerMemoryItem) => {
      const index = memories.findIndex((memory) => memory.key === item.key);
      if (index >= 0) memories[index] = { ...item, id: memories[index].id };
      else memories.push(item);
      changed = true;
    };

    // 1. Estilo de conversa
    const informal = SLANG_MARKERS.some((marker) => normalized.includes(marker));
    const wantsExecution = EXECUTION_MARKERS.some((marker) => normalized.includes(marker));

    if (informal || wantsExecution) {
      upsert({
        id: `mem_style_${Date.now()}`,
        key: 'estilo_conversa',
        title: 'Estilo de conversa e tom',
        value: wantsExecution
          ? 'Comunicação autêntica e descontraída, com foco absoluto em execução real: exige ferramentas operando de verdade no computador, sem simulações.'
          : 'Comunicação informal, autêntica e descontraída. Prefere respostas objetivas, diretas e execução prática sem rodeios.',
        category: 'LEARNED',
        color: CATEGORY_COLORS.LEARNED,
        tags: ['estilo', 'personalidade', 'conversa', 'comunicacao', 'direto'],
        summary: 'Tom informal, autenticidade e execução real imediata.',
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Rotina de uso
    upsert({
      id: `mem_routine_${Date.now()}`,
      key: 'rotina_horarios_sistema',
      title: 'Rotina e atividade do sistema',
      value: `Atividade registrada no período da ${period} (horário local: ${timeStr}). Uptime do sistema: ${uptimeHours} horas. O usuário costuma interagir neste horário para comandos diretos, pesquisas e geração autônoma.`,
      category: 'SYSTEM',
      color: CATEGORY_COLORS.SYSTEM,
      tags: ['horario', 'atividade', 'sistema', 'rotina', 'telemetria'],
      summary: `Pico de atividade na ${period} (${timeStr}) • Uptime: ${uptimeHours}h.`,
      createdAt: new Date().toISOString(),
    });

    // 3. Tópicos pesquisados
    if (RESEARCH_MARKERS.some((marker) => normalized.includes(marker))) {
      const topic = prompt
        .replace(
          /(otto|pesquise|pesquisa|procure|busca|na web|na internet|no google|sobre|crie slides?|crie um slide|crie um site)/gi,
          ''
        )
        .trim();

      if (topic.length > 2) {
        const searchKey = `pesq_${topic.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16)}`;
        upsert({
          id: `mem_${Date.now()}`,
          key: searchKey,
          title: `Interesse: ${topic.slice(0, 24)}`,
          value: `Tópico explorado pelo usuário às ${timeStr} (${period}): "${topic}".`,
          category: 'RESEARCH',
          color: CATEGORY_COLORS.RESEARCH,
          tags: ['pesquisa', 'interesse', 'web'],
          summary: `Pesquisa solicitada: ${topic}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return changed ? saveMemories(memories, filePath) : memories;
  } catch (error) {
    console.error('[autoLearnUserMemory] Aviso:', error);
    return [];
  }
}
