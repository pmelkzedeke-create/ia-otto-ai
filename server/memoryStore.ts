import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const WORKSPACE_DIR = path.resolve(__dirname, '..', 'otto_workspace');
export const MEMORY_FILE = path.join(WORKSPACE_DIR, '.otto_memory.json');

export interface ServerMemoryItem {
  id: string;
  key: string;
  value: string;
  title?: string;
  category?: 'KNOWLEDGE' | 'LEARNED' | 'RESEARCH' | 'SYSTEM';
  summary?: string;
  tags?: string[];
  color?: string;
  createdAt: string;
}

export function loadMemories(): ServerMemoryItem[] {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading memory file:', err);
  }

  // Pre-seed celestial planetary memory nodes
  const initialMemories: ServerMemoryItem[] = [
    {
      id: 'mem_1',
      key: 'ia_video',
      title: 'IAs que Geram Vídeo',
      value: 'Principais ferramentas neurais de vídeo: Sora (OpenAI), Runway Gen-3, Kling AI, Luma Dream Machine e Pika Labs.',
      category: 'LEARNED',
      color: '#34d399',
      tags: ['ia', 'video', 'neural', 'sora', 'runway', 'kling'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_2',
      key: 'projeto_principal',
      title: 'Projeto OTTO Core',
      value: 'Projeto central de inteligência e controle de computador localizado na pasta Projetos.',
      category: 'LEARNED',
      color: '#a78bfa',
      tags: ['projeto', 'workspace', 'codigo'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_3',
      key: 'capacidades_sistema',
      title: 'Arquitetura & Sistema',
      value: 'Controle de volume, navegador Chrome, terminal de comandos e execução de ferramentas em disco.',
      category: 'KNOWLEDGE',
      color: '#38bdf8',
      tags: ['sistema', 'controle', 'voz'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_4',
      key: 'pesquisa_ia_video',
      title: 'Pesquisa: IA de Vídeo',
      value: 'Pesquisa realizada sobre as melhores IAs geradoras de vídeo no Google.',
      category: 'RESEARCH',
      color: '#f43f5e',
      tags: ['pesquisa', 'google', 'ia', 'video'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_5',
      key: 'pesquisa_neymar',
      title: 'Pesquisa: Neymar Imagens',
      value: 'Pesquisa de imagens realizada no Google Imagens.',
      category: 'RESEARCH',
      color: '#fbbf24',
      tags: ['pesquisa', 'imagens', 'google'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_6',
      key: 'pesquisa_carros',
      title: 'Pesquisa: Fotos de Carros',
      value: 'Pesquisa sobre imagens de carros e tecnologia automotiva na web.',
      category: 'RESEARCH',
      color: '#fb923c',
      tags: ['pesquisa', 'carros', 'google'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_7',
      key: 'navegador_padrao',
      title: 'Navegador Padrão',
      value: 'Sempre preferir abrir links e pesquisas no navegador integrado ou aba dedicada.',
      category: 'SYSTEM',
      color: '#e879f9',
      tags: ['preferencia', 'browser'],
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(initialMemories, null, 2), 'utf-8');
  } catch {}

  return initialMemories;
}

export function saveMemories(memories: ServerMemoryItem[]) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving memory file:', err);
  }
}

/**
 * Seleciona até 15 memórias mais relevantes para a pergunta atual.
 * Prioridades:
 * (1) Categoria SYSTEM / RESEARCH
 * (2) Matches de palavras-chave da pergunta em key / title / summary / tags
 * (3) Mais recentes
 */
export function selectRelevantMemories(
  memories: ServerMemoryItem[],
  userQuery: string,
  limit = 15
): ServerMemoryItem[] {
  if (!memories || memories.length === 0) return [];
  if (memories.length <= limit) return memories;

  // Extrai termos significativos da pergunta (mínimo 3 letras, sem stopwords óbvias)
  const stopWords = new Set(['que', 'com', 'para', 'uma', 'como', 'mais', 'este', 'essa', 'isso', 'você', 'voce', 'onde', 'qual']);
  const terms = (userQuery || '')
    .toLowerCase()
    .replace(/[^\w\sáéíóúâêîôûãõç]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const scored = memories.map((mem) => {
    let score = 0;

    // Prioridade (1): Categoria SYSTEM / RESEARCH
    const category = (mem.category || '').toUpperCase();
    if (category === 'SYSTEM') {
      score += 60;
    } else if (category === 'RESEARCH') {
      score += 45;
    } else if (category === 'KNOWLEDGE') {
      score += 20;
    }

    // Prioridade (2): Matches de palavras-chave da pergunta
    const searchable = [
      mem.key || '',
      mem.title || '',
      mem.summary || '',
      mem.value || '',
      ...(mem.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    for (const term of terms) {
      if (searchable.includes(term)) {
        score += 25;
      }
    }

    // Prioridade (3): Mais recentes (score decrescente suave por data de criação)
    const timeMs = mem.createdAt ? new Date(mem.createdAt).getTime() : 0;
    if (timeMs > 0) {
      // Normalização suave: soma até 10 pontos proporcionais à proximidade no tempo
      score += Math.min(10, (timeMs / Date.now()) * 10);
    }

    return { mem, score, timeMs };
  });

  // Ordenação: maior score primeiro; desempate pela data mais recente
  scored.sort((a, b) => b.score - a.score || b.timeMs - a.timeMs);

  return scored.slice(0, limit).map((s) => s.mem);
}

export function autoLearnUserMemory(prompt: string, currentTime?: string) {
  try {
    const memories = loadMemories();
    const p = prompt.toLowerCase().trim();
    const timeStr = currentTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const uptimeSeconds = os.uptime();
    const uptimeHours = (uptimeSeconds / 3600).toFixed(1);
    const hour = parseInt(timeStr.split(':')[0], 10) || new Date().getHours();
    const period =
      hour >= 0 && hour < 6
        ? 'Madrugada'
        : hour >= 6 && hour < 12
        ? 'Manhã'
        : hour >= 12 && hour < 18
        ? 'Tarde'
        : 'Noite';

    const hasInformalSlang =
      p.includes('tá ligado') ||
      p.includes('ta ligado') ||
      p.includes('bagulho') ||
      p.includes('top') ||
      p.includes('mano') ||
      p.includes('cara') ||
      p.includes('bora') ||
      p.includes('show') ||
      p.includes('manda ver') ||
      p.includes('fala aí') ||
      p.includes('fala ai') ||
      p.includes('beleza') ||
      p.includes('né');

    const wantsRealExecution =
      p.includes('de verdade') ||
      p.includes('funcione de verdade') ||
      p.includes('sem mentira') ||
      p.includes('sem enrolação') ||
      p.includes('direto');

    if (hasInformalSlang || wantsRealExecution) {
      const styleIdx = memories.findIndex((m) => m.key === 'estilo_conversa');
      const styleDesc = wantsRealExecution
        ? 'Comunicação autêntica, descontraída e com foco absoluto em execução real (gírias: "tá ligado", "bagulho", "top"). Exige ferramentas operando de verdade no computador, sem mockups ou simulações rasas.'
        : 'Comunicação informal, autêntica e descontraída (gírias frequentes: "tá ligado", "bagulho", "top"). Prefere respostas objetivas, diretas e execução prática sem rodeios.';

      const styleItem: ServerMemoryItem = {
        id: styleIdx >= 0 ? memories[styleIdx].id : `mem_style_${Date.now()}`,
        key: 'estilo_conversa',
        title: 'Estilo de Conversa & Tom',
        value: styleDesc,
        category: 'LEARNED',
        summary: 'Preferência por linguagem direta, autêntica e focada em resultados práticos',
        tags: ['estilo', 'tom', 'comunicacao', 'direto'],
        color: '#34d399',
        createdAt: new Date().toISOString(),
      };

      if (styleIdx >= 0) memories[styleIdx] = styleItem;
      else memories.push(styleItem);
      saveMemories(memories);
    }
  } catch (err) {
    console.error('Error auto-learning memory:', err);
  }
}
