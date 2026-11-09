import { Router } from 'express';
import {
  loadMemories,
  saveMemories,
  getMemoryStats,
  normalizeMemory,
  ServerMemoryItem,
  MemoryCategory,
} from '../memoryStore.js';

export const memoryRouter = Router();

const VALID_CATEGORIES: MemoryCategory[] = ['KNOWLEDGE', 'LEARNED', 'RESEARCH', 'SYSTEM'];

/** Lista as memórias com estatísticas prontas para o painel. */
memoryRouter.get('/api/memory', (req, res) => {
  const memories = loadMemories();
  res.json({ memories, stats: getMemoryStats(memories) });
});

/** Cria ou atualiza uma memória (a chave é a identidade). */
memoryRouter.post('/api/memory', (req, res) => {
  const { key, value, title, category, tags, color, summary } = req.body || {};

  if (typeof key !== 'string' || typeof value !== 'string' || !key.trim() || !value.trim()) {
    return res.status(400).json({ error: 'Chave e valor são obrigatórios.' });
  }
  if (key.length > 120 || value.length > 4000) {
    return res.status(413).json({ error: 'Memória muito longa (máx. 120 na chave e 4000 no valor).' });
  }

  const memories = loadMemories();
  const existingIndex = memories.findIndex((m) => m.key.toLowerCase() === key.trim().toLowerCase());

  const candidate = normalizeMemory(
    {
      id: existingIndex >= 0 ? memories[existingIndex].id : `mem_${Date.now()}`,
      key: key.trim(),
      value,
      title: title || key,
      category: VALID_CATEGORIES.includes(String(category).toUpperCase() as MemoryCategory)
        ? (String(category).toUpperCase() as MemoryCategory)
        : 'LEARNED',
      summary: summary || value.slice(0, 120),
      tags: Array.isArray(tags) ? tags : [key.trim().toLowerCase()],
      color,
      createdAt: existingIndex >= 0 ? memories[existingIndex].createdAt : new Date().toISOString(),
    },
    `mem_${Date.now()}`
  );

  if (!candidate) {
    return res.status(400).json({ error: 'Não foi possível normalizar a memória enviada.' });
  }

  if (existingIndex >= 0) memories[existingIndex] = candidate;
  else memories.push(candidate);

  const saved = saveMemories(memories);
  return res.json({
    success: true,
    memory: candidate,
    memories: saved,
    stats: getMemoryStats(saved),
  });
});

/** Remove todas as memórias (usado por "esquecer tudo"). */
memoryRouter.delete('/api/memory', (req, res) => {
  const saved = saveMemories([] as ServerMemoryItem[]);
  res.json({ success: true, memories: saved, stats: getMemoryStats(saved) });
});

/** Remove uma memória pelo id. */
memoryRouter.delete('/api/memory/:id', (req, res) => {
  const { id } = req.params;
  const memories = loadMemories().filter((memory) => memory.id !== id);
  const saved = saveMemories(memories);
  res.json({ success: true, memories: saved, stats: getMemoryStats(saved) });
});
