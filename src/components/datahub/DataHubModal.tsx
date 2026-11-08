/**
 * OTTO DATA HUB - Master Workspace Modal
 * File tree, drag-and-drop ingestion, semantic search, planning and batch operations.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FileText,
  Upload,
  Plus,
  Search,
  Sparkles,
  Trash2,
  FolderPlus,
  Move,
  History,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
  HardDrive,
  Copy,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
  FolderOpen,
  Image as ImageIcon,
  Code,
  Table,
  Film,
  Music,
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

export const DataHubModal: React.FC<DataHubModalProps> = ({
  isOpen,
  onClose,
  onAskOttoAboutFiles,
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');

  const [files, setFiles] = useState<OttoFile[]>([]);
  const [folders, setFolders] = useState<OttoFolder[]>([]);
  const [allFolders, setAllFolders] = useState<OttoFolder[]>([]);

  const [previewFile, setPreviewFile] = useState<OttoFile | null>(null);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof DataHubStorage.createOrganizationPlan> | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync data from DataHubStorage
  const refresh = () => {
    const data = DataHubStorage.listFiles(currentFolderId);
    setFiles(data.files);
    setFolders(data.folders);
    setAllFolders(DataHubStorage.getAllFolders());
  };

  useEffect(() => {
    if (isOpen) {
      refresh();
      return DataHubStorage.subscribe(refresh);
    }
  }, [isOpen, currentFolderId]);

  if (!isOpen) return null;

  const breadcrumbs = DataHubStorage.getFolderBreadcrumbs(currentFolderId);

  // Filtered files according to search & category
  const filteredFiles = searchQuery.trim()
    ? DataHubStorage.search(searchQuery)
    : files.filter((f) => {
        if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
        return true;
      });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const uploaded = await DataHubStorage.uploadFiles(Array.from(e.target.files), currentFolderId);
      refresh();
      if (onAskOttoAboutFiles && uploaded.length > 0) {
        // Optional quick notify
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await DataHubStorage.uploadFiles(Array.from(e.dataTransfer.files), currentFolderId);
      refresh();
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
    const selectedFiles = files.filter((f) => selectedFileIds.has(f.id));
    const names = selectedFiles.map((f) => f.name).join(', ');
    onAskOttoAboutFiles(`Analise e resuma estes arquivos selecionados no Data Hub: ${names}`, selectedFiles);
    onClose();
  };

  const totalStorageSize = DataHubStorage.getAllFiles().reduce((acc, f) => acc + f.size, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in font-sans">
        <div className="relative w-full max-w-6xl rounded-[32px] glass-strong border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col h-[90vh]">
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-white shadow-inner">
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
                className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Deixar o OTTO analisar a pasta e criar plano de organização"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Organizar com OTTO</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 hover:text-white transition-colors cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Layout: Split Tree Left & Files Right */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Folder Tree & Stats */}
            <div className="hidden md:flex flex-col w-64 border-r border-white/10 bg-black/50 p-4 justify-between shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="uppercase tracking-wider text-[11px]">
                    PASTAS & LOCAIS
                  </span>
                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
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

                  {allFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all cursor-pointer truncate ${
                        currentFolderId === folder.id
                          ? 'bg-white text-slate-950 font-bold shadow-[0_4px_16px_rgba(255,255,255,0.25)]'
                          : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
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

                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'document', label: 'Documentos' },
                    { id: 'data', label: 'Dados & Planilhas' },
                    { id: 'image', label: 'Imagens' },
                    { id: 'video', label: 'Vídeos' },
                    { id: 'audio', label: 'Áudios' },
                    { id: 'code', label: 'Código' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-left transition-all cursor-pointer text-xs font-medium ${
                        selectedCategory === cat.id
                          ? 'bg-white/20 text-white font-bold border border-white/30 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Storage Diagnostic Summary */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs flex flex-col gap-1 shadow-inner">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Armazenamento Ativo</span>
                <span className="text-white font-bold text-sm">
                  {(totalStorageSize / 1024).toFixed(1)} KB
                </span>
                <span className="text-[11px] text-slate-300">
                  {DataHubStorage.getAllFiles().length} arquivos indexados
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
              className={`flex-1 flex flex-col overflow-hidden relative ${
                isDragOver ? 'bg-white/[0.06]' : ''
              }`}
            >
              {/* Toolbar */}
              <div className="p-3 sm:p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
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
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Busca semântica e conteúdo..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.08] border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white transition-all font-sans"
                    />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Adicionar Arquivos</span>
                  </button>

                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Criar Pasta"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Inline Folder Creator */}
              {showNewFolderInput && (
                <div className="p-3 bg-white/[0.06] border-b border-white/15 flex items-center gap-2">
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
                <div className="p-2.5 px-4 bg-white/[0.1] border-b border-white/20 flex items-center justify-between text-xs font-sans animate-fade-in z-20 backdrop-blur-md">
                  <span className="text-white font-semibold">
                    {selectedFileIds.size} item(ns) selecionado(s)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAskOttoAboutSelected}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pedir ao OTTO para analisar</span>
                    </button>

                    <button
                      onClick={handleBatchDelete}
                      className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 transition-colors cursor-pointer"
                      title="Excluir selecionados"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Files & Folders Grid Area */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
                {/* Folders Row */}
                {folders.length > 0 && !searchQuery && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                      Pastas ({folders.length})
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {folders.map((folder) => (
                        <div
                          key={folder.id}
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/25 flex items-center justify-between gap-2.5 cursor-pointer transition-all group shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Folder className="w-5 h-5 text-white shrink-0 group-hover:scale-105 transition-transform" />
                            <span className="text-xs font-semibold text-white truncate">
                              {folder.name}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files Grid */}
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    <span>Arquivos ({filteredFiles.length})</span>
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
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 text-xs border border-dashed border-white/15 rounded-3xl">
                      <Upload className="w-10 h-10 mb-2 opacity-30 text-white animate-bounce" />
                      <p className="text-white font-semibold mb-1">Esta pasta está vazia</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mb-4">
                        Arraste e solte arquivos aqui ou clique no botão abaixo para alimentar o OTTO com novos documentos e dados.
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-2xl bg-white text-slate-950 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-md"
                      >
                        + Adicionar Arquivos
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filteredFiles.map((file) => {
                        const isSelected = selectedFileIds.has(file.id);
                        return (
                          <div
                            key={file.id}
                            onClick={() => setPreviewFile(file)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group relative ${
                              isSelected
                                ? 'bg-white/20 border-white shadow-[0_0_20px_rgba(255,255,255,0.35)]'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/25 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-9 h-9 rounded-2xl bg-black/50 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                                  {file.category === 'video' && <Film className="w-4 h-4 text-white" />}
                                  {file.category === 'audio' && <Music className="w-4 h-4 text-white" />}
                                  {file.category === 'image' && <ImageIcon className="w-4 h-4 text-white" />}
                                  {file.category === 'code' && <Code className="w-4 h-4 text-white" />}
                                  {file.category === 'data' && <Table className="w-4 h-4 text-white" />}
                                  {file.category !== 'image' && file.category !== 'code' && file.category !== 'data' && file.category !== 'video' && file.category !== 'audio' && (
                                    <FileText className="w-4 h-4 text-white" />
                                  )}
                                </div>

                                <div className="truncate min-w-0">
                                  <div className="text-xs font-bold text-white truncate group-hover:text-slate-100 transition-colors">
                                    {file.name}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={(e) => handleToggleSelectFile(file.id, e)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-white" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {/* Tags or Status Footer */}
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-white/[0.06]">
                              <span className="uppercase font-bold text-slate-300">
                                {file.category}
                              </span>

                              {file.metadata?.isDuplicate ? (
                                <span className="text-amber-400 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Duplicado</span>
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-medium">Pronto</span>
                              )}
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
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md border-2 border-dashed border-white flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in pointer-events-none">
                  <Upload className="w-12 h-12 text-white animate-bounce mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">
                    Solte os arquivos para o OTTO
                  </h3>
                  <p className="text-xs text-slate-300">
                    Eles serão indexados e disponibilizados instantaneamente no Data Hub
                  </p>
                </div>
              )}
            </div>
          </div>
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
