/**
 * OTTO DATA HUB - Master Workspace Modal
 * File tree, drag-and-drop ingestion, semantic search, planning and batch operations.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Folder,
  FileText,
  Upload,
  Search,
  Sparkles,
  Trash2,
  FolderPlus,
  CheckSquare,
  Square,
  AlertTriangle,
  HardDrive,
  ChevronRight,
  X,
  Image as ImageIcon,
  Code,
  Table,
  Film,
  Music,
  ArrowUpDown,
  Clock,
  LayoutGrid,
  List,
  CheckCircle2,
} from 'lucide-react';
import { OttoFile, OttoFolder, FileCategory } from '../../types/dataHub';
import { DataHubStorage } from '../../services/dataHubStorage';
import { DataHubPreviewModal } from './DataHubPreviewModal';
import { DataHubPlanModal } from './DataHubPlanModal';

interface DataHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskOttoAboutFiles?: (prompt: string, files?: OttoFile[]) => void;
}

type SortMode = 'recent' | 'name' | 'size';

const CATEGORY_OPTIONS: Array<{ id: FileCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'document', label: 'Documentos' },
  { id: 'data', label: 'Dados & Planilhas' },
  { id: 'image', label: 'Imagens' },
  { id: 'video', label: 'Vídeos' },
  { id: 'audio', label: 'Áudios' },
  { id: 'code', label: 'Código' },
];

const SORT_OPTIONS: Array<{ id: SortMode; label: string }> = [
  { id: 'recent', label: 'Mais recentes' },
  { id: 'name', label: 'Nome (A-Z)' },
  { id: 'size', label: 'Tamanho' },
];

const STORAGE_SOFT_LIMIT = 5 * 1024 * 1024; // referência visual de 5 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Número que "conta" até o valor final (respeita prefers-reduced-motion). */
const AnimatedNumber: React.FC<{ value: number; format?: (n: number) => string; duration?: number }> = ({
  value,
  format = (n) => Math.round(n).toString(),
  duration = 900,
}) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || duration <= 0) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{format(display)}</>;
};

function FileIcon({ category }: { category: FileCategory }) {
  if (category === 'video') return <Film className="w-4 h-4 text-white" />;
  if (category === 'audio') return <Music className="w-4 h-4 text-white" />;
  if (category === 'image') return <ImageIcon className="w-4 h-4 text-white" />;
  if (category === 'code') return <Code className="w-4 h-4 text-white" />;
  if (category === 'data') return <Table className="w-4 h-4 text-white" />;
  return <FileText className="w-4 h-4 text-white" />;
}

export const DataHubModal: React.FC<DataHubModalProps> = ({
  isOpen,
  onClose,
  onAskOttoAboutFiles,
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortMode>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [toast, setToast] = useState<{ count: number; label: string } | null>(null);

  const [files, setFiles] = useState<OttoFile[]>([]);
  const [folders, setFolders] = useState<OttoFolder[]>([]);
  const [allFolders, setAllFolders] = useState<OttoFolder[]>([]);
  const [allFiles, setAllFiles] = useState<OttoFile[]>([]);

  const [previewFile, setPreviewFile] = useState<OttoFile | null>(null);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof DataHubStorage.createOrganizationPlan> | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Ciclo de vida visual: mantém o modal montado durante a animação de saída.
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((count: number, label: string) => {
    if (count <= 0) return;
    setToast({ count, label });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Sync data from DataHubStorage
  const refresh = useCallback(() => {
    const data = DataHubStorage.listFiles(currentFolderId);
    setFiles(data.files);
    setFolders(data.folders);
    setAllFolders(DataHubStorage.getAllFolders());
    setAllFiles(DataHubStorage.getAllFiles());
  }, [currentFolderId]);

  useEffect(() => {
    if (isOpen) {
      refresh();
      return DataHubStorage.subscribe(refresh);
    }
  }, [isOpen, refresh]);

  // Entrada / saída animada
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }
    if (!isRendered) return;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      setSearchQuery('');
      setSelectedFileIds(new Set());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [isOpen, isRendered]);

  // Trava o scroll da página enquanto o modal está aberto
  useEffect(() => {
    if (!isRendered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isRendered]);

  // ESC: cancela a criação de pasta, fecha a pré-visualização ou fecha o Data Hub
  useEffect(() => {
    if (!isRendered) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (previewFile) {
        setPreviewFile(null);
        return;
      }
      if (showNewFolderInput) {
        setShowNewFolderInput(false);
        setNewFolderName('');
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRendered, previewFile, showNewFolderInput, onClose]);

  // Atalho "/" foca a busca (ignora quando o usuário está digitando em algum campo)
  useEffect(() => {
    if (!isRendered) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRendered]);

  const breadcrumbs = useMemo(
    () => (isRendered ? DataHubStorage.getFolderBreadcrumbs(currentFolderId) : []),
    [currentFolderId, isRendered]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: files.length };
    for (const file of files) {
      counts[file.category] = (counts[file.category] || 0) + 1;
    }
    return counts;
  }, [files]);

  const totalStorageSize = useMemo(
    () => allFiles.reduce((acc, f) => acc + f.size, 0),
    [allFiles]
  );

  const storagePercent = Math.min(100, (totalStorageSize / STORAGE_SOFT_LIMIT) * 100);

  const sortFiles = useCallback(
    (list: OttoFile[]): OttoFile[] => {
      const sorted = [...list];
      if (sortBy === 'name') {
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      } else if (sortBy === 'size') {
        sorted.sort((a, b) => b.size - a.size);
      } else {
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );
      }
      return sorted;
    },
    [sortBy]
  );

  // Filtered files according to search & category
  const filteredFiles = useMemo(() => {
    if (searchQuery.trim()) return DataHubStorage.search(searchQuery);
    const inCategory = files.filter(
      (f) => selectedCategory === 'all' || f.category === selectedCategory
    );
    return sortFiles(inCategory);
  }, [searchQuery, files, selectedCategory, sortFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const uploaded = await DataHubStorage.uploadFiles(Array.from(e.target.files), currentFolderId);
      refresh();
      showToast(uploaded?.length ?? e.target.files.length, 'arquivo(s) indexado(s) no Data Hub');
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const uploaded = await DataHubStorage.uploadFiles(Array.from(e.dataTransfer.files), currentFolderId);
      refresh();
      showToast(uploaded?.length ?? e.dataTransfer.files.length, 'arquivo(s) recebido(s) por arrastar-e-soltar');
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      DataHubStorage.createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setShowNewFolderInput(false);
      refresh();
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleToggleSelectFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = () => {
    selectedFileIds.forEach((id) => DataHubStorage.deleteFile(id));
    setSelectedFileIds(new Set());
    refresh();
  };

  const handleTriggerPlan = () => {
    const plan = DataHubStorage.createOrganizationPlan(currentFolderId);
    setActivePlan(plan);
    setShowPlanModal(true);
  };

  const handleExecutePlan = async (planId: string) => {
    await DataHubStorage.executePlan(planId);
    refresh();
  };

  const handleAskOttoAboutSelected = () => {
    if (!onAskOttoAboutFiles) return;
    const selectedFiles = allFiles.filter((f) => selectedFileIds.has(f.id));
    const names = selectedFiles.map((f) => f.name).join(', ');
    onAskOttoAboutFiles(`Analise e resuma estes arquivos selecionados no Data Hub: ${names}`, selectedFiles);
    onClose();
  };

  if (!isRendered) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl font-sans ${
          isClosing ? 'dh-backdrop--exit' : 'dh-backdrop'
        }`}
        onClick={onClose}
        role="presentation"
      >
        <div
          className={`relative w-full max-w-6xl rounded-[32px] glass-strong border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col h-[90vh] ${
            isClosing ? 'dh-panel--exit' : 'dh-panel'
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="OTTO Data Hub"
        >
          {/* Aurora animada no fundo do vidro */}
          <div className="dh-aurora" aria-hidden="true" />

          <div className="relative flex flex-col h-full min-h-0">
            {/* Header Bar */}
            <div
              className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.04] dh-rise"
              style={{ animationDelay: '140ms' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-white shadow-inner dh-pop">
                  <HardDrive className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      OTTO DATA HUB
                    </h1>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-slate-200 font-semibold">
                      Espaço Conectado
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Armazene, organize, pesquise e permita ao OTTO analisar e editar seus arquivos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerPlan}
                  className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 hover:gap-2"
                  title="Deixar o OTTO analisar a pasta e criar plano de organização"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Organizar com OTTO</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 hover:text-white transition-all cursor-pointer active:scale-95 hover:rotate-90"
                  aria-label="Fechar Data Hub"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Layout: Split Tree Left & Files Right */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar: Folder Tree & Stats */}
              <div
                className="hidden md:flex flex-col w-64 border-r border-white/10 bg-black/50 p-4 justify-between shrink-0 dh-slide"
                style={{ animationDelay: '200ms' }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span className="uppercase tracking-wider text-[11px]">PASTAS & LOCAIS</span>
                    <button
                      onClick={() => setShowNewFolderInput(true)}
                      className="p-1 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer hover:scale-110"
                      title="Nova Pasta"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tree Items */}
                  <div className="flex flex-col gap-1 text-xs">
                    <button
                      onClick={() => setCurrentFolderId(undefined)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all cursor-pointer ${
                        currentFolderId === undefined
                          ? 'bg-white text-slate-950 font-bold shadow-[0_4px_16px_rgba(255,255,255,0.25)]'
                          : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <HardDrive className="w-4 h-4 shrink-0" />
                      <span>Meus Arquivos</span>
                    </button>

                    {allFolders.map((folder, index) => (
                      <button
                        key={folder.id}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all cursor-pointer truncate dh-slide ${
                          currentFolderId === folder.id
                            ? 'bg-white text-slate-950 font-bold shadow-[0_4px_16px_rgba(255,255,255,0.25)]'
                            : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                        }`}
                        style={{ animationDelay: `${220 + index * 45}ms` }}
                      >
                        <Folder className="w-4 h-4 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Categories Filter */}
                  <div className="pt-3 border-t border-white/10 flex flex-col gap-1 text-xs">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                      Filtrar Categoria
                    </span>

                    {CATEGORY_OPTIONS.map((cat) => {
                      const count = categoryCounts[cat.id] || 0;
                      const isActive = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-left transition-all cursor-pointer text-xs font-medium ${
                            isActive
                              ? 'bg-white/20 text-white font-bold border border-white/30 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5'
                          }`}
                        >
                          <span className="truncate">{cat.label}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 rounded-md transition-colors ${
                              isActive ? 'bg-white/25 text-white' : 'bg-white/[0.06] text-slate-400'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Storage Diagnostics */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs flex flex-col gap-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Armazenamento Ativo
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {storagePercent.toFixed(0)}%
                    </span>
                  </div>

                  <span className="text-white font-bold text-sm">
                    <AnimatedNumber value={totalStorageSize} format={formatBytes} />
                  </span>

                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="dh-meter__fill h-full rounded-full"
                      style={{ width: `${Math.max(storagePercent, totalStorageSize > 0 ? 6 : 0)}%` }}
                    />
                  </div>

                  <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3" />
                    <AnimatedNumber value={allFiles.length} /> arquivos · <AnimatedNumber value={allFolders.length} /> pastas
                  </span>
                </div>
              </div>

              {/* Right Work Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`flex-1 flex flex-col overflow-hidden relative transition-colors duration-300 ${
                  isDragOver ? 'bg-white/[0.06]' : ''
                }`}
              >
                {/* Toolbar */}
                <div
                  className="p-3 sm:p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] dh-rise"
                  style={{ animationDelay: '260ms' }}
                >
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    {breadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={`${crumb.id ?? 'root'}-${idx}`}>
                        {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-500" />}
                        <button
                          onClick={() => setCurrentFolderId(crumb.id)}
                          className={`hover:text-white transition-colors cursor-pointer ${
                            idx === breadcrumbs.length - 1 ? 'text-white font-bold' : 'text-slate-400'
                          }`}
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Search & Actions */}
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                    <div className="relative flex-1 sm:w-60 group">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-white" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Busca semântica (atalho: /)"
                        aria-label="Buscar arquivos"
                        className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white focus:bg-white/[0.12] transition-all font-sans"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                          aria-label="Limpar busca"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Alternância Grade / Lista */}
                    <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.06] border border-white/15">
                      <button
                        onClick={() => setViewMode('grid')}
                        aria-label="Visualizar em grade"
                        aria-pressed={viewMode === 'grid'}
                        title="Grade"
                        className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-90 ${
                          viewMode === 'grid'
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        aria-label="Visualizar em lista"
                        aria-pressed={viewMode === 'list'}
                        title="Lista"
                        className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-90 ${
                          viewMode === 'list'
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Ordenação */}
                    <label className="relative hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/15 text-[11px] text-slate-300 hover:border-white/30 transition-colors cursor-pointer">
                      <ArrowUpDown className="w-3 h-3" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortMode)}
                        aria-label="Ordenar arquivos"
                        className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer pr-1 [&>option]:bg-slate-900"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shrink-0 hover:shadow-[0_6px_18px_rgba(255,255,255,0.25)]"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Adicionar Arquivos</span>
                    </button>

                    <button
                      onClick={() => setShowNewFolderInput(true)}
                      className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 hover:text-white transition-all cursor-pointer shrink-0 active:scale-95"
                      title="Criar Pasta"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Inline Folder Creator */}
                {showNewFolderInput && (
                  <div className="p-3 bg-white/[0.06] border-b border-white/15 flex items-center gap-2 dh-pop">
                    <Folder className="w-4 h-4 text-white" />
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nome da nova pasta..."
                      className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white flex-1 font-sans"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="px-3 py-1.5 rounded-xl bg-white text-slate-950 font-bold text-xs cursor-pointer active:scale-95 shadow"
                    >
                      Criar
                    </button>
                    <button
                      onClick={() => setShowNewFolderInput(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Selection Action Bar (Appears when items selected) */}
                {selectedFileIds.size > 0 && (
                  <div className="p-2.5 px-4 bg-white/[0.1] border-b border-white/20 flex items-center justify-between text-xs font-sans dh-pop z-20 backdrop-blur-md">
                    <span className="text-white font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white text-slate-950 text-[10px] font-black flex items-center justify-center dh-pulse">
                        {selectedFileIds.size}
                      </span>
                      item(ns) selecionado(s)
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAskOttoAboutSelected}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md hover:shadow-[0_6px_18px_rgba(255,255,255,0.3)]"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pedir ao OTTO para analisar</span>
                      </button>

                      <button
                        onClick={handleBatchDelete}
                        className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 transition-all cursor-pointer active:scale-90"
                        title="Excluir selecionados"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Files & Folders Grid Area */}
                <div
                  key={`${currentFolderId ?? 'root'}-${viewMode}`}
                  className="dh-page-in flex-1 p-4 sm:p-5 overflow-y-auto flex flex-col gap-4"
                >
                  {/* Folders Row */}
                  {folders.length > 0 && !searchQuery && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase dh-rise">
                        Pastas ({folders.length})
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {folders.map((folder, index) => (
                          <div
                            key={folder.id}
                            className="dh-rise"
                            style={{ animationDelay: `${280 + Math.min(index, 10) * 45}ms` }}
                          >
                            <div
                              onClick={() => setCurrentFolderId(folder.id)}
                              className="dh-card p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/30 flex items-center justify-between gap-2.5 cursor-pointer group shadow-sm"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <Folder className="w-5 h-5 text-white shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform" />
                                <span className="text-xs font-semibold text-white truncate">{folder.name}</span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files Grid */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                      <span>
                        {searchQuery ? 'Resultados da busca' : 'Arquivos'} ({filteredFiles.length})
                      </span>
                      {filteredFiles.length > 0 && (
                        <button
                          onClick={handleToggleSelectAll}
                          className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-slate-300"
                        >
                          {selectedFileIds.size === filteredFiles.length ? (
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                          <span>Selecionar Todos</span>
                        </button>
                      )}
                    </div>

                    {filteredFiles.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 text-xs border border-dashed border-white/15 rounded-3xl dh-pop relative overflow-hidden">
                        <div className="relative mb-3 flex items-center justify-center">
                          <span className="dh-ring absolute w-16 h-16 rounded-full border border-white/25" />
                          <span className="dh-ring dh-ring--2 absolute w-16 h-16 rounded-full border border-white/15" />
                          <Upload className="dh-float w-9 h-9 text-white/70" />
                        </div>

                        <p className="text-white font-semibold mb-1">
                          {searchQuery ? 'Nenhum arquivo encontrado' : 'Esta pasta está vazia'}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mb-4">
                          {searchQuery
                            ? 'Tente outro termo — a busca cobre nome, conteúdo, tags e palavras-chave.'
                            : 'Arraste e solte arquivos aqui ou clique no botão abaixo para alimentar o OTTO com novos documentos e dados.'}
                        </p>

                        {searchQuery ? (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
                          >
                            Limpar busca
                          </button>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-2xl bg-white text-slate-950 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-md hover:shadow-[0_8px_22px_rgba(255,255,255,0.25)]"
                          >
                            + Adicionar Arquivos
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        className={
                          viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5'
                            : 'flex flex-col gap-2'
                        }
                      >
                        {filteredFiles.map((file, index) => {
                          const isSelected = selectedFileIds.has(file.id);
                          return (
                            <div
                              key={file.id}
                              className="dh-rise"
                              style={{ animationDelay: `${120 + Math.min(index, 12) * 40}ms` }}
                            >
                              <div
                                onClick={() => setPreviewFile(file)}
                                className={`dh-card p-3.5 rounded-2xl border cursor-pointer flex group relative h-full ${
                                  viewMode === 'list'
                                    ? 'flex-row items-center justify-between gap-4'
                                    : 'flex-col justify-between gap-3'
                                } ${
                                  isSelected
                                    ? 'bg-white/20 border-white shadow-[0_0_20px_rgba(255,255,255,0.35)]'
                                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/30 shadow-sm'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5 truncate">
                                    <div className="w-9 h-9 rounded-2xl bg-black/50 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner group-hover:border-white/40 group-hover:scale-105 transition-all">
                                      <FileIcon category={file.category} />
                                    </div>

                                    <div className="truncate min-w-0">
                                      <div className="text-xs font-bold text-white truncate group-hover:text-slate-100 transition-colors">
                                        {file.name}
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {formatBytes(file.size)}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={(e) => handleToggleSelectFile(file.id, e)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    aria-label={`Selecionar ${file.name}`}
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-white" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>

                                {/* Tags or Status Footer */}
                                <div
                                  className={`flex items-center justify-between text-[10px] font-mono text-slate-400 ${
                                    viewMode === 'list'
                                      ? 'gap-4 shrink-0 whitespace-nowrap'
                                      : 'pt-1.5 border-t border-white/[0.06]'
                                  }`}
                                >
                                  <span className="uppercase font-bold text-slate-300">{file.category}</span>

                                  {file.metadata?.isDuplicate ? (
                                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>Duplicado</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {formatDate(file.updatedAt || file.createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Drag and Drop Active Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md border-2 border-dashed border-white/80 flex flex-col items-center justify-center p-6 text-center z-40 dh-pop pointer-events-none overflow-hidden">
                    <div className="dh-scan-line" />
                    <Upload className="dh-float w-12 h-12 text-white mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Solte os arquivos para o OTTO</h3>
                    <p className="text-xs text-slate-300">
                      Eles serão indexados e disponibilizados instantaneamente no Data Hub
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Toast de upload */}
          {toast && (
            <div className="dh-toast absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-[calc(100%-2rem)] sm:w-80 rounded-2xl bg-[#0b1220]/95 backdrop-blur-xl border border-emerald-400/30 shadow-[0_18px_50px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-none">
              <div className="flex items-start gap-2.5 p-3.5">
                <CheckCircle2 className="dh-icon-pop w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">
                    {toast.count} {toast.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Já disponíveis para o OTTO analisar
                  </p>
                </div>
              </div>
              <div className="h-0.5 bg-emerald-400/20">
                <div className="dh-toast__bar h-full w-full bg-emerald-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Inspector Modal */}
      <DataHubPreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onAskOttoAboutFile={(f, prompt) => {
          if (onAskOttoAboutFiles) {
            onAskOttoAboutFiles(prompt, [f]);
          }
        }}
      />

      {/* Plan Execution Modal */}
      <DataHubPlanModal
        plan={activePlan}
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onExecute={handleExecutePlan}
        onCancel={(planId) => DataHubStorage.cancelPlan(planId)}
      />
    </>
  );
};
