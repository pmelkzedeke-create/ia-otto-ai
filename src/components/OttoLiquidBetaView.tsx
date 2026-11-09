import React, { useRef, useEffect, useState } from 'react';
import {
  Cpu,
  HardDrive,
  Battery,
  Wifi,
  Clock,
  MessageSquare,
  Check,
  Send,
  Mic,
  Settings,
  Power,
  FileVideo,
  Search,
  Zap,
  Activity,
  X,
  Plus,
  History,
  Palette,
  ArrowLeft,
  Volume2,
  Copy,
  Trash2,
  Sparkles,
  Move,
  Filter,
  RotateCcw,
  CornerDownLeft,
  Globe,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { OttoState, ActivityItem, ChatMessage, SystemTelemetry, OttoSettings, AgentTaskPlan } from '../types/otto';
import { ApiBridge } from '../services/apiBridge';

import { OttoLiquidMascot } from './OttoLiquidMascot';
import { ArtifactViewer } from './ArtifactViewer';
import { KnowledgeCardViewer } from './KnowledgeCardViewer';
import { ArticleReaderModal } from './ArticleReaderModal';
import { OttoImageCard } from './OttoImageCard';
import { OttoImageGallery } from './OttoImageGallery';
import { DraggableWindow } from './DraggableWindow';
import { OttoHologram, OttoHologramContent } from './hologram';
import { DataHubChatCard } from './datahub/DataHubChatCard';
import { DataHubStorage } from '../services/dataHubStorage';
import { OttoThinking, OttoTyping } from './OttoAnimation';
import { ttsEngine } from '../services/ttsEngine';

export type ChatTheme = 'silver' | 'chrome' | 'monochrome' | 'slate' | 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose';

interface ChatThemeConfig {
  id: ChatTheme;
  name: string;
  dotColor: string;
  accentText: string;
  userBubbleGrad: string;
  buttonGrad: string;
  glowBorder: string;
  activeRing: string;
}

const CHAT_THEMES: Record<ChatTheme, ChatThemeConfig> = {
  silver: {
    id: 'silver',
    name: 'Prata Metálico',
    dotColor: '#f1f5f9',
    accentText: 'text-slate-100',
    userBubbleGrad: 'bg-gradient-to-r from-slate-200 via-white to-slate-300 text-slate-950 font-bold border-white/60 shadow-[0_4px_16px_rgba(255,255,255,0.25)]',
    buttonGrad: 'bg-white hover:bg-slate-200 text-slate-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)]',
    glowBorder: 'border-white/50',
    activeRing: 'ring-2 ring-white',
  },
  chrome: {
    id: 'chrome',
    name: 'Cromo Reluzente',
    dotColor: '#cbd5e1',
    accentText: 'text-white',
    userBubbleGrad: 'bg-gradient-to-r from-zinc-300 via-slate-100 to-zinc-400 text-slate-950 font-bold border-white/80 shadow-[0_4px_16px_rgba(255,255,255,0.3)]',
    buttonGrad: 'bg-slate-200 hover:bg-white text-slate-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)]',
    glowBorder: 'border-white/60',
    activeRing: 'ring-2 ring-white',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Preto & Branco',
    dotColor: '#ffffff',
    accentText: 'text-white',
    userBubbleGrad: 'bg-white text-black font-bold border-white shadow-[0_4px_16px_rgba(255,255,255,0.3)]',
    buttonGrad: 'bg-white hover:bg-slate-200 text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.5)]',
    glowBorder: 'border-white',
    activeRing: 'ring-2 ring-white',
  },
  slate: {
    id: 'slate',
    name: 'Titânio Escuro',
    dotColor: '#94a3b8',
    accentText: 'text-slate-200',
    userBubbleGrad: 'bg-gradient-to-r from-slate-700 via-slate-600 to-zinc-700 text-white border-slate-400/40 shadow-[0_4px_16px_rgba(255,255,255,0.15)]',
    buttonGrad: 'bg-slate-100 hover:bg-white text-slate-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]',
    glowBorder: 'border-slate-400/50',
    activeRing: 'ring-2 ring-slate-300',
  },
  cyan: {
    id: 'cyan',
    name: 'Prata Reluzente',
    dotColor: '#f1f5f9',
    accentText: 'text-slate-100',
    userBubbleGrad: 'bg-gradient-to-r from-slate-100 via-white to-slate-300 text-slate-950 font-bold border-white/60 shadow-[0_4px_16px_rgba(255,255,255,0.3)]',
    buttonGrad: 'bg-white hover:bg-slate-200 text-slate-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)]',
    glowBorder: 'border-white/50',
    activeRing: 'ring-2 ring-white',
  },
  emerald: {
    id: 'emerald',
    name: 'Grafite Prateado',
    dotColor: '#cbd5e1',
    accentText: 'text-slate-200',
    userBubbleGrad: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 font-bold border-white/50 shadow-[0_4px_16px_rgba(255,255,255,0.2)]',
    buttonGrad: 'bg-slate-100 hover:bg-white text-slate-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]',
    glowBorder: 'border-slate-300/50',
    activeRing: 'ring-2 ring-slate-200',
  },
  purple: {
    id: 'purple',
    name: 'Monocromático Prata',
    dotColor: '#e2e8f0',
    accentText: 'text-white',
    userBubbleGrad: 'bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 text-slate-950 font-bold border-white/60 shadow-[0_4px_16px_rgba(255,255,255,0.25)]',
    buttonGrad: 'bg-white hover:bg-slate-200 text-slate-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)]',
    glowBorder: 'border-white/50',
    activeRing: 'ring-2 ring-white',
  },
  amber: {
    id: 'amber',
    name: 'Prata Espelhado',
    dotColor: '#ffffff',
    accentText: 'text-white',
    userBubbleGrad: 'bg-gradient-to-r from-slate-100 to-white text-slate-950 font-bold border-white shadow-[0_4px_16px_rgba(255,255,255,0.35)]',
    buttonGrad: 'bg-white hover:bg-slate-100 text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.5)]',
    glowBorder: 'border-white',
    activeRing: 'ring-2 ring-white',
  },
  rose: {
    id: 'rose',
    name: 'Platina Metálica',
    dotColor: '#f8fafc',
    accentText: 'text-slate-100',
    userBubbleGrad: 'bg-gradient-to-r from-slate-300 via-white to-slate-200 text-slate-950 font-bold border-white/80 shadow-[0_4px_16px_rgba(255,255,255,0.3)]',
    buttonGrad: 'bg-slate-100 hover:bg-white text-slate-950 font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)]',
    glowBorder: 'border-white/60',
    activeRing: 'ring-2 ring-white',
  },
};

interface HistorySession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

interface OttoLiquidBetaViewProps {
  state: OttoState;
  isListening: boolean;
  isSpeaking: boolean;
  toggleListening: () => void;
  activities: ActivityItem[];
  systemInfo: SystemTelemetry | null;
  currentTime: string;
  chatMessages: ChatMessage[];
  setChatMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  textInput: string;
  setTextInput: (v: string) => void;
  handleChatSubmit: (e: React.FormEvent) => void;
  handleProcessCommand: (cmd: string, options?: any) => void;
  settings: OttoSettings;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  onOpenDataHub?: () => void;
  activePlan?: AgentTaskPlan | null;
  interimTranscript?: string;
}

const HighlightedText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={i}
            className="bg-white/30 text-white font-bold px-1 py-0.5 rounded border border-white/50 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const SegmentedMeter: React.FC<{ activeSegments: number; totalSegments?: number; isLight?: boolean }> = ({
  activeSegments,
  totalSegments = 12,
  isLight = false,
}) => {
  return (
    <div className="flex items-center gap-[3px] px-1">
      {Array.from({ length: totalSegments }).map((_, i) => {
        const isActive = i < activeSegments;
        return (
          <span
            key={i}
            className={`w-[3px] h-[13px] rounded-full transition-all duration-300 ${
              isActive
                ? isLight
                  ? 'bg-slate-950 shadow-[0_0_5px_rgba(0,0,0,0.35)]'
                  : 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.85)]'
                : isLight
                ? 'bg-slate-300/80'
                : 'bg-slate-700/40'
            }`}
          />
        );
      })}
    </div>
  );
};

export type OttoLiquidViewProps = OttoLiquidBetaViewProps;

export const OttoLiquidView: React.FC<OttoLiquidViewProps> = ({
  state,
  isListening,
  isSpeaking,
  toggleListening,
  activities,
  systemInfo,
  currentTime,
  chatMessages,
  setChatMessages,
  textInput,
  setTextInput,
  handleChatSubmit,
  handleProcessCommand,
  settings,
  onOpenSettings,
  onOpenMemory,
  onOpenDataHub,
  activePlan,
  interimTranscript,
}) => {
  const isLight = settings.themeAppearance === 'light' || settings.themeMode === 'liquid-light';
  const iconStroke = isLight ? 2.25 : 1.6;

  const [showSystemPanel, setShowSystemPanel] = useState<boolean>(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState<boolean>(false);
  const [isWindowDragOver, setIsWindowDragOver] = useState<boolean>(false);

  const handleWindowDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsWindowDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const uploadedFiles = await DataHubStorage.uploadFiles(Array.from(e.dataTransfer.files));
      if (setChatMessages && uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map((f) => f.name).join(', ');
        const userMsg: ChatMessage = {
          id: `msg_u_${Date.now()}`,
          sender: 'user',
          text: `Enviei ${uploadedFiles.length} arquivo(s) para o Data Hub: ${fileNames}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        const ottoMsg: ChatMessage = {
          id: `msg_o_${Date.now() + 1}`,
          sender: 'otto',
          text: `Recebi e indexei ${uploadedFiles.length} arquivo(s) no OTTO Data Hub. Já extraí os metadados e o conteúdo textual compatível. Posso ler, resumir, analisar inconsistências, comparar ou organizar. Como deseja começar?`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          dataHubFiles: uploadedFiles,
        };
        setChatMessages((prev) => [...prev, userMsg, ottoMsg]);
        setIsChatFullscreen(true);
      }
    }
  };

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'otto' | 'actions'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);

  // Attachment state for chat input (image & file uploads for vision and processing)
  const [mediaEngine, setMediaEngine] = useState<{
    available: boolean;
    version: string | null;
    hint?: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    ApiBridge.getMediaStatus()
      .then((status) => {
        if (!alive || !status) return;
        setMediaEngine({ available: status.available, version: status.version, hint: status.hint });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [attachedImage, setAttachedImage] = useState<{
    dataUrl: string;
    name: string;
    size?: number;
    mimeType?: string;
  } | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChatFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const isImg = file.type.startsWith('image/');
      if (isImg) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedImage({
            dataUrl: reader.result as string,
            name: file.name,
            size: file.size,
            mimeType: file.type,
          });
        };
        reader.readAsDataURL(file);
      } else {
        DataHubStorage.uploadFiles([file]).then((uploaded) => {
          if (uploaded.length > 0) {
            handleProcessCommand(`Enviei o arquivo "${file.name}" para o Data Hub. Por favor, analise o conteúdo para mim.`);
          }
        });
      }
      e.target.value = '';
    }
  };

  const handleChatPaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedImage({
            dataUrl: reader.result as string,
            name: file.name || 'Captura de tela colada',
            size: file.size,
            mimeType: file.type,
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const onCustomChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !attachedImage) return;
    const currentAttachment = attachedImage;
    const currentText = textInput.trim();
    setAttachedImage(null);
    setTextInput('');
    handleProcessCommand(currentText, currentAttachment ? { attachedImage: currentAttachment } : undefined);
  };
  const [chatTheme, setChatTheme] = useState<ChatTheme>(() => {
    try {
      return (localStorage.getItem('otto_chat_theme') as ChatTheme) || 'silver';
    } catch {
      return 'silver';
    }
  });

  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const [orbPos, setOrbPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingOrb, setIsDraggingOrb] = useState<boolean>(false);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    orbX: number;
    orbY: number;
    moved: boolean;
  }>({
    mouseX: 0,
    mouseY: 0,
    orbX: 0,
    orbY: 0,
    moved: false,
  });

  const [savedSessions, setSavedSessions] = useState<HistorySession[]>(() => {
    try {
      const stored = localStorage.getItem('otto_chat_history_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isChatFullscreen && !isSearchOpen && !searchQuery.trim() && filterType === 'all') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatFullscreen, isSearchOpen, searchQuery, filterType]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isChatFullscreen && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        if (searchQuery.trim()) {
          setSearchQuery('');
        } else {
          setIsSearchOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatFullscreen, isSearchOpen, searchQuery]);

  const filteredChatMessages = chatMessages.filter((msg) => {
    if (filterType === 'user' && msg.sender !== 'user') return false;
    if (filterType === 'otto' && msg.sender !== 'otto') return false;
    if (filterType === 'actions') {
      const hasAction = msg.actions && msg.actions.length > 0 && msg.actions.some((a) => a.action !== 'none');
      if (!hasAction) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const textMatch = msg.text.toLowerCase().includes(q);
      const actionMatch = msg.actions?.some(
        (a) =>
          a.action?.toLowerCase().includes(q) ||
          a.target?.toLowerCase().includes(q) ||
          (a.reasoning && a.reasoning.toLowerCase().includes(q))
      );
      if (!textMatch && !actionMatch) return false;
    }

    return true;
  });

  const filteredSavedSessions = savedSessions.filter((session) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase().trim();
    const titleMatch = session.title.toLowerCase().includes(q);
    const contentMatch = session.messages.some((m) => m.text.toLowerCase().includes(q));
    return titleMatch || contentMatch;
  });

  useEffect(() => {
    const handleResize = () => {
      if (orbPos) {
        setOrbPos((prev) => {
          if (!prev) return null;
          return {
            x: Math.max(16, Math.min(window.innerWidth - 110, prev.x)),
            y: Math.max(68, Math.min(window.innerHeight - 110, prev.y)),
          };
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [orbPos]);

  const currentTheme = CHAT_THEMES[chatTheme] || CHAT_THEMES.silver;

  const handleSelectTheme = (theme: ChatTheme) => {
    setChatTheme(theme);
    try {
      localStorage.setItem('otto_chat_theme', theme);
    } catch {}
    setShowThemePicker(false);
  };

  const handleNewChat = () => {
    if (chatMessages.length > 1 && setChatMessages) {
      const firstUser = chatMessages.find((m) => m.sender === 'user');
      const title = firstUser ? firstUser.text.slice(0, 36) : 'Nova Conversa';

      const newSession: HistorySession = {
        id: `session_${Date.now()}`,
        title,
        timestamp: 'Hoje',
        messages: [...chatMessages],
      };

      const updated = [newSession, ...savedSessions.slice(0, 19)];
      setSavedSessions(updated);
      try {
        localStorage.setItem('otto_chat_history_v1', JSON.stringify(updated));
      } catch {}
    }

    if (setChatMessages) {
      setChatMessages([
        {
          id: `msg_${Date.now()}`,
          sender: 'otto',
          text: 'Novo chat iniciado. Como posso ajudar você agora?',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    setShowHistoryDrawer(false);
  };

  const handleLoadSession = (session: HistorySession) => {
    if (setChatMessages) {
      setChatMessages(session.messages);
    }
    setShowHistoryDrawer(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSessions.filter((s) => s.id !== id);
    setSavedSessions(updated);
    try {
      localStorage.setItem('otto_chat_history_v1', JSON.stringify(updated));
    } catch {}
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleOrbPointerDown = (e: React.PointerEvent) => {
    if (!isChatFullscreen) return;
    e.preventDefault();

    const currentX = orbPos?.x ?? (window.innerWidth - 124);
    const currentY = orbPos?.y ?? (window.innerHeight - 124);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      orbX: currentX,
      orbY: currentY,
      moved: false,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStartRef.current.mouseX;
      const dy = ev.clientY - dragStartRef.current.mouseY;

      if (!dragStartRef.current.moved && Math.hypot(dx, dy) > 4) {
        dragStartRef.current.moved = true;
        setIsDraggingOrb(true);
      }

      if (dragStartRef.current.moved) {
        const nextX = Math.max(12, Math.min(window.innerWidth - 108, dragStartRef.current.orbX + dx));
        const nextY = Math.max(68, Math.min(window.innerHeight - 108, dragStartRef.current.orbY + dy));
        setOrbPos({ x: nextX, y: nextY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (!dragStartRef.current.moved) {
        toggleListening();
      }
      setIsDraggingOrb(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const [readerModal, setReaderModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    content?: string;
  }>({
    isOpen: false,
    title: '',
    url: '',
    content: '',
  });

  const latestKnowledgeCard = chatMessages
    .slice()
    .reverse()
    .find((m) => m.sender === 'otto' && m.knowledgeCard)?.knowledgeCard;

  const latestHolographicImages = chatMessages
    .slice()
    .reverse()
    .find((m) => m.sender === 'otto' && m.images && m.images.length > 0)?.images;

  const [showHoloProjection, setShowHoloProjection] = useState<boolean>(true);

  // Auto-show holographic projection whenever new images arrive
  useEffect(() => {
    if (latestHolographicImages && latestHolographicImages.length > 0) {
      setShowHoloProjection(true);
    }
  }, [latestHolographicImages]);

  const cores = systemInfo?.cpuCores ? `${systemInfo.cpuCores} cores` : '2 cores';
  const mem = systemInfo?.totalMemoryBytes
    ? `${Math.round(systemInfo.totalMemoryBytes / (1024 * 1024 * 1024))} GB`
    : '4 GB';

  const defaultLiquidChips = [
    { label: 'Pesquisar na Web', query: 'Pesquise as últimas notícias sobre inteligência artificial', icon: Search },
    { label: 'Tocar no YouTube', query: 'Toque uma música relaxante no YouTube', icon: FileVideo },
    { label: 'Programação & Código', query: 'Crie uma calculadora moderna em Python', icon: Sparkles },
    { label: 'Status do Sistema', query: 'Qual o status e desempenho do sistema?', icon: Zap },
  ];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsWindowDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsWindowDragOver(false);
        }
      }}
      onDrop={handleWindowDrop}
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none font-sans transition-colors duration-300 ${
        isLight ? 'otto-light-bg text-slate-900 theme-light' : 'bg-[#090a0d] text-white'
      }`}
    >
      {/* Global Drag and Drop Ingestion Overlay */}
      {isWindowDragOver && (
        <div className="absolute inset-0 z-50 bg-cyan-950/80 backdrop-blur-xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
          <HardDrive className="w-16 h-16 text-cyan-300 animate-bounce mb-3" strokeWidth={iconStroke} />
          <h2 className="text-xl font-bold text-white font-mono mb-1">
            Solte no OTTO Data Hub
          </h2>
          <p className="text-sm text-cyan-200 font-mono">
            O OTTO irá indexar, analisar o conteúdo e disponibilizar no espaço de trabalho
          </p>
        </div>
      )}

      {/* Studio Lighting Background Vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: isLight
            ? 'radial-gradient(ellipse 75% 70% at 50% 26%, rgba(255, 255, 255, 0.98) 0%, rgba(244, 247, 255, 0.72) 55%, rgba(238, 242, 252, 0.35) 78%, transparent 100%)'
            : isChatFullscreen
            ? 'radial-gradient(ellipse 80% 80% at 50% 20%, rgba(40, 44, 52, 0.45) 0%, rgba(18, 20, 26, 0.85) 60%, #08090c 100%)'
            : 'radial-gradient(ellipse 70% 65% at 50% 40%, rgba(100, 110, 125, 0.4) 0%, rgba(40, 44, 52, 0.75) 45%, rgba(18, 20, 25, 0.98) 85%, #08090c 100%)',
        }}
      />

      {/* Ambient Silver Caustic Glows behind Mascot */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isChatFullscreen ? 'opacity-20' : 'opacity-100'
        }`}
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(255, 255, 255, 0.92) 0%, rgba(199, 210, 254, 0.32) 42%, rgba(186, 230, 253, 0.18) 62%, transparent 78%)'
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(200, 210, 225, 0.04) 50%, transparent 75%)',
        }}
      />

      {/* 1. TOP BAR */}
      <header className={`relative w-full px-3 sm:px-8 py-2.5 sm:py-4 flex items-center justify-between z-30 shrink-0 border-b gap-1.5 sm:gap-4 overflow-hidden transition-all ${
        isLight
          ? 'ot-border glass-medium-white text-slate-900'
          : 'border-white/[0.12] glass-medium text-white'
      }`}>
        {/* Left Side: O T T O + Controls / Fullscreen Chat Controls */}
        <div className="flex items-center gap-1.5 sm:gap-4 min-w-0 overflow-x-auto scrollbar-none py-0.5">
          <span className={`text-xs sm:text-base font-extrabold tracking-[0.2em] sm:tracking-[0.45em] whitespace-nowrap shrink-0 ${
            isLight
              ? 'text-slate-950 drop-shadow-sm'
              : 'text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
          }`}>
            O T T O
          </span>

          {!isChatFullscreen ? (
            <button
              onClick={() => setShowSystemPanel((prev) => !prev)}
              className={`group relative px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-sans font-medium transition-all duration-300 cursor-pointer active:scale-95 ${
                isLight
                  ? showSystemPanel
                    ? 'bg-slate-950 text-white shadow-md border border-slate-950'
                    : 'bg-white/80 border ot-border text-slate-900 hover:bg-white shadow-sm'
                  : showSystemPanel
                  ? 'bg-white/20 border-white/80 text-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'text-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.3)] liquid-glass-btn'
              }`}
              title="Abrir/Fechar Atividade e Status do Sistema"
            >
              <Activity
                strokeWidth={iconStroke}
                fill={isLight && showSystemPanel ? 'currentColor' : 'none'}
                className={`w-3.5 h-3.5 transition-colors ${
                  isLight
                    ? showSystemPanel ? 'text-white' : 'text-slate-900'
                    : showSystemPanel ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span className="hidden sm:inline">Atividade & Sistema</span>
              <span className="sm:hidden">Sistema</span>
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  showSystemPanel
                    ? isLight ? 'bg-white' : 'bg-white shadow-[0_0_6px_#ffffff]'
                    : isLight ? 'bg-slate-400' : 'bg-slate-500'
                }`}
              />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2.5 animate-fade-in shrink-0">
              <button
                onClick={handleNewChat}
                className={`rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap ${
                  isLight
                    ? 'bg-slate-950 text-white hover:bg-black border border-slate-950'
                    : 'liquid-glass-btn text-white'
                }`}
                title="Começar um novo chat limpo"
              >
                <Plus strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo chat</span>
              </button>

              <button
                onClick={() => setShowHistoryDrawer((prev) => !prev)}
                className={`rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap ${
                  isLight
                    ? showHistoryDrawer
                      ? 'bg-slate-950 text-white border border-slate-950'
                      : 'bg-white/80 border ot-border text-slate-900 hover:bg-white'
                    : showHistoryDrawer
                    ? 'bg-white/25 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                    : 'text-slate-200 liquid-glass-btn'
                }`}
                title="Ver histórico de conversas salvas"
              >
                <History
                  strokeWidth={iconStroke}
                  fill={isLight && showHistoryDrawer ? 'currentColor' : 'none'}
                  className="w-3.5 h-3.5"
                />
                <span className="hidden sm:inline">Histórico</span>
              </button>

              <button
                onClick={() => {
                  setIsSearchOpen((prev) => !prev);
                  if (isSearchOpen) {
                    setSearchQuery('');
                    setFilterType('all');
                  }
                }}
                className={`rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap ${
                  isLight
                    ? isSearchOpen || searchQuery.trim() || filterType !== 'all'
                      ? 'bg-slate-950 text-white border border-slate-950'
                      : 'bg-white/80 border ot-border text-slate-900 hover:bg-white'
                    : isSearchOpen || searchQuery.trim() || filterType !== 'all'
                    ? 'bg-white/25 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.35)] ring-1 ring-white/50'
                    : 'text-slate-200 liquid-glass-btn'
                }`}
                title="Buscar comandos no histórico (Ctrl+F)"
              >
                <Search
                  strokeWidth={iconStroke}
                  fill={isLight && isSearchOpen ? 'currentColor' : 'none'}
                  className="w-3.5 h-3.5"
                />
                <span className="hidden sm:inline">Buscar</span>
                {(searchQuery.trim() || filterType !== 'all') && (
                  <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-white' : 'bg-white animate-pulse shadow-[0_0_6px_#ffffff]'}`} />
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowThemePicker((prev) => !prev)}
                  className={`rounded-full p-1.5 sm:px-3 sm:py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap ${
                    isLight
                      ? 'bg-white/80 border ot-border text-slate-900 hover:bg-white'
                      : 'liquid-glass-btn text-slate-200'
                  }`}
                  title="Alterar cores do chat"
                >
                  <Palette strokeWidth={iconStroke} className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span className="hidden md:inline">Cores</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-black/20 dark:ring-white/30"
                    style={{ backgroundColor: currentTheme.dotColor }}
                  />
                </button>

                {showThemePicker && (
                  <div className={`absolute left-0 mt-2 p-3 rounded-[24px] z-50 flex flex-col gap-2 min-w-[170px] shadow-2xl ${
                    isLight ? 'glass-strong-white ot-border border' : 'liquid-glass-menu'
                  }`}>
                    <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase px-1">
                      Cores Monocromáticas
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {Object.values(CHAT_THEMES).map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleSelectTheme(theme.id)}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                            chatTheme === theme.id
                              ? isLight
                                ? 'bg-slate-200/80 text-slate-950 font-bold'
                                : 'bg-white/[0.18] text-white font-medium shadow-inner'
                              : isLight
                              ? 'hover:bg-slate-100 text-slate-700'
                              : 'hover:bg-white/[0.06] text-slate-300'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm border ot-border dark:border-white/30"
                            style={{ backgroundColor: theme.dotColor }}
                          />
                          <span className="truncate">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!isChatFullscreen && (
          <div className="hidden lg:flex items-center justify-center shrink-0 pointer-events-none animate-fade-in mx-2">
            <div className={`backdrop-blur-2xl px-4 sm:px-5 py-1.5 rounded-full flex items-center gap-2.5 transition-all ${
              isLight
                ? 'bg-white/95 border border-white text-slate-950 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,1)]'
                : 'bg-white/[0.08] border border-white/[0.18] text-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
            } ${
              state === 'THINKING' || state === 'EXECUTING' ? 'animate-thinking-ripple' : ''
            }`}>
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  state === 'LISTENING' || state === 'SPEAKING'
                    ? isLight ? 'bg-slate-950 animate-pulse' : 'bg-white animate-pulse shadow-[0_0_12px_#ffffff]'
                    : state === 'THINKING' || state === 'EXECUTING'
                    ? isLight ? 'bg-slate-950 animate-ping' : 'bg-white animate-ping shadow-[0_0_12px_#ffffff]'
                    : isLight ? 'bg-slate-400' : 'bg-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                }`}
              />
              <span className={`text-xs font-sans tracking-wide uppercase font-bold whitespace-nowrap ${isLight ? 'text-slate-950' : 'text-white/95'}`}>
                {state === 'LISTENING'
                  ? 'ESCUTANDO COMANDO'
                  : state === 'SPEAKING'
                  ? 'OTTO FALANDO'
                  : state === 'THINKING'
                  ? 'PROCESSANDO RESPOSTA...'
                  : state === 'EXECUTING'
                  ? 'EXECUTANDO AÇÃO...'
                  : 'ESCUTANDO "OLÁ OTTO"'}
              </span>
            </div>
          </div>
        )}

        <div className="otto-stagger flex items-center gap-2 sm:gap-2.5">

          <button
            onClick={onOpenMemory}
            className={`border rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
              isLight
                ? 'bg-white/80 hover:bg-white ot-border text-slate-900'
                : 'backdrop-blur-xl bg-white/[0.08] hover:bg-white/[0.16] border-white/20 text-slate-200'
            }`}
            title="Acessar Memória Contextual, Temporária e Projetos"
          >
            <Sparkles
              strokeWidth={iconStroke}
              fill={isLight ? 'currentColor' : 'none'}
              className="w-3.5 h-3.5"
            />
            <span className="hidden sm:inline">Memória</span>
          </button>

          {onOpenDataHub && (
            <button
              onClick={onOpenDataHub}
              className={`border rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                isLight
                  ? 'bg-white/80 hover:bg-white ot-border text-slate-900'
                  : 'backdrop-blur-xl bg-white/[0.08] hover:bg-white/[0.16] border-white/20 text-slate-200 hover:text-white'
              }`}
              title="Acessar o OTTO Data Hub (Arquivos, pastas e análise inteligente)"
            >
              <HardDrive
                strokeWidth={iconStroke}
                fill={isLight ? 'currentColor' : 'none'}
                className="w-3.5 h-3.5 text-slate-900 dark:text-cyan-400"
              />
              <span className="hidden sm:inline">Data Hub</span>
            </button>
          )}

          {!isChatFullscreen ? (
            <button
              onClick={() => setIsChatFullscreen(true)}
              className={`border px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-sans font-semibold transition-all duration-300 cursor-pointer active:scale-95 shadow-md ${
                isLight
                  ? 'bg-white/80 hover:bg-white ot-border text-slate-900'
                  : 'group relative backdrop-blur-2xl bg-white/[0.08] hover:bg-white/[0.15] border-white/[0.18] text-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
              }`}
              title="Abrir Chat em tela cheia"
            >
              <MessageSquare
                strokeWidth={iconStroke}
                fill={isLight ? 'currentColor' : 'none'}
                className="w-3.5 h-3.5"
              />
              <span>Chat</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-slate-950' : 'bg-white/80'}`} />
            </button>
          ) : (
            <button
              onClick={() => setIsChatFullscreen(false)}
              className={`border rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                isLight
                  ? 'bg-white/80 hover:bg-white ot-border text-slate-900'
                  : 'backdrop-blur-xl bg-white/[0.08] hover:bg-white/[0.16] border-white/20 text-slate-200 hover:text-white'
              }`}
              title="Voltar para a tela inicial"
            >
              <ArrowLeft strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          )}

          <div
            onClick={onOpenMemory}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border backdrop-blur-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
              isLight
                ? 'border-slate-400 bg-white/90 shadow-sm hover:border-slate-600'
                : 'border-white/30 bg-white/[0.1] hover:border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
            }`}
            title="Perfil & Memória do Usuário"
          >
            <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${
              isLight
                ? 'bg-gradient-to-tr from-slate-200 to-white text-slate-950'
                : 'bg-gradient-to-tr from-slate-700 to-slate-400 text-white'
            }`}>
              <span className="w-5 h-5 rounded-full bg-slate-950 dark:bg-slate-200 text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-bold">
                U
              </span>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 shrink-0 ${
              isLight
                ? 'bg-white/80 hover:bg-white ot-border text-slate-900'
                : 'backdrop-blur-xl bg-white/[0.08] hover:bg-white/[0.15] border-white/20 text-white/80 hover:text-white'
            }`}
            title="Configurações (Personalidade, Permissões, Voz)"
          >
            <Settings
              strokeWidth={iconStroke}
              fill={isLight ? 'currentColor' : 'none'}
              className="w-4 h-4"
            />
          </button>

          <button
            onClick={toggleListening}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 shrink-0 ${
              isLight
                ? 'bg-white/80 hover:bg-white ot-border text-slate-900'
                : 'backdrop-blur-xl bg-white/[0.08] hover:bg-white/[0.15] border-white/20 text-white/80 hover:text-white'
            }`}
            title={state === 'LISTENING' ? 'Pausar microfone' : state === 'SPEAKING' ? 'Interromper fala' : 'Ativar microfone'}
          >
            <Power strokeWidth={iconStroke} className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY AREA */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          className={`fixed inset-y-0 left-0 top-[57px] w-72 z-40 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col p-4 shadow-2xl ${
            isLight
              ? 'glass-strong-white ot-border border-r text-slate-900'
              : 'glass-strong border-r border-white/15 text-white'
          } ${
            isChatFullscreen && showHistoryDrawer ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
            isLight ? 'ot-border' : 'border-white/[0.08]'
          }`}>
            <div className={`flex items-center gap-2 text-xs font-bold ${
              isLight ? 'text-slate-900' : 'text-slate-300'
            }`}>
              <History
                strokeWidth={iconStroke}
                fill={isLight ? 'currentColor' : 'none'}
                className="w-4 h-4 text-slate-900 dark:text-slate-200"
              />
              <span>HISTÓRICO DE CHAT</span>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-950'
                  : 'bg-white/[0.08] hover:bg-white/[0.18] text-slate-400 hover:text-white'
              }`}
            >
              <X strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className={`w-full mb-3 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer active:scale-98 shadow-sm ${
              isLight
                ? 'bg-slate-950 text-white hover:bg-black'
                : 'liquid-glass-btn text-white'
            }`}
          >
            <Plus strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5 text-white" />
            <span>Novo Chat</span>
          </button>

          <div className="relative mb-3">
            <Search
              strokeWidth={iconStroke}
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Filtrar conversas..."
              className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs transition-all font-sans focus:outline-none ${
                isLight
                  ? 'bg-white border ot-border text-slate-900 placeholder:text-slate-500 focus:border-slate-950 shadow-sm'
                  : 'glass-light border border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-white/60'
              }`}
            />
            {historySearchQuery && (
              <button
                onClick={() => setHistorySearchQuery('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${
                  isLight ? 'text-slate-500 hover:text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <X strokeWidth={isLight ? 2.5 : 1.75} className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {filteredSavedSessions.length === 0 ? (
              <div className={`text-center py-8 text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                {historySearchQuery ? 'Nenhuma conversa corresponde à busca.' : 'Nenhum histórico salvo ainda.'}
              </div>
            ) : (
              filteredSavedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleLoadSession(session)}
                  className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isLight
                      ? 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-400 shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] hover:border-white/30'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className={`truncate font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      <HighlightedText text={session.title} query={historySearchQuery} />
                    </span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>
                      {session.timestamp}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${
                      isLight
                        ? 'text-slate-500 hover:text-red-600'
                        : 'text-slate-500 hover:text-white'
                    }`}
                    title="Excluir conversa"
                  >
                    <Trash2 strokeWidth={iconStroke} className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LAYER A: STANDARD ASSISTANT VIEW */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu flex ${
            !isChatFullscreen
              ? 'opacity-100 scale-100 translate-y-0 blur-0 pointer-events-auto'
              : 'opacity-0 scale-95 -translate-y-4 blur-sm pointer-events-none'
          }`}
        >
          <main className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-2 sm:py-4 flex flex-col lg:flex-row items-center justify-between gap-6 z-10 overflow-hidden">
            <div
              className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu origin-top-left flex flex-col gap-4 w-full sm:w-72 shrink-0 z-20 ${
                showSystemPanel
                  ? 'opacity-100 scale-100 translate-y-0 max-h-[85vh] pointer-events-auto'
                  : 'opacity-0 scale-90 -translate-y-8 max-h-0 pointer-events-none overflow-hidden my-0 p-0 border-0'
              }`}
            >
              <div className={`rounded-[28px] p-5 flex flex-col gap-3 ${
                isLight
                  ? 'glass-medium-white border ot-border shadow-xl text-slate-900'
                  : 'glass-medium liquid-refraction shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white'
              }`}>
                <div className="flex items-center justify-between relative z-10">
                  <div className={`flex items-center gap-2 text-xs font-bold tracking-wider uppercase ${
                    isLight ? 'text-slate-900' : 'text-slate-300'
                  }`}>
                    <Activity
                      strokeWidth={iconStroke}
                      fill={isLight ? 'currentColor' : 'none'}
                      className="w-3.5 h-3.5"
                    />
                    <span>ATIVIDADE</span>
                  </div>
                  <button
                    onClick={() => setShowSystemPanel(false)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isLight
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-950'
                        : 'bg-white/[0.08] hover:bg-white/[0.18] text-slate-400 hover:text-white'
                    }`}
                    title="Fechar painel"
                  >
                    <X strokeWidth={isLight ? 2.5 : 1.75} className="w-3 h-3" />
                  </button>
                </div>
                <div className="otto-stagger space-y-2.5 text-xs font-sans max-h-36 overflow-y-auto scrollbar-none pr-1 relative z-10" data-testid="activity-feed-list">
                  {activities.slice(-4).map((act) => (
                    <div
                      key={act.id}
                      data-testid="activity-item"
                      className={`animate-activity-slide-in slide-in flex items-start gap-2.5 leading-snug ${
                        isLight ? 'text-slate-900 font-medium' : 'text-slate-200'
                      }`}
                    >
                      <Check
                        strokeWidth={isLight ? 2.5 : 2}
                        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                          isLight ? 'text-emerald-700 font-bold' : 'text-slate-300'
                        }`}
                      />
                      <span className="truncate">{act.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-[28px] p-5 flex flex-col gap-3 ${
                isLight
                  ? 'glass-medium-white border ot-border shadow-xl text-slate-900'
                  : 'glass-medium liquid-refraction shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white'
              }`}>
                <div className={`text-xs font-bold tracking-wider uppercase mb-0.5 relative z-10 ${
                  isLight ? 'text-slate-900' : 'text-slate-300'
                }`}>
                  STATUS DO SISTEMA
                </div>
                <div className="space-y-2.5 text-xs relative z-10">
                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                    <div className="flex items-center gap-2">
                      <Cpu strokeWidth={iconStroke} fill={isLight ? 'currentColor' : 'none'} className="w-3.5 h-3.5" />
                      <span className="font-mono font-semibold">CPU</span>
                    </div>
                    <SegmentedMeter activeSegments={6} totalSegments={12} isLight={isLight} />
                    <span className={`font-sans text-xs text-right min-w-[50px] font-bold ${
                      isLight ? 'text-slate-950' : 'text-white'
                    }`}>
                      {cores}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                    <div className="flex items-center gap-2">
                      <HardDrive strokeWidth={iconStroke} fill={isLight ? 'currentColor' : 'none'} className="w-3.5 h-3.5" />
                      <span className="font-mono font-semibold">MEM</span>
                    </div>
                    <SegmentedMeter activeSegments={8} totalSegments={12} isLight={isLight} />
                    <span className={`font-sans text-xs text-right min-w-[50px] font-bold ${
                      isLight ? 'text-slate-950' : 'text-white'
                    }`}>
                      {mem}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                    <div className="flex items-center gap-2">
                      <Battery strokeWidth={iconStroke} fill={isLight ? 'currentColor' : 'none'} className="w-3.5 h-3.5" />
                      <span className="font-mono font-semibold">BATT</span>
                    </div>
                    <SegmentedMeter activeSegments={5} totalSegments={12} isLight={isLight} />
                    <span className={`font-sans text-xs text-right min-w-[50px] font-bold ${
                      isLight ? 'text-slate-950' : 'text-white'
                    }`}>
                      44%
                    </span>
                  </div>

                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                    <div className="flex items-center gap-2">
                      <Wifi strokeWidth={iconStroke} className="w-3.5 h-3.5" />
                      <span className="font-mono font-semibold">NET</span>
                    </div>
                    <SegmentedMeter activeSegments={6} totalSegments={12} isLight={isLight} />
                    <span className={`font-sans text-xs font-extrabold text-right min-w-[50px] ${
                      isLight ? 'text-slate-950' : 'text-white'
                    }`}>
                      ON
                    </span>
                  </div>

                  <div className={`flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                    <div className="flex items-center gap-2">
                      <Clock strokeWidth={iconStroke} className="w-3.5 h-3.5" />
                      <span className="font-mono font-semibold">TIME</span>
                    </div>
                    <SegmentedMeter activeSegments={10} totalSegments={12} isLight={isLight} />
                    <span className={`font-sans text-xs text-right min-w-[50px] font-bold ${
                      isLight ? 'text-slate-950' : 'text-white'
                    }`}>
                      {currentTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-sm sm:max-w-md">
              <div
                className={`relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center cursor-pointer active:scale-98 transition-transform duration-300 rounded-full ${
                  state === 'THINKING' || state === 'EXECUTING' ? 'animate-thinking-ripple' : ''
                }`}
                onClick={toggleListening}
                title="Toque no mascote para falar com o OTTO"
              >
                <OttoLiquidMascot
                  state={state}
                  isListening={isListening || state === 'LISTENING'}
                  isSpeaking={isSpeaking || state === 'SPEAKING'}
                  isProjectingHologram={showHoloProjection && !!(latestHolographicImages && latestHolographicImages.length > 0)}
                />
              </div>

              {interimTranscript ? (
                <div className="mt-4 px-4 py-2 rounded-full bg-slate-900/90 border border-white/30 text-xs text-white font-sans italic truncate max-w-[320px] text-center shadow-2xl backdrop-blur-xl animate-fade-in">
                  "{interimTranscript}"
                </div>
              ) : (state === 'THINKING' || state === 'EXECUTING') ? (
                <div className="mt-4 animate-fade-in flex flex-col items-center">
                  <OttoThinking />
                </div>
              ) : !showHoloProjection ? (
                <div className="mt-4 animate-fade-in flex flex-col items-center max-w-[360px] text-center">
                  <OttoTyping message="Olá! Sou o OTTO Liquid. Como posso ajudar hoje?" loop={true} />
                </div>
              ) : null}

              {/* Holographic Image Projection Associated with Mascot (Draggable & Movable) */}
              {latestHolographicImages && latestHolographicImages.length > 0 && showHoloProjection && (
                <DraggableWindow
                  title="Projeção Holográfica OTTO"
                  onClose={() => setShowHoloProjection(false)}
                  maxWidth={520}
                  headerIcon={<Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
                >
                  <div className="relative">
                    <OttoHologram
                      content={{
                        id: `holo_mascot_${Date.now()}`,
                        type: latestHolographicImages.length === 1 ? 'image' : 'gallery',
                        title: latestHolographicImages[0]?.title || 'Projeção Holográfica OTTO',
                        imageUrl: latestHolographicImages[0]?.url,
                        images: latestHolographicImages.map((img) => ({
                          url: img.url,
                          title: img.title,
                          alt: img.alt,
                          source: img.source,
                        })),
                      }}
                      originFromMascot={true}
                    />
                  </div>
                </DraggableWindow>
              )}

              {/* Re-open Projection Button if user minimized it */}
              {latestHolographicImages && latestHolographicImages.length > 0 && !showHoloProjection && (
                <button
                  onClick={() => setShowHoloProjection(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-full glass-medium border border-white/25 text-slate-200 hover:text-white text-xs font-mono flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Projetar Imagem Holográfica</span>
                </button>
              )}

              {/* Mobile Knowledge Summary Preview Card */}
              {latestKnowledgeCard && (
                <div className="lg:hidden mt-3 w-full max-w-sm px-2 animate-fade-in">
                  <div
                    onClick={() => setIsChatFullscreen(true)}
                    className="p-3 rounded-2xl glass-medium border border-white/25 flex items-center justify-between gap-2.5 shadow-xl cursor-pointer hover:border-white transition-all active:scale-98"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {latestKnowledgeCard.heroImage ? (
                        <img
                          src={latestKnowledgeCard.heroImage}
                          alt={latestKnowledgeCard.title}
                          className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1">
                          <span>Conhecimento Web</span>
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {latestKnowledgeCard.title}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {latestKnowledgeCard.subtitle || latestKnowledgeCard.summary}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-white/15 text-white font-medium shrink-0 border border-white/20">
                      Ver mais →
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Side Knowledge & Hologram HUD Card */}
            {latestKnowledgeCard ? (
              <div className="hidden lg:block w-80 xl:w-96 shrink-0 z-20 animate-fade-in max-h-[82vh] overflow-y-auto pr-1">
                <KnowledgeCardViewer
                  card={latestKnowledgeCard}
                  onOpenArticleReader={(title, url, content) =>
                    setReaderModal({ isOpen: true, title, url, content })
                  }
                  onExploreQuery={(query) => handleProcessCommand(query)}
                />
              </div>
            ) : latestHolographicImages && latestHolographicImages.length > 1 ? (
              <div className="hidden lg:block w-80 xl:w-96 shrink-0 z-20 animate-fade-in max-h-[82vh] overflow-y-auto pr-1">
                <OttoImageGallery images={latestHolographicImages} />
              </div>
            ) : (
              <div className="hidden lg:block w-72 shrink-0 pointer-events-none" />
            )}
          </main>
        </div>

        {/* LAYER B: FULLSCREEN CHATGPT-STYLE WORKSPACE */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu flex flex-col justify-between items-center max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 z-20 ${
            isChatFullscreen
              ? 'opacity-100 scale-100 translate-y-0 blur-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-6 blur-sm pointer-events-none'
          }`}
        >
          {isSearchOpen && (
            <div className={`w-full mb-3 p-3.5 rounded-[24px] shadow-2xl animate-fade-in flex flex-col gap-2.5 shrink-0 z-30 ${
              isLight
                ? 'glass-medium-white border ot-border shadow-[0_10px_35px_rgba(0,0,0,0.08)] text-slate-900'
                : 'glass-medium border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-white'
            }`}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    strokeWidth={iconStroke}
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isLight ? 'text-slate-700' : 'text-white'
                    }`}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar comandos anteriores, respostas ou ações..."
                    className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm font-sans focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border ot-border text-slate-950 placeholder:text-slate-500 focus:border-slate-950 shadow-sm'
                        : 'bg-white/[0.06] border border-white/10 text-white placeholder:text-slate-400 focus:border-white'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                        isLight ? 'text-slate-500 hover:text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Limpar texto de busca"
                    >
                      <X strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-slate-200/80 hover:bg-slate-300 text-slate-800'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <X strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fechar</span>
                </button>
              </div>

              <div className={`flex flex-wrap items-center justify-between gap-2 pt-1 border-t text-xs ${
                isLight ? 'border-slate-200' : 'border-white/[0.06]'
              }`}>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                  <span className={`text-[10px] font-mono uppercase mr-1 flex items-center gap-1 font-bold ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    <Filter strokeWidth={iconStroke} className="w-3 h-3" />
                    <span className="hidden sm:inline">Filtro:</span>
                  </span>

                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'all'
                        ? isLight
                          ? 'bg-slate-950 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-950 font-bold shadow-sm'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    Todos ({chatMessages.length})
                  </button>

                  <button
                    onClick={() => setFilterType('user')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'user'
                        ? isLight
                          ? 'bg-slate-950 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-950 font-bold shadow-sm'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    Meus Comandos ({chatMessages.filter((m) => m.sender === 'user').length})
                  </button>

                  <button
                    onClick={() => setFilterType('otto')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'otto'
                        ? isLight
                          ? 'bg-slate-950 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-950 font-bold shadow-sm'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    Respostas OTTO ({chatMessages.filter((m) => m.sender === 'otto').length})
                  </button>

                  <button
                    onClick={() => setFilterType('actions')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      filterType === 'actions'
                        ? isLight
                          ? 'bg-slate-950 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-950 font-bold shadow-sm'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <Zap
                      strokeWidth={iconStroke}
                      fill={isLight ? 'currentColor' : 'none'}
                      className="w-3 h-3"
                    />
                    <span>Ações do Sistema</span>
                  </button>
                </div>

                <div className={`text-[11px] font-mono shrink-0 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {filteredChatMessages.length} {filteredChatMessages.length === 1 ? 'resultado' : 'resultados'}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 w-full overflow-y-auto space-y-5 py-3 pr-1 text-sm scrollbar-none">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto space-y-6 animate-fade-in">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl ${
                  isLight
                    ? 'bg-white border ot-border shadow-md text-slate-900'
                    : 'backdrop-blur-2xl bg-white/[0.08] border border-white/20 text-white'
                }`}>
                  <Sparkles
                    strokeWidth={iconStroke}
                    fill={isLight ? 'currentColor' : 'none'}
                    className="w-7 h-7 animate-pulse"
                  />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <OttoTyping message="Olá! Sou o OTTO Liquid. Como posso ajudar hoje?" loop={true} />
                  <p className={`text-xs leading-relaxed max-w-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    OTTO possui controle nativo de ferramentas, terminal, reprodução no YouTube,
                    pesquisas na web e memória persistente.
                  </p>
                </div>
                <div className="otto-stagger grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
                  {defaultLiquidChips.map((chip, idx) => {
                    const IconComp = chip.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleProcessCommand(chip.query)}
                        className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer shadow-md group flex items-start gap-3 ${
                          isLight
                            ? 'ot-chip text-slate-900'
                            : 'backdrop-blur-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/40 text-slate-200'
                        }`}
                      >
                        <IconComp
                          strokeWidth={iconStroke}
                          fill={isLight ? 'currentColor' : 'none'}
                          className={`w-4 h-4 mt-0.5 shrink-0 group-hover:scale-110 transition-transform ${
                            isLight ? 'ot-chip__icon' : 'text-white'
                          }`}
                        />
                        <span className={`text-xs font-semibold leading-snug ${
                          isLight ? 'text-slate-950' : 'group-hover:text-white'
                        }`}>
                          {chip.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : filteredChatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto animate-fade-in">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 shadow-inner ${
                  isLight
                    ? 'bg-slate-100 ot-border text-slate-700'
                    : 'bg-white/[0.05] border-white/10 text-slate-400'
                }`}>
                  <Search strokeWidth={iconStroke} className="w-6 h-6" />
                </div>
                <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                  Nenhum comando encontrado
                </h3>
                <p className={`text-xs leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Não encontramos mensagens correspondentes a "{searchQuery}" com o filtro selecionado.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                    isLight
                      ? 'bg-slate-950 text-white hover:bg-black shadow-md'
                      : 'bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-white'
                  }`}
                >
                  <RotateCcw strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              </div>
            ) : (
              filteredChatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col group/msg ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  } animate-fade-in`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-[11px] font-sans font-bold ${
                      isLight ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {msg.sender === 'user' ? 'Você' : 'OTTO'}
                    </span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`relative text-sm leading-relaxed max-w-[85%] sm:max-w-[78%] px-4 sm:px-5 py-3 rounded-3xl transition-all ${
                      msg.sender === 'user'
                        ? `${isLight ? 'otto-bubble-user-light' : currentTheme.userBubbleGrad} rounded-tr-md font-sans`
                        : isLight
                        ? 'otto-bubble-otto-light rounded-tl-md font-medium'
                        : 'backdrop-blur-2xl bg-white/[0.06] border border-white/[0.12] text-slate-100 rounded-tl-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      <HighlightedText text={msg.text} query={searchQuery} />
                    </div>

                    {msg.attachedImage && (
                      <div className={`mt-2.5 max-w-sm rounded-2xl overflow-hidden border shadow-xl ${
                        isLight ? 'ot-border bg-white' : 'border-white/20 bg-black/60'
                      }`}>
                        <img
                          src={msg.attachedImage.dataUrl}
                          alt={msg.attachedImage.name || 'Imagem'}
                          className="w-full max-h-52 object-contain bg-black/40 rounded-t-xl"
                        />
                        {msg.attachedImage.name && (
                          <div className={`p-2 px-3 text-[10px] font-mono truncate border-t flex items-center justify-between ${
                            isLight ? 'text-slate-800 bg-slate-50 ot-border' : 'text-slate-300 bg-white/[0.05] border-white/10'
                          }`}>
                            <span className="truncate">{msg.attachedImage.name}</span>
                            {msg.attachedImage.size && (
                              <span className="text-slate-500 shrink-0 ml-2">
                                {(msg.attachedImage.size / 1024).toFixed(0)} KB
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {msg.artifact && (
                      <div className="mt-3">
                        <ArtifactViewer artifact={msg.artifact} />
                      </div>
                    )}

                    {msg.knowledgeCard && (
                      <div className="mt-3">
                        <KnowledgeCardViewer
                          card={msg.knowledgeCard}
                          onOpenArticleReader={(title, url, content) =>
                            setReaderModal({ isOpen: true, title, url, content })
                          }
                          onExploreQuery={(query) => handleProcessCommand(query)}
                        />
                      </div>
                    )}

                    {msg.images && msg.images.length > 0 && (
                      <div className="mt-3">
                        {msg.images.length === 1 ? (
                          <OttoImageCard image={msg.images[0]} />
                        ) : (
                          <OttoImageGallery images={msg.images} />
                        )}
                      </div>
                    )}

                    {msg.holograms && msg.holograms.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2.5">
                        {msg.holograms.map((holo) => (
                          <OttoHologram key={holo.id} content={holo} />
                        ))}
                      </div>
                    )}

                    {msg.dataHubFiles && msg.dataHubFiles.length > 0 && (
                      <DataHubChatCard
                        files={msg.dataHubFiles}
                        onActionClick={(prompt) => handleProcessCommand(prompt)}
                        onOpenFileModal={() => onOpenDataHub && onOpenDataHub()}
                      />
                    )}

                    {msg.actions && msg.actions.length > 0 && (
                      <div className={`pt-2 mt-2 border-t text-[10px] flex flex-wrap gap-1.5 font-mono ${
                        isLight ? 'border-slate-200 text-slate-900' : 'border-white/[0.1] text-slate-200'
                      }`}>
                        {msg.actions.map((act, i) => {
                          // Resposta do cérebro local (nuvem fora): amber, sem cara de erro.
                          const isLocal = act.action === 'none' && act.target === 'local';

                          if (isLocal) {
                            return (
                              <span
                                key={i}
                                title="Sem provedor de nuvem: esta resposta veio das regras locais do OTTO"
                                className={`px-2 py-0.5 rounded-lg border flex items-center gap-1.5 shadow-sm font-semibold ${
                                  isLight
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                                    : 'bg-amber-400/10 border-amber-400/30 text-amber-200'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>modo local</span>
                              </span>
                            );
                          }

                          return (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 shadow-sm font-semibold ${
                                isLight
                                  ? 'bg-slate-100 ot-border text-slate-900'
                                  : 'bg-black/50 border-white/30 text-slate-200'
                              }`}
                            >
                              <Zap
                                strokeWidth={iconStroke}
                                fill={isLight ? 'currentColor' : 'none'}
                                className={`w-3 h-3 ${isLight ? 'text-slate-950' : 'text-white'}`}
                              />
                              <span>
                                {act.action}
                                {act.target ? ` → ${act.target}` : ''}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {msg.sender === 'user' && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/20 text-slate-900 opacity-0 group-hover/msg:opacity-100 transition-opacity font-medium">
                        <button
                          onClick={() => {
                            setTextInput(msg.text);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-black/10 hover:bg-black/20 transition-all text-[11px] flex items-center gap-1 cursor-pointer font-bold"
                          title="Carregar este comando na caixa de texto"
                        >
                          <CornerDownLeft strokeWidth={iconStroke} className="w-3 h-3" />
                          <span>Usar comando</span>
                        </button>
                        <button
                          onClick={() => handleProcessCommand(msg.text)}
                          className="px-2 py-0.5 rounded-lg bg-black/10 hover:bg-black/20 transition-all text-[11px] flex items-center gap-1 cursor-pointer font-bold"
                          title="Executar comando novamente"
                        >
                          <RotateCcw strokeWidth={iconStroke} className="w-3 h-3" />
                          <span>Executar</span>
                        </button>
                        <button
                          onClick={() => handleCopyMessage(msg.text, msg.id)}
                          className="p-1 rounded hover:bg-black/10 transition-all text-[11px] flex items-center gap-1 cursor-pointer font-bold"
                          title="Copiar comando"
                        >
                          <Copy strokeWidth={iconStroke} className="w-3 h-3" />
                          <span>{copiedMsgId === msg.id ? 'Copiado!' : ''}</span>
                        </button>
                      </div>
                    )}

                    {msg.sender === 'otto' && (
                      <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${
                        isLight ? 'border-slate-200 text-slate-700' : 'border-white/[0.08] text-slate-400'
                      }`}>
                        <button
                          onClick={() => handleCopyMessage(msg.text, msg.id)}
                          className={`p-1 rounded transition-all text-xs flex items-center gap-1 cursor-pointer font-semibold ${
                            isLight ? 'hover:bg-slate-200 text-slate-800' : 'hover:bg-white/10 hover:text-white'
                          }`}
                          title="Copiar texto"
                        >
                          <Copy strokeWidth={iconStroke} className="w-3.5 h-3.5" />
                          <span className="text-[10px]">
                            {copiedMsgId === msg.id ? 'Copiado!' : 'Copiar'}
                          </span>
                        </button>
                        <button
                          onClick={() => ttsEngine.speak(msg.text)}
                          className={`p-1 rounded transition-all text-xs flex items-center gap-1 cursor-pointer font-semibold ${
                            isLight ? 'hover:bg-slate-200 text-slate-800' : 'hover:bg-white/10 hover:text-white'
                          }`}
                          title="Ouvir resposta com voz neural"
                        >
                          <Volume2
                            strokeWidth={iconStroke}
                            fill={isLight ? 'currentColor' : 'none'}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-[10px]">Ouvir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {/* Otto · "pensando" — minimalista, P&B, estilo Apple */}
            {(state === 'THINKING' || state === 'EXECUTING') && (
              <div className="flex flex-col items-start animate-fade-in my-2">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className={`text-[11px] font-sans font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>OTTO</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>pensando</span>
                </div>
                <OttoThinking />
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Bottom ChatGPT Floating Prompt Bar */}
          <div className="w-full pt-2 pb-1 relative">
            {/* ffmpeg: o OTTO processa áudio e vídeo quando o motor está presente */}
            {mediaEngine && (
              <div className="flex justify-end pr-3 pb-1.5">
                <button
                  type="button"
                  onClick={async () => setMediaEngine(await ApiBridge.getMediaStatus(true))}
                  title={
                    mediaEngine.available
                      ? `Motor de mídia pronto${mediaEngine.version ? ` · ${mediaEngine.version}` : ''}. Peça no chat: "extrai o áudio desse vídeo" ou "gera um gif".`
                      : mediaEngine.hint || 'ffmpeg não encontrado no servidor.'
                  }
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-wide transition-all duration-300 cursor-pointer active:scale-95 ${
                    mediaEngine.available
                      ? isLight
                        ? 'bg-white/70 border-emerald-300/70 text-emerald-900 hover:bg-white'
                        : 'bg-white/[0.06] border-emerald-400/30 text-emerald-200/90 hover:bg-white/[0.12]'
                      : isLight
                      ? 'bg-white/60 border-amber-300/70 text-amber-900 hover:bg-white'
                      : 'bg-white/[0.05] border-amber-400/25 text-amber-200/80 hover:bg-white/[0.11]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      mediaEngine.available
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                        : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]'
                    }`}
                  />
                  {mediaEngine.available ? 'ffmpeg pronto' : 'ffmpeg ausente'}
                </button>
              </div>
            )}
            {/* Attached Image Preview Chip */}
            {attachedImage && (
              <div className={`absolute -top-14 left-4 flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl backdrop-blur-xl border shadow-2xl animate-fade-in z-20 ${
                isLight
                  ? 'bg-white/95 border-slate-400 text-slate-950 shadow-lg'
                  : 'bg-black/90 border-cyan-400/50 text-white shadow-2xl'
              }`}>
                <img
                  src={attachedImage.dataUrl}
                  alt="Anexo"
                  className="w-10 h-10 rounded-xl object-cover border ot-border dark:border-white/20"
                />
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-mono font-bold truncate max-w-[190px] ${isLight ? 'text-slate-950' : 'text-white'}`}>
                    {attachedImage.name}
                  </span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-cyan-700 font-bold' : 'text-cyan-300'}`}>
                    Pronto para visão computacional do OTTO
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className={`p-1 rounded-full ml-1 transition-colors cursor-pointer ${
                    isLight ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Remover anexo"
                >
                  <X strokeWidth={isLight ? 2.5 : 1.75} className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={onCustomChatSubmit}
              className={`relative w-full rounded-full p-2 sm:p-2.5 flex items-center gap-2 transition-all ${
                isLight
                  ? 'glass-medium-white ot-border border ot-focus'
                  : 'glass-medium liquid-refraction shadow-[0_12px_40px_rgba(0,0,0,0.6)] focus-within:border-white/60'
              }`}
            >
              <input
                ref={chatFileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json"
                className="hidden"
                onChange={handleChatFileSelected}
              />

              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                  attachedImage
                    ? isLight
                      ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                      : 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                    : isLight
                    ? 'hover:bg-slate-200/70 text-slate-700 hover:text-slate-950'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
                title="Anexar imagem ou arquivo para o OTTO analisar"
              >
                <Paperclip strokeWidth={iconStroke} className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onPaste={handleChatPaste}
                placeholder={
                  attachedImage
                    ? 'Descreva o que deseja que o OTTO analise na imagem...'
                    : 'Envie uma mensagem ou anexe uma imagem para o OTTO...'
                }
                className={`flex-1 bg-transparent border-none focus:outline-none pl-1 sm:pl-2 text-sm font-sans font-medium ${
                  isLight
                    ? 'text-slate-950 placeholder:text-slate-500'
                    : 'text-white placeholder:text-slate-400'
                }`}
              />

              <button
                type="button"
                onClick={toggleListening}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                  state === 'LISTENING'
                    ? isLight
                      ? 'bg-slate-950 text-white border border-slate-950 animate-pulse shadow-md'
                      : 'bg-white/30 text-white border border-white/60 animate-pulse'
                    : isLight
                    ? 'hover:bg-slate-200/70 text-slate-700 hover:text-slate-950'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
                title={state === 'LISTENING' ? 'Parar gravação' : 'Falar comando por voz'}
              >
                <Mic
                  strokeWidth={iconStroke}
                  fill={isLight && state === 'LISTENING' ? 'currentColor' : 'none'}
                  className="w-4 h-4"
                />
              </button>

              <button
                type="submit"
                disabled={!textInput.trim() && !attachedImage}
                className={`w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer active:scale-95 shrink-0 ${
                  isLight
                    ? 'bg-slate-950 text-white hover:bg-black font-bold shadow-md'
                    : currentTheme.buttonGrad
                }`}
                title="Enviar mensagem"
              >
                <Send
                  strokeWidth={iconStroke}
                  fill={isLight ? 'currentColor' : 'none'}
                  className="w-4 h-4"
                />
              </button>
            </form>

            <div className={`text-[10px] text-center font-sans tracking-wide mt-2 ${
              isLight ? 'text-slate-600 font-medium' : 'text-slate-500'
            }`}>
              OTTO 2.5 • Inteligência de computador com execução de comandos do sistema.
            </div>
          </div>
        </div>
      </div>

      {/* 3. MASCOT COMPANION */}
      <div
        onPointerDown={handleOrbPointerDown}
        style={{
          left: orbPos ? `${orbPos.x}px` : 'calc(100vw - 116px)',
          top: orbPos ? `${orbPos.y}px` : 'calc(100vh - 116px)',
        }}
        className={`fixed z-50 select-none w-24 h-24 touch-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isChatFullscreen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-75 pointer-events-none'
        } ${
          isDraggingOrb
            ? 'cursor-grabbing scale-105'
            : 'cursor-grab hover:scale-105 active:scale-95'
        }`}
      >
        <div
          className={`w-full h-full rounded-full p-1.5 backdrop-blur-3xl relative flex items-center justify-center transition-all duration-500 group ${
            isLight
              ? 'bg-white/95 ot-border border shadow-[0_16px_40px_rgba(0,0,0,0.15)] ring-1 ring-slate-200'
              : 'bg-[#0f1218]/90 border border-white/40 shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.2)] ring-1 ring-white/15'
          } ${
            isDraggingOrb ? isLight ? 'ring-2 ring-slate-950 shadow-2xl' : 'ring-2 ring-white shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(255,255,255,0.4)]' : ''
          } ${state === 'THINKING' || state === 'EXECUTING' ? 'animate-thinking-ripple' : ''}`}
          title="Arraste para mover • Toque para falar"
        >
          {!isDraggingOrb && (
            <div className={`absolute -top-1.5 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none ${
              isLight
                ? 'bg-slate-950 border border-slate-700 text-white'
                : 'bg-white/90 border border-white/40 text-slate-950'
            }`}>
              <Move strokeWidth={isLight ? 2.5 : 1.75} className="w-2.5 h-2.5" />
            </div>
          )}

          <OttoLiquidMascot
            state={state}
            isListening={isListening || state === 'LISTENING'}
            isSpeaking={isSpeaking || state === 'SPEAKING'}
          />
        </div>
      </div>

      {/* IN-SITE ARTICLE READER MODAL (Read Wikipedia & Web Articles without leaving the site) */}
      <ArticleReaderModal
        isOpen={readerModal.isOpen}
        onClose={() => setReaderModal((prev) => ({ ...prev, isOpen: false }))}
        title={readerModal.title}
        url={readerModal.url}
        initialContent={readerModal.content}
      />
    </div>
  );
};

export const OttoLiquidBetaView = OttoLiquidView;
