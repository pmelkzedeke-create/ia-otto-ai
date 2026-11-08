import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Sparkles,
  MessageSquare,
  Globe,
  Brain,
  RotateCcw,
  Clock,
  CircleDot,
  Copy,
  Check,
  Activity,
  Layers,
  Tag,
  Compass,
} from 'lucide-react';
import { MemoryItem, MemoryCategory, OttoProject } from '../types/otto';
import { ApiBridge } from '../services/apiBridge';

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

interface BubbleNode {
  id: string;
  key: string;
  title: string;
  category: MemoryCategory;
  summary: string;
  color: string;
  radius: number;
  baseRadius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pulsePhase: number;
  tags: string[];
  createdAt: string;
  isSpecial?: boolean;
  iconType?: 'style' | 'time' | 'search' | 'knowledge' | 'default';
}

const CATEGORY_META: Record<
  MemoryCategory,
  { label: string; color: string; badgeBg: string; description: string }
> = {
  KNOWLEDGE: {
    label: 'O Que Eu Sei',
    color: '#e2e8f0', // Silver / Light Slate
    badgeBg: 'rgba(226, 232, 240, 0.15)',
    description: 'Comandos do sistema operacional, ferramentas em disco e capacidades',
  },
  LEARNED: {
    label: 'O Que Aprendi',
    color: '#cbd5e1', // Slate 300
    badgeBg: 'rgba(203, 213, 225, 0.15)',
    description: 'Estilo de conversa, gírias, preferências e contextos assimilados',
  },
  RESEARCH: {
    label: 'Do Que Pesquisei',
    color: '#94a3b8', // Slate 400
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    description: 'Tópicos explorados na web, histórico de buscas e interesses',
  },
  SYSTEM: {
    label: 'Rotina & Sistema',
    color: '#ffffff', // Pure White
    badgeBg: 'rgba(255, 255, 255, 0.2)',
    description: 'Horários de atividade do sistema, uptime e configurações fixas',
  },
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
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBubble, setSelectedBubble] = useState<BubbleNode | null>(null);
  const [viewMode, setViewMode] = useState<'BUBBLES' | 'LIST' | 'TEMPORARY' | 'PROJECTS'>('BUBBLES');
  const [isAdding, setIsAdding] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Scratchpad (Temporary Memory) State
  const [scratchpad, setScratchpad] = useState<Record<string, string>>({});
  const [newScratchKey, setNewScratchKey] = useState('');
  const [newScratchVal, setNewScratchVal] = useState('');

  // Projects State
  const [projects, setProjects] = useState<OttoProject[]>([]);
  const [isCreatingProj, setIsCreatingProj] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjColor, setNewProjColor] = useState('#e2e8f0');

  // New Memory Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('LEARNED');
  const [newSummary, setNewSummary] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<BubbleNode[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const hoveredBubbleRef = useRef<BubbleNode | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Load memories, scratchpad and projects from ApiBridge
  const loadAllData = async () => {
    try {
      const [memData, scratchData, projData] = await Promise.all([
        ApiBridge.getMemories(),
        ApiBridge.getScratchpad(),
        ApiBridge.getProjects(),
      ]);
      setMemories(memData);
      setScratchpad(scratchData);
      setProjects(projData);
    } catch {
      // Handled in ApiBridge fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const handleAddScratchpad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScratchKey.trim() || !newScratchVal.trim()) return;
    const updated = { ...scratchpad, [newScratchKey.trim()]: newScratchVal.trim() };
    setScratchpad(updated);
    setNewScratchKey('');
    setNewScratchVal('');
    await ApiBridge.setScratchpad({ [newScratchKey.trim()]: newScratchVal.trim() });
    onScratchpadChanged?.();
  };

  const handleDeleteScratchpad = async (key: string) => {
    const next = { ...scratchpad };
    delete next[key];
    setScratchpad(next);
    await ApiBridge.clearScratchpad();
    if (Object.keys(next).length > 0) {
      await ApiBridge.setScratchpad(next);
    }
    onScratchpadChanged?.();
  };

  const handleClearAllScratchpad = async () => {
    setScratchpad({});
    await ApiBridge.clearScratchpad();
    onScratchpadChanged?.();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    const res = await ApiBridge.createProject({
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      color: newProjColor,
    });
    if (res?.project) {
      setProjects((prev) => [...prev, res.project]);
      onSelectProject?.(res.project.id);
    }
    setNewProjName('');
    setNewProjDesc('');
    setIsCreatingProj(false);
  };

  const handleDeleteProject = async (projId: string) => {
    await ApiBridge.deleteProject(projId);
    setProjects((prev) => prev.filter((p) => p.id !== projId));
  };

  // Convert raw memories into fluid buoyant bubbles with organic floating physics
  useEffect(() => {
    const width = 800;
    const height = 500;

    const nodes: BubbleNode[] = memories.map((m, idx) => {
      const cat: MemoryCategory = m.category || 'LEARNED';
      const key = m.key.toLowerCase();

      let isSpecial = false;
      let iconType: BubbleNode['iconType'] = 'default';
      let radius = 38;

      if (key.includes('estilo') || key.includes('conversa')) {
        isSpecial = true;
        iconType = 'style';
        radius = 48;
      } else if (key.includes('rotina') || key.includes('horario') || key.includes('tempo')) {
        isSpecial = true;
        iconType = 'time';
        radius = 46;
      } else if (cat === 'RESEARCH') {
        iconType = 'search';
        radius = 36;
      } else if (cat === 'KNOWLEDGE') {
        iconType = 'knowledge';
        radius = 40;
      }

      // Distribute organically across canvas field
      const cols = Math.ceil(Math.sqrt(Math.max(4, memories.length)));
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const margin = 80;
      const spacingX = (width - margin * 2) / Math.max(1, cols);
      const spacingY = (height - margin * 2) / Math.max(1, Math.ceil(memories.length / cols));

      const initialX = margin + col * spacingX + (Math.random() - 0.5) * 40;
      const initialY = margin + row * spacingY + (Math.random() - 0.5) * 40;

      return {
        id: m.id,
        key: m.key,
        title: m.title || m.key.replace(/_/g, ' ').toUpperCase(),
        category: cat,
        summary: m.value || m.summary || '',
        color: m.color || CATEGORY_META[cat]?.color || '#ffffff',
        radius,
        baseRadius: radius,
        x: initialX,
        y: initialY,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        pulsePhase: Math.random() * Math.PI * 2,
        tags: m.tags || [cat.toLowerCase()],
        createdAt: m.createdAt,
        isSpecial,
        iconType,
      };
    });

    bubblesRef.current = nodes;
  }, [memories]);

  // Liquid Bubbles Canvas Animation with Magnetic Repel/Attract and Floating Physics
  useEffect(() => {
    if (!isOpen || viewMode !== 'BUBBLES') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 560);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Ambient floating caustics particles
    const caustics = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.35 + 0.1,
      speedY: -(Math.random() * 0.25 + 0.1),
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw ambient rising liquid particles
      caustics.forEach((c) => {
        c.y += c.speedY;
        if (c.y < -10) c.y = height + 10;

        ctx.fillStyle = `rgba(255, 255, 255, ${c.alpha})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const nodes = bubblesRef.current;
      const mouse = mousePosRef.current;

      // 2. Physics & Fluid Floating Simulation
      for (let i = 0; i < nodes.length; i++) {
        const b = nodes[i];
        b.pulsePhase += 0.02;

        // Gentle floating drift
        b.x += b.vx + Math.sin(b.pulsePhase * 0.7) * 0.25;
        b.y += b.vy + Math.cos(b.pulsePhase * 0.9) * 0.25;

        // Soft wall bouncing
        const pad = b.radius + 15;
        if (b.x < pad) {
          b.x = pad;
          b.vx *= -0.7;
        } else if (b.x > width - pad) {
          b.x = width - pad;
          b.vx *= -0.7;
        }
        if (b.y < pad) {
          b.y = pad;
          b.vy *= -0.7;
        } else if (b.y > height - pad) {
          b.y = height - pad;
          b.vy *= -0.7;
        }

        // Mouse magnetic reaction
        if (mouse) {
          const dx = b.x - mouse.x;
          const dy = b.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          const repelRadius = 140;

          if (dist < repelRadius && dist > 1) {
            const force = (repelRadius - dist) / repelRadius;
            b.x += (dx / dist) * force * 3.5;
            b.y += (dy / dist) * force * 3.5;
          }
        }

        // Bubble-to-bubble soft gentle repulsion
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = other.x - b.x;
          const dy = other.y - b.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b.radius + other.radius + 12;

          if (dist < minDist && dist > 0.1) {
            const overlap = (minDist - dist) * 0.35;
            const nx = dx / dist;
            const ny = dy / dist;
            b.x -= nx * overlap;
            b.y -= ny * overlap;
            other.x += nx * overlap;
            other.y += ny * overlap;
          }
        }
      }

      // 3. Render Each Liquid Glass Bubble
      nodes.forEach((b) => {
        const isHovered = hoveredBubbleRef.current?.id === b.id;
        const isSelected = selectedBubble?.id === b.id;
        const isDimmed = filterCategory !== 'ALL' && b.category !== filterCategory;

        const effectiveRadius = isHovered || isSelected ? b.baseRadius * 1.25 : b.baseRadius;
        const alpha = isDimmed ? 0.22 : 1.0;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Outer Ambient Glow
        const outerGlow = ctx.createRadialGradient(
          b.x,
          b.y,
          effectiveRadius * 0.5,
          b.x,
          b.y,
          effectiveRadius * 1.8
        );
        if (b.isSpecial) {
          outerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          outerGlow.addColorStop(0.6, 'rgba(200, 230, 255, 0.15)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          outerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          outerGlow.addColorStop(0.6, 'rgba(255, 255, 255, 0.04)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, effectiveRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Liquid Bubble Translucent Sphere Body
        const sphereGrad = ctx.createRadialGradient(
          b.x - effectiveRadius * 0.35,
          b.y - effectiveRadius * 0.35,
          effectiveRadius * 0.1,
          b.x,
          b.y,
          effectiveRadius
        );
        sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        sphereGrad.addColorStop(0.4, 'rgba(220, 230, 245, 0.18)');
        sphereGrad.addColorStop(0.85, 'rgba(15, 20, 30, 0.7)');
        sphereGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle Refractive Border Rim
        ctx.lineWidth = isHovered || isSelected ? 2.5 : b.isSpecial ? 2 : 1.2;
        ctx.strokeStyle =
          isHovered || isSelected
            ? 'rgba(255, 255, 255, 0.95)'
            : b.isSpecial
            ? 'rgba(255, 255, 255, 0.65)'
            : 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Specular Reflection Crescent (Top-Left Liquid Glint)
        const glintRadiusX = effectiveRadius * 0.5;
        const glintRadiusY = effectiveRadius * 0.25;
        ctx.save();
        ctx.translate(b.x - effectiveRadius * 0.32, b.y - effectiveRadius * 0.38);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 0, glintRadiusX, glintRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Secondary bottom soft caustic reflection
        ctx.save();
        ctx.translate(b.x + effectiveRadius * 0.25, b.y + effectiveRadius * 0.4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 0, effectiveRadius * 0.3, effectiveRadius * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Bubble Category Icon & Short Title
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Emoji / Symbol representation
        let iconSymbol = '🫧';
        if (b.iconType === 'style') iconSymbol = '💬';
        else if (b.iconType === 'time') iconSymbol = '⏰';
        else if (b.iconType === 'search') iconSymbol = '🔍';
        else if (b.iconType === 'knowledge') iconSymbol = '🧠';

        ctx.font = `${Math.round(effectiveRadius * 0.44)}px system-ui, sans-serif`;
        ctx.fillText(iconSymbol, b.x, b.y - 3);

        // Short title inside/underneath bubble
        ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = isHovered || isSelected ? '#ffffff' : 'rgba(240, 245, 255, 0.9)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;

        const maxChars = 14;
        const displayTitle =
          b.title.length > maxChars ? b.title.slice(0, maxChars) + '…' : b.title;
        ctx.fillText(displayTitle, b.x, b.y + effectiveRadius + 14);

        ctx.restore();
      });

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      mousePosRef.current = { x: mouseX, y: mouseY };

      let found: BubbleNode | null = null;
      for (const b of bubblesRef.current) {
        const dist = Math.hypot(mouseX - b.x, mouseY - b.y);
        if (dist <= b.radius * 1.25) {
          found = b;
          break;
        }
      }

      hoveredBubbleRef.current = found;
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    const handleMouseLeave = () => {
      mousePosRef.current = null;
      hoveredBubbleRef.current = null;
      if (canvas) canvas.style.cursor = 'default';
    };

    const handleClick = () => {
      if (hoveredBubbleRef.current) {
        setSelectedBubble(hoveredBubbleRef.current);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      mousePosRef.current = { x: touchX, y: touchY };

      let found: BubbleNode | null = null;
      for (const b of bubblesRef.current) {
        const dist = Math.hypot(touchX - b.x, touchY - b.y);
        if (dist <= Math.max(b.radius * 1.4, 30)) {
          found = b;
          break;
        }
      }

      if (found) {
        hoveredBubbleRef.current = found;
        setSelectedBubble(found);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouchStart);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isOpen, viewMode, filterCategory, selectedBubble]);

  // Filtered List
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const cat = m.category || 'LEARNED';
      const matchesCat = filterCategory === 'ALL' || cat === filterCategory;
      const matchesQuery =
        searchQuery === '' ||
        (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.value || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesQuery;
    });
  }, [memories, filterCategory, searchQuery]);

  // Create New Memory
  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newKey = newTitle
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30);

    const newItem: MemoryItem = {
      id: `mem_${Date.now()}`,
      key: newKey,
      title: newTitle.trim(),
      category: newCategory,
      value: newSummary.trim() || newTitle.trim(),
      color: CATEGORY_META[newCategory]?.color || '#ffffff',
      tags: [newCategory.toLowerCase()],
      createdAt: new Date().toISOString(),
    };

    const res = await ApiBridge.saveMemory(newKey, newItem.value, {
      title: newItem.title,
      category: newItem.category,
      color: newItem.color,
      tags: newItem.tags,
    });

    if (Array.isArray(res) && res.length > 0) {
      setMemories(res);
    } else {
      setMemories((prev) => [newItem, ...prev]);
    }

    setNewTitle('');
    setNewSummary('');
    setIsAdding(false);
    onMemoryChanged?.();
  };

  const handleDeleteMemory = async (id: string) => {
    const res = await ApiBridge.deleteMemory(id);
    if (Array.isArray(res)) {
      setMemories(res);
    } else {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
    if (selectedBubble?.id === id) {
      setSelectedBubble(null);
    }
    onMemoryChanged?.();
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 liquid-glass-overlay font-sans select-none">
      <div className="relative w-full max-w-5xl h-[88vh] rounded-[32px] liquid-glass-modal liquid-refraction flex flex-col overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
        {/* HEADER / TOOLBAR */}
        <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-b border-white/10 bg-white/[0.04] backdrop-blur-2xl flex items-center justify-between z-20 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <span className="text-base">🫧</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Memória Líquida & Bolhas de Contexto
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-slate-200 font-semibold shrink-0">
                  {memories.length} Bolhas Vivas
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium hidden sm:block truncate mt-0.5">
                Bolhas orgânicas que aprendem seu estilo de conversa, horários de atividade e pesquisas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-black/60 p-1 rounded-full border border-white/15 overflow-x-auto shadow-inner">
              <button
                onClick={() => setViewMode('BUBBLES')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'BUBBLES'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🫧 Bolhas</span>
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'LIST'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Grade
              </button>
              <button
                onClick={() => setViewMode('TEMPORARY')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'TEMPORARY'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Temporária</span>
                {Object.keys(scratchpad).length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setViewMode('PROJECTS')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'PROJECTS'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Projetos
              </button>
            </div>

            {/* Add memory bubble button */}
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3.5 py-1.5 rounded-full bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
              title="Adicionar nova bolha de conhecimento"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Bolha</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
              title="Fechar janela de memória"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SUBHEADER: CATEGORY FILTER CHIPS & SEARCH */}
        <div className="px-5 sm:px-8 py-2.5 bg-black/40 border-b border-white/[0.08] flex items-center justify-between gap-3 flex-wrap shrink-0 z-20">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'ALL'
                  ? 'bg-white text-slate-950 font-bold shadow-sm'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300'
              }`}
            >
              Todas as Bolhas ({memories.length})
            </button>

            {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const count = memories.filter((m) => (m.category || 'LEARNED') === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    filterCategory === cat
                      ? 'bg-white text-slate-950 font-bold shadow-sm'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span>{meta.label}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em todas as bolhas..."
              className="w-full pl-8 pr-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white transition-all font-sans"
            />
          </div>
        </div>

        {/* NEW MEMORY BUBBLE DRAWER */}
        {isAdding && (
          <form
            onSubmit={handleCreateMemory}
            className="p-5 bg-black/80 border-b border-white/15 animate-fade-in flex flex-col gap-3 shrink-0 z-30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                Criar Nova Bolha de Memória
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título do Tópico (ex: Preferência de Código, Projeto X)"
                className="col-span-2 px-3.5 py-2 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white"
                required
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none"
              >
                <option value="LEARNED">O Que Aprendi (Conversa & Estilo)</option>
                <option value="KNOWLEDGE">O Que Eu Sei (Comandos & Sistema)</option>
                <option value="RESEARCH">Do Que Pesquisei (Interesses & Web)</option>
                <option value="SYSTEM">Rotina & Sistema (Preferências Fixas)</option>
              </select>
            </div>

            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Conteúdo que o OTTO deve lembrar (ex: O usuário prefere scripts em TypeScript ao invés de JavaScript puro)..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white"
            />

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer shadow-md"
              >
                Salvar Bolha
              </button>
            </div>
          </form>
        )}

        {/* MAIN BODY AREA */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {viewMode === 'BUBBLES' && (
            <div className="relative w-full h-full">
              {/* Interactive Liquid Canvas */}
              <canvas ref={canvasRef} className="w-full h-full block cursor-default" />

              {/* Floating Instructions & Status Pill */}
              <div className="absolute bottom-4 left-6 pointer-events-none">
                <div className="backdrop-blur-xl bg-black/60 border border-white/15 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-[11px] text-slate-300 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>
                    Toque ou passe o cursor sobre as bolhas para inspecionar • O OTTO assimila seu estilo dinamicamente
                  </span>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'LIST' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredMemories.map((m) => {
                  const cat = m.category || 'LEARNED';
                  const meta = CATEGORY_META[cat];
                  return (
                    <div
                      key={m.id}
                      onClick={() =>
                        setSelectedBubble({
                          id: m.id,
                          key: m.key,
                          title: m.title || m.key,
                          category: cat,
                          summary: m.value || m.summary || '',
                          color: m.color || meta.color,
                          radius: 38,
                          baseRadius: 38,
                          x: 0,
                          y: 0,
                          vx: 0,
                          vy: 0,
                          pulsePhase: 0,
                          tags: m.tags || [],
                          createdAt: m.createdAt,
                        })
                      }
                      className="p-4 rounded-2xl glass-medium border border-white/[0.12] hover:border-white/40 transition-all cursor-pointer shadow-md group flex flex-col justify-between gap-3 active:scale-[0.98]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10"
                            style={{
                              backgroundColor: meta.badgeBg,
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {m.title || m.key}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                          {m.value || m.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[11px] text-slate-400">
                        <span className="font-mono text-[10px]">#{m.key}</span>
                        <span className="text-xs group-hover:translate-x-1 transition-transform text-white">
                          Inspecionar →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'TEMPORARY' && (
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Memória Temporária da Tarefa (Scratchpad)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Armazenamento volátil para variáveis e notas da conversa atual. É limpo após concluir a sessão.
                  </p>
                </div>
                {Object.keys(scratchpad).length > 0 && (
                  <button
                    onClick={handleClearAllScratchpad}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-medium cursor-pointer transition-all active:scale-95"
                  >
                    Limpar Tudo
                  </button>
                )}
              </div>

              {/* Add form */}
              <form onSubmit={handleAddScratchpad} className="flex gap-2">
                <input
                  type="text"
                  value={newScratchKey}
                  onChange={(e) => setNewScratchKey(e.target.value)}
                  placeholder="Chave (ex: pasta_alvo)"
                  className="w-1/3 px-3.5 py-2 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white"
                />
                <input
                  type="text"
                  value={newScratchVal}
                  onChange={(e) => setNewScratchVal(e.target.value)}
                  placeholder="Valor (ex: /workspace/relatorio_2026.pdf)"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer shrink-0"
                >
                  Adicionar
                </button>
              </form>

              {/* Items */}
              <div className="space-y-2">
                {Object.keys(scratchpad).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Nenhuma anotação temporária ativa. Você pode falar "OTTO, lembre temporariamente que ..."
                  </div>
                ) : (
                  Object.entries(scratchpad).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-300 font-semibold">{k}:</span>
                        <span className="text-slate-200">{v}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteScratchpad(k)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer"
                        title="Remover chave temporária"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {viewMode === 'PROJECTS' && (
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Projetos & Workspaces Isolados</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Contextos específicos para agrupar comandos, arquivos no computador e memórias de tarefas.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingProj(!isCreatingProj)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-medium cursor-pointer transition-all active:scale-95"
                >
                  + Novo Projeto
                </button>
              </div>

              {isCreatingProj && (
                <form
                  onSubmit={handleCreateProject}
                  className="p-4 rounded-2xl bg-black/80 border border-white/15 flex flex-col gap-3"
                >
                  <input
                    type="text"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="Nome do Projeto (ex: App Mobile, Automação de Dados)"
                    className="px-3.5 py-2 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    placeholder="Descrição breve e objetivos..."
                    className="px-3.5 py-2 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProj(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-white text-slate-950 font-bold text-xs"
                    >
                      Criar Projeto
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject?.(proj.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      activeProjectId === proj.id
                        ? 'bg-white/15 border-white shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: proj.color || '#cbd5e1' }}
                        />
                        {activeProjectId === proj.id && (
                          <span className="text-[10px] font-mono bg-white text-black px-2 py-0.5 rounded-full font-bold">
                            Ativo
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white">{proj.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {proj.description || 'Sem descrição.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[10px] text-slate-500">
                      <span>{proj.folderPath ? `/${proj.folderPath}` : 'Workspace Geral'}</span>
                      {proj.id !== 'proj_default' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(proj.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INSPECTION GLASS MODAL CARD (When clicking a bubble) */}
          {selectedBubble && (
            <div className="absolute inset-y-0 right-0 w-full sm:w-[420px] glass-strong border-l border-white/20 p-6 flex flex-col justify-between shadow-2xl z-40 animate-slide-left overflow-y-auto">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-white/15"
                      style={{
                        backgroundColor: CATEGORY_META[selectedBubble.category]?.badgeBg,
                        color: CATEGORY_META[selectedBubble.category]?.color,
                      }}
                    >
                      {CATEGORY_META[selectedBubble.category]?.label}
                    </span>
                    {selectedBubble.isSpecial && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Aprendido em Conversa
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedBubble(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                  {selectedBubble.title}
                </h3>

                <div className="p-4 rounded-2xl bg-white/[0.06] border border-white/10 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap mb-4 shadow-inner">
                  {selectedBubble.summary}
                </div>

                <div className="space-y-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Identificador:</span>
                    <span className="text-slate-200">#{selectedBubble.key}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Registrado em:</span>
                    <span className="text-slate-200">
                      {new Date(selectedBubble.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {selectedBubble.tags && selectedBubble.tags.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1">
                      {selectedBubble.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-slate-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => {
                    onSelectTopicForChat?.(`Explique mais sobre ${selectedBubble.title} da sua memória.`);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-full bg-white text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Conversar Sobre Isso com o OTTO</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSearchTopic?.(selectedBubble.title);
                      onClose();
                    }}
                    className="py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Pesquisar Web</span>
                  </button>

                  <button
                    onClick={() => handleCopyText(selectedBubble.summary, selectedBubble.id)}
                    className="py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    {copiedKey === selectedBubble.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteMemory(selectedBubble.id)}
                  className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Bolha Permanentemente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
