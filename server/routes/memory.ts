import { Router } from 'express';
import { loadMemories, saveMemories, ServerMemoryItem } from '../memoryStore.js';

export const memoryRouter = Router();

// Listar memórias salvas
memoryRouter.get('/api/memory', (req, res) => {
  const memories = loadMemories();
  res.json({ memories });
});

// Criar ou atualizar memória
memoryRouter.post('/api/memory', (req, res) => {
  const { key, value, title, category = 'LEARNED', tags, color, summary } = req.body;
  if (!key || !value) {
    return res.status(400).json({ error: 'Chave e valor necessários' });
  }

  const memories = loadMemories();
  const existingIdx = memories.findIndex((m) => m.key.toLowerCase() === key.toLowerCase());

  const categoryColors: Record<string, string> = {
    KNOWLEDGE: '#38bdf8',
    LEARNED: '#34d399',
    RESEARCH: '#f43f5e',
    SYSTEM: '#fbbf24',
  };

  const itemToSave: ServerMemoryItem = {
    id: existingIdx >= 0 ? memories[existingIdx].id : `mem_${Date.now()}`,
    key,
    value,
    title: title || key,
    category: ['KNOWLEDGE', 'LEARNED', 'RESEARCH', 'SYSTEM'].includes(category) ? category : 'LEARNED',
    summary: summary || value.slice(0, 80),
    tags: Array.isArray(tags) ? tags : [key.toLowerCase()],
    color: color || categoryColors[category] || '#38bdf8',
    createdAt: existingIdx >= 0 ? memories[existingIdx].createdAt : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    memories[existingIdx] = itemToSave;
  } else {
    memories.push(itemToSave);
  }

  saveMemories(memories);
  res.json({ success: true, memory: itemToSave, memories });
});

// Excluir memória
memoryRouter.delete('/api/memory/:id', (req, res) => {
  const { id } = req.params;
  let memories = loadMemories();
  memories = memories.filter((m) => m.id !== id);
  saveMemories(memories);
  res.json({ success: true, memories });
});
