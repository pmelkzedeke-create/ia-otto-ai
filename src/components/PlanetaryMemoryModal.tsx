import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Sparkles,
  MessageSquare,
  Globe,
  Brain,
  Clock,
  Copy,
  Check,
  Layers,
  Tag,
  FolderOpen,
  Orbit,
  BookOpen,
  ArrowUpDown,
  StickyNote,
  Loader2,
} from 'lucide-react';
import { MemoryItem, MemoryCategory, OttoProject } from '../types/otto';
import { ApiBridge } from '../services/apiBridge';

/**
 * Memória do OTTO — reconstruída.
 *
 * O que mudou em relação à versão anterior (canvas com física de bolhas):
 * - zero requestAnimationFrame: a aba é inerte quando parada, sem custo de CPU;
 * - nenhuma colisão O(n²) entre bolhas (era o gargalo com muitas memórias);
 * - busca, filtro e ordenação memoizados e instantâneos, inclusive com 400 itens;
 * - constelação em SVG (só transform/opacity), desligada em prefers-reduced-motion;
 * - abas claras: Memórias · Constelação · Temporária · Projetos, com painel de detalhe;
 * - acessível: role dialog, Esc fecha, foco preso, rótulos e contraste;
 * - tema claro de verdade (antes só existia a versão escura).
 */

interface PlanetaryMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoryChanged?: () => void;
  onSelectTopicForChat?: (topicText: string) => void;
  onSearchTopic?: (query: string) => void;
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onScratchpadChanged?: () => void;
}

type Tab = 'MEMORIES' | 'CONSTELLATION' | 'SCRATCHPAD' | 'PROJECTS';
type SortMode = 'recent' | 'alpha' | 'category';

interface CategoryMeta {
  label: string;
  short: string;
  color: string;
  hint: string;
}

const CATEGORY_META: Record<MemoryCategory, CategoryMeta> = {
  LEARNED: {
    label: 'O que aprendi',
    short: 'Aprendi',
    color: '#34d399',
    hint: 'Estilo de conversa, preferências e contextos assimilados',
  },
  KNOWLEDGE: {
    label: 'O que eu sei',
    short: 'Sei',
    color: '#38bdf8',
    hint: 'Capacidades do sistema, comandos e ferramentas',
  },
  RESEARCH: {
    label: 'O que pesquisei',
    short: 'Pesquisei',
    color: '#f472b6',
    hint: 'Tópicos explorados na web e interesses',
  },
  SYSTEM: {
    label: 'Rotina e sistema',
    short: 'Rotina',
    color: '#fbbf24',
    hint: 'Horários de uso, uptime e preferências fixas',
  },
};

const CATEGORY_ORDER: MemoryCategory[] = ['LEARNED', 'KNOWLEDGE', 'RESEARCH', 'SYSTEM'];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'MEMORIES', label: 'Memórias', icon: BookOpen },
  { id: 'CONSTELLATION', label: 'Constelação', icon: Orbit },
  { id: 'SCRATCHPAD', label: 'Temporária', icon: StickyNote },
  { id: 'PROJECTS', label: 'Projetos', icon: FolderOpen },
];

const normalizeText = (value: string): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const memoryTitle = (memory: MemoryItem): string =>
  memory.title?.trim() || memory.key.replace(/[_-]+/g, ' ');

const memoryBody = (memory: MemoryItem): string =>
  (memory.value || memory.summary || '').trim();

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays <= 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 30) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export const PlanetaryMemoryModal: React.FC<PlanetaryMemoryModalProps> = ({
  isOpen,
  onClose,
  onMemoryChanged,
  onSelectTopicForChat,
  onSearchTopic,
  activeProjectId,
  onSelectProject,
  onScratchpadChanged,
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [scratchpad, setScratchpad] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<OttoProject[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('MEMORIES');
  const [category, setCategory] = useState<MemoryCategory | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('LEARNED');
  const [formValue, setFormValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [scratchKey, setScratchKey] = useState('');
  const [scratchValue, setScratchValue] = useState('');

  const [creatingProject, setCreatingProject] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');

  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memData, scratchData, projData] = await Promise.all([
        ApiBridge.getMemories(),
        ApiBridge.getScratchpad(),
        ApiBridge.getProjects(),
      ]);
      setMemories(Array.isArray(memData) ? memData : []);
      setScratchpad(scratchData || {});
      setProjects(Array.isArray(projData) ? projData : []);
    } catch {
      setError('Não consegui carregar a memória agora. Tente fechar e abrir de novo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadAll();
    setTab('MEMORIES');
    setSelectedId(null);
    setIsAdding(false);
    setQuery('');
    setCategory('ALL');
  }, [isOpen, loadAll]);

  // Esc fecha · Tab fica preso no painel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (selectedId) setSelectedId(null);
        else if (isAdding) setIsAdding(false);
        else onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedId, isAdding, onClose]);

  useEffect(() => {
    if (isOpen && !loading) {
      const timer = setTimeout(() => searchRef.current?.focus(), 180);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loading]);

  useEffect(
    () => () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    },
    []
  );

  const stats = useMemo(() => {
    const byCategory: Record<MemoryCategory, number> = {
      LEARNED: 0,
      KNOWLEDGE: 0,
      RESEARCH: 0,
      SYSTEM: 0,
    };
    for (const memory of memories) {
      const key = (memory.category || 'LEARNED') as MemoryCategory;
      if (byCategory[key] !== undefined) byCategory[key] += 1;
    }
    const newest = memories.reduce<string | null>((acc, memory) => {
      const time = new Date(memory.createdAt).getTime();
      if (Number.isNaN(time)) return acc;
      if (!acc) return memory.createdAt;
      return time > new Date(acc).getTime() ? memory.createdAt : acc;
    }, null);
    return { total: memories.length, byCategory, newest };
  }, [memories]);

  const visibleMemories = useMemo(() => {
    const needle = normalizeText(query.trim());

    const filtered = memories.filter((memory) => {
      const memoryCategory = (memory.category || 'LEARNED') as MemoryCategory;
      if (category !== 'ALL' && memoryCategory !== category) return false;
      if (!needle) return true;

      const haystack = normalizeText(
        [memoryTitle(memory), memoryBody(memory), memory.key, ...(memory.tags || [])].join(' ')
      );
      return needle.split(/\s+/).every((term) => haystack.includes(term));
    });

    const sorted = [...filtered];
    if (sort === 'alpha') {
      sorted.sort((a, b) => memoryTitle(a).localeCompare(memoryTitle(b), 'pt-BR'));
    } else if (sort === 'category') {
      sorted.sort((a, b) => {
        const ca = CATEGORY_ORDER.indexOf((a.category || 'LEARNED') as MemoryCategory);
        const cb = CATEGORY_ORDER.indexOf((b.category || 'LEARNED') as MemoryCategory);
        if (ca !== cb) return ca - cb;
        return memoryTitle(a).localeCompare(memoryTitle(b), 'pt-BR');
      });
    } else {
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return sorted;
  }, [memories, category, query, sort]);

  const selected = useMemo(
    () => visibleMemories.find((memory) => memory.id === selectedId) || memories.find((m) => m.id === selectedId) || null,
    [visibleMemories, memories, selectedId]
  );

  /**
   * Posições fixas em três anéis — determinístico e sem animação contínua.
   * O SVG custa frações de milissegundo; a versão anterior rodava física
   * de bolhas a 60 fps com colisão entre todos os pares.
   */
  const constellation = useMemo(() => {
    const items = visibleMemories.slice(0, 60);
    const rings = [70, 120, 168];
    return items.map((memory, index) => {
      const memoryCategory = (memory.category || 'LEARNED') as MemoryCategory;
      const ringIndex = Math.max(0, CATEGORY_ORDER.indexOf(memoryCategory)) % rings.length;
      const ring = rings[ringIndex];
      const countInRing = items.filter(
        (item) => (CATEGORY_ORDER.indexOf((item.category || 'LEARNED') as MemoryCategory) % rings.length) === ringIndex
      ).length;
      const positionInRing = items
        .slice(0, index)
        .filter(
          (item) => (CATEGORY_ORDER.indexOf((item.category || 'LEARNED') as MemoryCategory) % rings.length) === ringIndex
        ).length;
      const angle = ((positionInRing + 0.5) / Math.max(1, countInRing)) * Math.PI * 2;
      return {
        memory,
        color: memory.color || CATEGORY_META[memoryCategory].color,
        x: 200 + Math.cos(angle) * ring,
        y: 200 + Math.sin(angle) * ring,
        ring,
      };
    });
  }, [visibleMemories]);

  const handleCreateMemory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formTitle.trim() || !formValue.trim() || saving) return;

    setSaving(true);
    const key =
      normalizeText(formTitle.trim())
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 60) || `memoria_${Date.now()}`;

    const next = await ApiBridge.saveMemory(key, formValue.trim(), {
      title: formTitle.trim(),
      category: formCategory,
    });

    if (Array.isArray(next) && next.length) setMemories(next);
    else await loadAll();

    setFormTitle('');
    setFormValue('');
    setFormCategory('LEARNED');
    setIsAdding(false);
    setSaving(false);
    onMemoryChanged?.();
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }

    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmDeleteId(null);
    const next = await ApiBridge.deleteMemory(id);
    setMemories(Array.isArray(next) ? next : memories.filter((memory) => memory.id !== id));
    if (selectedId === id) setSelectedId(null);
    onMemoryChanged?.();
  };

  const handleCopy = async (memory: MemoryItem) => {
    try {
      await navigator.clipboard.writeText(`${memoryTitle(memory)}\n\n${memoryBody(memory)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard bloqueado */
    }
  };

  const handleAddScratchpad = async (event: React.FormEvent) => {
    event.preventDefault();
    const key = scratchKey.trim();
    const value = scratchValue.trim();
    if (!key || !value) return;

    const updated = { ...scratchpad, [key]: value };
    setScratchpad(updated);
    setScratchKey('');
    setScratchValue('');
    await ApiBridge.setScratchpad({ [key]: value });
    onScratchpadChanged?.();
  };

  const handleRemoveScratchpad = async (key: string) => {
    const next = { ...scratchpad };
    delete next[key];
    setScratchpad(next);
    await ApiBridge.clearScratchpad();
    if (Object.keys(next).length) await ApiBridge.setScratchpad(next);
    onScratchpadChanged?.();
  };

  const handleClearScratchpad = async () => {
    setScratchpad({});
    await ApiBridge.clearScratchpad();
    onScratchpadChanged?.();
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projName.trim()) return;
    const result = await ApiBridge.createProject({
      name: projName.trim(),
      description: projDesc.trim(),
    });
    if (result?.project) {
      setProjects((prev) => [...prev, result.project]);
      onSelectProject?.(result.project.id);
    }
    setProjName('');
    setProjDesc('');
    setCreatingProject(false);
  };

  const handleDeleteProject = async (id: string) => {
    await ApiBridge.deleteProject(id);
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const openInChat = (memory: MemoryItem) => {
    onSelectTopicForChat?.(`Explique mais sobre ${memoryTitle(memory)} da sua memória.`);
    onClose();
  };

  const searchOnWeb = (memory: MemoryItem) => {
    onSearchTopic?.(memoryTitle(memory));
    onClose();
  };

  if (!isOpen) return null;

  const scratchEntries = Object.entries(scratchpad);

  return (
    <div className="ot-mem-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ot-mem-title"
        className="ot-mem-panel"
      >
        {/* CABEÇALHO */}
        <header className="ot-mem-header">
          <div className="ot-mem-titlewrap">
            <div className="ot-mem-mark" aria-hidden="true">
              <Brain className="w-5 h-5" strokeWidth={1.7} />
            </div>
            <div>
              <h2 id="ot-mem-title" className="ot-mem-title">
                Memória
              </h2>
              <p className="ot-mem-subtitle">
                {loading
                  ? 'Carregando o que o OTTO lembra…'
                  : `${stats.total} ${stats.total === 1 ? 'memória' : 'memórias'} · última ${formatDate(
                      stats.newest || ''
                    ) || 'agora'}`}
              </p>
            </div>
          </div>

          <div className="ot-mem-header-actions">
            <div className="ot-mem-legend" aria-hidden="true">
              {CATEGORY_ORDER.map((key) => (
                <span key={key} className="ot-mem-legend-item">
                  <span className="ot-mem-dot" style={{ background: CATEGORY_META[key].color }} />
                  {stats.byCategory[key]}
                </span>
              ))}
            </div>
            <button type="button" className="ot-mem-icon-btn" onClick={onClose} aria-label="Fechar memória">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ABAS + BUSCA */}
        <div className="ot-mem-toolbar">
          <div className="ot-mem-tabs" role="tablist" aria-label="Seções da memória">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`ot-mem-tab ${tab === id ? 'is-active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>{label}</span>
                {id === 'SCRATCHPAD' && scratchEntries.length > 0 && (
                  <span className="ot-mem-tab-badge">{scratchEntries.length}</span>
                )}
                {id === 'PROJECTS' && projects.length > 0 && (
                  <span className="ot-mem-tab-badge">{projects.length}</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'MEMORIES' && (
            <div className="ot-mem-tools">
              <label className="ot-mem-search">
                <Search className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar na memória…"
                  aria-label="Buscar na memória"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </label>

              <label className="ot-mem-sort">
                <ArrowUpDown className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  aria-label="Ordenar memórias"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="alpha">A–Z</option>
                  <option value="category">Por categoria</option>
                </select>
              </label>

              <button type="button" className="ot-mem-primary" onClick={() => setIsAdding((prev) => !prev)}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                <span>Nova</span>
              </button>
            </div>
          )}
        </div>

        {/* FORMULÁRIO */}
        {isAdding && tab === 'MEMORIES' && (
          <form className="ot-mem-form" onSubmit={handleCreateMemory}>
            <div className="ot-mem-form-row">
              <input
                type="text"
                value={formTitle}
                onChange={(event) => setFormTitle(event.target.value)}
                placeholder="Título (ex: preferência de código)"
                aria-label="Título da memória"
                maxLength={120}
                required
              />
              <select
                value={formCategory}
                onChange={(event) => setFormCategory(event.target.value as MemoryCategory)}
                aria-label="Categoria da memória"
              >
                {CATEGORY_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_META[key].label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={formValue}
              onChange={(event) => setFormValue(event.target.value)}
              placeholder="O que o OTTO deve lembrar? (ex: prefere TypeScript a JavaScript puro)"
              aria-label="Conteúdo da memória"
              rows={2}
              maxLength={4000}
              required
            />
            <div className="ot-mem-form-actions">
              <button type="button" className="ot-mem-ghost" onClick={() => setIsAdding(false)}>
                Cancelar
              </button>
              <button type="submit" className="ot-mem-primary" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{saving ? 'Salvando…' : 'Salvar memória'}</span>
              </button>
            </div>
          </form>
        )}

        {/* CONTEÚDO */}
        <div className="ot-mem-body">
          {error && <div className="ot-mem-error">{error}</div>}

          {tab === 'MEMORIES' && (
            <>
              <div className="ot-mem-chips" role="group" aria-label="Filtrar por categoria">
                <button
                  type="button"
                  onClick={() => setCategory('ALL')}
                  className={`ot-mem-chip ${category === 'ALL' ? 'is-active' : ''}`}
                >
                  Todas
                  <span className="ot-mem-chip-count">{memories.length}</span>
                </button>
                {CATEGORY_ORDER.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`ot-mem-chip ${category === key ? 'is-active' : ''}`}
                    title={CATEGORY_META[key].hint}
                  >
                    <span className="ot-mem-dot" style={{ background: CATEGORY_META[key].color }} />
                    {CATEGORY_META[key].short}
                    <span className="ot-mem-chip-count">{stats.byCategory[key]}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="ot-mem-grid">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="ot-mem-skeleton" />
                  ))}
                </div>
              ) : visibleMemories.length === 0 ? (
                <div className="ot-mem-empty">
                  <Sparkles className="w-6 h-6" strokeWidth={1.5} />
                  <h3>{memories.length === 0 ? 'A memória está vazia' : 'Nada encontrado'}</h3>
                  <p>
                    {memories.length === 0
                      ? 'Fale com o OTTO e ele começa a aprender: estilo, preferências e o que você pesquisa.'
                      : 'Tente outro termo ou remova o filtro de categoria.'}
                  </p>
                  {memories.length === 0 && (
                    <button type="button" className="ot-mem-primary" onClick={() => setIsAdding(true)}>
                      <Plus className="w-3.5 h-3.5" /> Criar a primeira memória
                    </button>
                  )}
                </div>
              ) : (
                <div className="ot-mem-grid">
                  {visibleMemories.map((memory) => {
                    const memoryCategory = (memory.category || 'LEARNED') as MemoryCategory;
                    const meta = CATEGORY_META[memoryCategory];
                    const isConfirming = confirmDeleteId === memory.id;

                    return (
                      <article
                        key={memory.id}
                        className={`ot-mem-card ${selectedId === memory.id ? 'is-selected' : ''}`}
                        style={{ ['--mem-color' as string]: memory.color || meta.color }}
                      >
                        <button
                          type="button"
                          className="ot-mem-card-main"
                          onClick={() => setSelectedId(memory.id)}
                          aria-label={`Ver detalhes de ${memoryTitle(memory)}`}
                        >
                          <span className="ot-mem-card-cat">
                            <span className="ot-mem-dot" style={{ background: memory.color || meta.color }} />
                            {meta.label}
                          </span>
                          <h3 className="ot-mem-card-title">{memoryTitle(memory)}</h3>
                          <p className="ot-mem-card-body">{memoryBody(memory)}</p>
                        </button>

                        <footer className="ot-mem-card-foot">
                          <span className="ot-mem-card-date">
                            <Clock className="w-3 h-3" strokeWidth={1.8} />
                            {formatDate(memory.createdAt)}
                          </span>
                          <span className="ot-mem-card-tags">
                            {(memory.tags || []).slice(0, 2).map((tag) => (
                              <span key={tag} className="ot-mem-tag">
                                <Tag className="w-2.5 h-2.5" aria-hidden="true" />
                                {tag}
                              </span>
                            ))}
                          </span>
                          <button
                            type="button"
                            className={`ot-mem-trash ${isConfirming ? 'is-confirming' : ''}`}
                            onClick={() => handleDelete(memory.id)}
                            aria-label={isConfirming ? 'Confirmar exclusão' : `Apagar ${memoryTitle(memory)}`}
                            title={isConfirming ? 'Clique de novo para apagar' : 'Apagar memória'}
                          >
                            {isConfirming ? <span>Apagar?</span> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'CONSTELLATION' && (
            <div className="ot-mem-constellation">
              {visibleMemories.length === 0 ? (
                <div className="ot-mem-empty">
                  <Orbit className="w-6 h-6" strokeWidth={1.5} />
                  <h3>Sem estrelas ainda</h3>
                  <p>Cada memória vira um ponto na constelação. Fale com o OTTO para começar.</p>
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 400 400" role="img" aria-label="Mapa das memórias do OTTO">
                    <defs>
                      <radialGradient id="ot-mem-core" cx="50%" cy="50%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                      </radialGradient>
                    </defs>

                    {[70, 120, 168].map((ring) => (
                      <circle
                        key={ring}
                        cx="200"
                        cy="200"
                        r={ring}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.12"
                        strokeDasharray="3 6"
                      />
                    ))}

                    <circle cx="200" cy="200" r="16" fill="url(#ot-mem-core)" />
                    <circle cx="200" cy="200" r="26" fill="none" stroke="currentColor" strokeOpacity="0.18" />

                    {constellation.map(({ memory, color, x, y }) => (
                      <g
                        key={memory.id}
                        className="ot-mem-node"
                        onClick={() => setSelectedId(memory.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={memoryTitle(memory)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setSelectedId(memory.id);
                        }}
                      >
                        <circle cx={x} cy={y} r="12" fill={color} fillOpacity="0.14" />
                        <circle cx={x} cy={y} r="6" fill={color} />
                        <text x={x} y={y + 20} textAnchor="middle" className="ot-mem-node-label">
                          {memoryTitle(memory).slice(0, 16)}
                        </text>
                      </g>
                    ))}
                  </svg>

                  <p className="ot-mem-constellation-hint">
                    {visibleMemories.length} pontos · tamanho maior = aprendizados e preferências
                  </p>
                </>
              )}
            </div>
          )}

          {tab === 'SCRATCHPAD' && (
            <div className="ot-mem-section">
              <div className="ot-mem-section-head">
                <div>
                  <h3>Temporária</h3>
                  <p>Anotações que valem só para a conversa atual. O OTTO usa, mas não guarda para sempre.</p>
                </div>
                {scratchEntries.length > 0 && (
                  <button type="button" className="ot-mem-ghost" onClick={handleClearScratchpad}>
                    <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
                  </button>
                )}
              </div>

              <form className="ot-mem-form" onSubmit={handleAddScratchpad}>
                <div className="ot-mem-form-row">
                  <input
                    type="text"
                    value={scratchKey}
                    onChange={(event) => setScratchKey(event.target.value)}
                    placeholder="Chave (ex: cliente_atual)"
                    aria-label="Chave da anotação"
                  />
                  <input
                    type="text"
                    value={scratchValue}
                    onChange={(event) => setScratchValue(event.target.value)}
                    placeholder="Valor (ex: Padaria do Zé)"
                    aria-label="Valor da anotação"
                  />
                </div>
                <div className="ot-mem-form-actions">
                  <button type="submit" className="ot-mem-primary" disabled={!scratchKey.trim() || !scratchValue.trim()}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </form>

              {scratchEntries.length === 0 ? (
                <div className="ot-mem-empty">
                  <StickyNote className="w-6 h-6" strokeWidth={1.5} />
                  <h3>Nada na memória temporária</h3>
                  <p>Use para dar contexto rápido: “estou refatorando o módulo de voz”.</p>
                </div>
              ) : (
                <ul className="ot-mem-list">
                  {scratchEntries.map(([key, value]) => (
                    <li key={key} className="ot-mem-list-item">
                      <span className="ot-mem-list-key">{key}</span>
                      <span className="ot-mem-list-value">{value}</span>
                      <button
                        type="button"
                        className="ot-mem-icon-btn"
                        onClick={() => handleRemoveScratchpad(key)}
                        aria-label={`Remover ${key}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'PROJECTS' && (
            <div className="ot-mem-section">
              <div className="ot-mem-section-head">
                <div>
                  <h3>Projetos</h3>
                  <p>Separe contexto por projeto: o OTTO prioriza o que pertence ao projeto ativo.</p>
                </div>
                <button type="button" className="ot-mem-primary" onClick={() => setCreatingProject((prev) => !prev)}>
                  <Plus className="w-3.5 h-3.5" /> Novo projeto
                </button>
              </div>

              {creatingProject && (
                <form className="ot-mem-form" onSubmit={handleCreateProject}>
                  <div className="ot-mem-form-row">
                    <input
                      type="text"
                      value={projName}
                      onChange={(event) => setProjName(event.target.value)}
                      placeholder="Nome do projeto"
                      aria-label="Nome do projeto"
                      required
                    />
                    <input
                      type="text"
                      value={projDesc}
                      onChange={(event) => setProjDesc(event.target.value)}
                      placeholder="Descrição curta"
                      aria-label="Descrição do projeto"
                    />
                  </div>
                  <div className="ot-mem-form-actions">
                    <button type="button" className="ot-mem-ghost" onClick={() => setCreatingProject(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="ot-mem-primary">
                      <Check className="w-3.5 h-3.5" /> Criar
                    </button>
                  </div>
                </form>
              )}

              {projects.length === 0 ? (
                <div className="ot-mem-empty">
                  <FolderOpen className="w-6 h-6" strokeWidth={1.5} />
                  <h3>Nenhum projeto ainda</h3>
                  <p>Crie um projeto para separar memórias, arquivos e decisões por assunto.</p>
                </div>
              ) : (
                <div className="ot-mem-grid">
                  {projects.map((project) => (
                    <article
                      key={project.id}
                      className={`ot-mem-card ${activeProjectId === project.id ? 'is-selected' : ''}`}
                      style={{ ['--mem-color' as string]: project.color || '#38bdf8' }}
                    >
                      <div className="ot-mem-card-main">
                        <span className="ot-mem-card-cat">
                          <span className="ot-mem-dot" style={{ background: project.color || '#38bdf8' }} />
                          Projeto
                        </span>
                        <h3 className="ot-mem-card-title">{project.name}</h3>
                        <p className="ot-mem-card-body">{project.description || 'Sem descrição'}</p>
                      </div>
                      <footer className="ot-mem-card-foot">
                        <button
                          type="button"
                          className="ot-mem-ghost"
                          onClick={() => onSelectProject?.(project.id)}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          {activeProjectId === project.id ? 'Ativo' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          className="ot-mem-icon-btn"
                          onClick={() => handleDeleteProject(project.id)}
                          aria-label={`Excluir projeto ${project.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PAINEL DE DETALHE */}
        {selected && (
          <aside className="ot-mem-detail" aria-label={`Detalhes de ${memoryTitle(selected)}`}>
            <header>
              <span
                className="ot-mem-card-cat"
                style={{ ['--mem-color' as string]: selected.color || CATEGORY_META[(selected.category || 'LEARNED') as MemoryCategory].color }}
              >
                <span
                  className="ot-mem-dot"
                  style={{
                    background:
                      selected.color || CATEGORY_META[(selected.category || 'LEARNED') as MemoryCategory].color,
                  }}
                />
                {CATEGORY_META[(selected.category || 'LEARNED') as MemoryCategory].label}
              </span>
              <button
                type="button"
                className="ot-mem-icon-btn"
                onClick={() => setSelectedId(null)}
                aria-label="Fechar detalhes"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <h3>{memoryTitle(selected)}</h3>
            <p className="ot-mem-detail-body">{memoryBody(selected)}</p>

            {selected.tags && selected.tags.length > 0 && (
              <div className="ot-mem-detail-tags">
                {selected.tags.map((tag) => (
                  <span key={tag} className="ot-mem-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <dl className="ot-mem-detail-meta">
              <div>
                <dt>Chave</dt>
                <dd>{selected.key}</dd>
              </div>
              <div>
                <dt>Guardada</dt>
                <dd>{new Date(selected.createdAt).toLocaleString('pt-BR')}</dd>
              </div>
            </dl>

            <div className="ot-mem-detail-actions">
              <button type="button" className="ot-mem-primary" onClick={() => openInChat(selected)}>
                <MessageSquare className="w-3.5 h-3.5" /> Usar no chat
              </button>
              <button type="button" className="ot-mem-ghost" onClick={() => searchOnWeb(selected)}>
                <Globe className="w-3.5 h-3.5" /> Pesquisar
              </button>
              <button type="button" className="ot-mem-ghost" onClick={() => handleCopy(selected)}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
