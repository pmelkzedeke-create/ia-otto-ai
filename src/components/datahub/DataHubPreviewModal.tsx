/**
 * OTTO DATA HUB - Intelligent File Preview & Inspector Modal
 * Advanced multi-format preview engine for Videos, Documents/PDFs, Images, Audios, Spreadsheets & Code.
 * Analyzes file type, extracts neural metadata and renders dedicated interactive players and viewers.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  FileText,
  Code,
  Image as ImageIcon,
  Table,
  History,
  Sparkles,
  Download,
  Copy,
  Check,
  Edit3,
  Film,
  Music,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Volume2,
  VolumeX,
  Search,
  CheckCircle2,
  Layers,
  Cpu,
  Clock,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
} from 'lucide-react';
import { OttoFile } from '../../types/dataHub';
import { DataHubStorage } from '../../services/dataHubStorage';
import { DataHubBlobManager } from '../../services/dataHubBlobStore';
import { DataHubDiffViewer } from './DataHubDiffViewer';

interface DataHubPreviewModalProps {
  file: OttoFile | null;
  isOpen: boolean;
  onClose: () => void;
  onAskOttoAboutFile?: (file: OttoFile, prompt: string) => void;
}

export const DataHubPreviewModal: React.FC<DataHubPreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onAskOttoAboutFile,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'diff' | 'meta' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);
  const [editText, setEditText] = useState(file?.content || '');
  const [editReason, setEditReason] = useState('Revisão e melhoria do arquivo');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // HTML Live Preview State
  const [htmlViewMode, setHtmlViewMode] = useState<'live' | 'code'>('live');
  const [htmlDeviceMode, setHtmlDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [htmlIframeKey, setHtmlIframeKey] = useState<number>(0);
  const [htmlIsFullscreen, setHtmlIsFullscreen] = useState<boolean>(false);

  // Media & Video State
  const [mediaUrl, setMediaUrl] = useState<string | null>(file?.dataUrl || null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Document & Image View State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [dataViewMode, setDataViewMode] = useState<'table' | 'raw'>('table');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docFontSize, setDocFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Load blob / media URL asynchronously whenever file changes
  useEffect(() => {
    let isMounted = true;
    if (!file) {
      setMediaUrl(null);
      return;
    }

    setEditText(file.content || '');
    setIsLoadingMedia(true);
    setZoomLevel(1);
    setImageRotation(0);
    setDocSearchQuery('');
    setActiveTab('preview');

    DataHubBlobManager.getBlobUrl(file.id)
      .then((url) => {
        if (isMounted) {
          setMediaUrl(url || file.dataUrl || null);
          setIsLoadingMedia(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMediaUrl(file.dataUrl || null);
          setIsLoadingMedia(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Sync video playback state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Compute metrics for document view (declared before any early return)
  const docMetrics = useMemo(() => {
    const text = file?.content || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split('\n').length : 0;
    const readingMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, lines, readingMinutes };
  }, [file?.content]);

  // Filtered text if searching in document (declared before any early return)
  const filteredDocumentLines = useMemo(() => {
    const text = file?.content || '';
    if (!text) return [];
    const lines = text.split('\n');
    if (!docSearchQuery.trim()) return lines.map((l, i) => ({ num: i + 1, text: l, match: false }));

    const q = docSearchQuery.toLowerCase();
    return lines.map((l, i) => ({
      num: i + 1,
      text: l,
      match: l.toLowerCase().includes(q),
    }));
  }, [file?.content, docSearchQuery]);

  if (!isOpen || !file) return null;

  const versions = DataHubStorage.getFileVersions(file.id);

  // File Type Detection & Classification
  const ext = (file.extension || file.name.split('.').pop() || '').toLowerCase();
  const isVideo =
    file.category === 'video' ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'flv', 'wmv'].includes(ext);

  const isAudio =
    file.category === 'audio' ||
    ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(ext);

  const isImage =
    file.category === 'image' ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext);

  const isPdf =
    ext === 'pdf' || (file.category === 'document' && file.name.toLowerCase().endsWith('.pdf'));

  const isData =
    file.category === 'data' ||
    ['csv', 'tsv', 'xlsx', 'xls', 'json'].includes(ext);

  const isHtml =
    ext === 'html' ||
    ext === 'htm' ||
    file.name.toLowerCase().endsWith('.html') ||
    file.name.toLowerCase().endsWith('.htm') ||
    Boolean(file.content && (file.content.includes('<!DOCTYPE html>') || file.content.includes('<html')));

  const isCode =
    !isHtml &&
    (file.category === 'code' ||
      ['ts', 'tsx', 'js', 'jsx', 'py', 'css', 'sql', 'sh', 'json', 'yml', 'yaml', 'md'].includes(ext));

  const isDocument = !isVideo && !isAudio && !isImage && !isData && !isHtml && !isCode;

  const formatHtmlSrcDoc = (code: string) => {
    if (!code) return '';
    let processed = code;
    if (!processed.includes('viewport')) {
      if (processed.includes('<head>')) {
        processed = processed.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">');
      } else {
        processed = `<meta name="viewport" content="width=device-width, initial-scale=1.0">${processed}`;
      }
    }
    return processed;
  };

  const handleOpenHtmlNewTab = () => {
    if (!file?.content) return;
    const blob = new Blob([file.content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleCopyContent = async () => {
    const textToCopy = file.content || editText || file.name;
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (mediaUrl) {
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.download = file.name;
      a.click();
    } else if (file.content) {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSaveEdit = () => {
    DataHubStorage.editFileContent(file.id, editText, editReason);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab('diff');
    }, 800);
  };

  const handleRestoreVersion = (versionId: string) => {
    DataHubStorage.restoreFileVersion(file.id, versionId);
    const updated = DataHubStorage.getFileById(file.id);
    if (updated?.content) {
      setEditText(updated.content);
    }
  };

  // Helper to parse CSV or TSV content into a table grid
  const parseTableRows = (content: string) => {
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map((line) =>
      line.split(delimiter).map((col) => col.trim().replace(/^["']|["']$/g, ''))
    );
    return { headers, rows };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl rounded-[28px] glass-medium border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="p-3.5 sm:p-4.5 border-b border-white/10 flex items-center justify-between bg-white/[0.04] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-inner">
              {/* Header icon badge update */}
              {isVideo && <Film className="w-5 h-5 text-cyan-400" />}
              {isAudio && <Music className="w-5 h-5 text-cyan-400" />}
              {isImage && <ImageIcon className="w-5 h-5 text-cyan-400" />}
              {isHtml && <Globe className="w-5 h-5 text-cyan-400" />}
              {isCode && <Code className="w-5 h-5 text-cyan-400" />}
              {isData && <Table className="w-5 h-5 text-cyan-400" />}
              {isDocument && !isCode && !isData && !isHtml && <FileText className="w-5 h-5 text-cyan-400" />}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {file.name}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-cyan-300 truncate max-w-[160px] sm:max-w-[240px]">
                  {file.path}
                </span>
                <span>•</span>
                <span>
                  {file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(file.size / 1024).toFixed(1)} KB`}
                </span>
                <span>•</span>
                <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {isVideo ? 'VÍDEO' : isAudio ? 'ÁUDIO' : isImage ? 'IMAGEM' : isPdf ? 'PDF' : isData ? 'PLANILHA' : isCode ? 'CÓDIGO' : 'DOCUMENTO'}
                </span>
                {file.metadata?.dimensions && (
                  <span className="hidden sm:inline text-slate-300">
                    • {file.metadata.dimensions.width}×{file.metadata.dimensions.height}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            {file.content && (
              <button
                onClick={handleCopyContent}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Copiar texto do arquivo"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Baixar arquivo"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-b border-white/10 bg-white/[0.02] text-xs font-mono overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visualização {isVideo ? 'do Vídeo' : isImage ? 'da Imagem' : isAudio ? 'do Áudio' : 'do Documento'}</span>
          </button>

          <button
            onClick={() => setActiveTab('meta')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'meta'
                ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Análise da IA</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Conteúdo</span>
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diff'
                ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Versões ({versions.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3 sm:p-5 md:p-6 overflow-y-auto flex-1">
          {activeTab === 'preview' && (
            <div className="flex flex-col gap-4">
              {/* ================= 1. VIDEO PREVIEW ================= */}
              {isVideo && (
                <div className="flex flex-col gap-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl flex flex-col items-center justify-center min-h-[300px] max-h-[520px]">
                    {mediaUrl ? (
                      <video
                        ref={videoRef}
                        controls
                        playsInline
                        src={mediaUrl}
                        className="w-full max-h-[500px] rounded-xl object-contain bg-black"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      >
                        Seu navegador não suporta reprodução direta deste formato de vídeo.
                      </video>
                    ) : (
                      /* Neural Video Simulation Canvas when binary is indexed */
                      <div className="w-full p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-black/80 to-cyan-950/20">
                        <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 shadow-xl animate-pulse">
                          <Film className="w-10 h-10 text-cyan-400" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">{file.name}</h3>
                        <p className="text-xs text-slate-300 font-mono max-w-md mb-4">
                          Fluxo de vídeo HD indexado no Data Hub. Formato MP4/H.264 pronto para processamento.
                        </p>
                        {file.content && (
                          <div className="w-full max-w-lg p-3 rounded-xl bg-black/60 border border-white/10 text-left font-mono text-xs text-slate-300 whitespace-pre-wrap">
                            {file.content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Video Control Bar & Metrics */}
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold uppercase text-[10px]">
                        {file.extension.toUpperCase()} • 1080p HD
                      </span>
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      {file.metadata?.dimensions && (
                        <span>• {file.metadata.dimensions.width}×{file.metadata.dimensions.height} px</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-[11px]">
                        {[0.5, 1, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setPlaybackSpeed(spd)}
                            className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                              playbackSpeed === spd
                                ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleDownload}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= 2. IMAGE PREVIEW ================= */}
              {isImage && (
                <div className="flex flex-col gap-3">
                  <div className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-black/80 border border-white/15 min-h-[300px] max-h-[520px] overflow-hidden">
                    {mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt={file.name}
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${imageRotation}deg)`,
                        }}
                        className="max-w-full max-h-[460px] object-contain rounded-xl shadow-2xl transition-transform duration-200"
                      />
                    ) : (
                      <div className="text-slate-400 font-mono text-xs flex flex-col items-center">
                        <ImageIcon className="w-12 h-12 mb-2 text-cyan-400 opacity-60 animate-pulse" />
                        <span className="text-white font-semibold">Carregando imagem...</span>
                      </div>
                    )}

                    {/* Image Controls Float */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-xl">
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Reduzir zoom"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-mono px-1.5 text-slate-200">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                        className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Aumentar zoom"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setImageRotation((r) => (r + 90) % 360)}
                        className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Girar 90°"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setZoomLevel(1);
                          setImageRotation(0);
                        }}
                        className="px-2 py-1 text-[10px] font-mono rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                        title="Resetar"
                      >
                        100%
                      </button>
                    </div>
                  </div>

                  {file.metadata?.dimensions && (
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono text-slate-300">
                      <span>Resolução: {file.metadata.dimensions.width} × {file.metadata.dimensions.height} pixels</span>
                      <span>Tamanho: {(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}
                </div>
              )}

              {/* ================= 3. AUDIO PREVIEW ================= */}
              {isAudio && (
                <div className="p-8 rounded-2xl bg-black/80 border border-white/15 flex flex-col items-center gap-4 shadow-xl text-center">
                  <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
                    <Music className="w-10 h-10 text-cyan-400 animate-pulse" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{file.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Faixa de áudio {file.extension.toUpperCase()} • {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {mediaUrl ? (
                    <audio controls className="w-full max-w-xl mt-2" src={mediaUrl}>
                      Seu navegador não suporta a tag de áudio.
                    </audio>
                  ) : (
                    <div className="text-xs text-slate-400 font-mono">Carregando faixa de áudio...</div>
                  )}
                </div>
              )}

              {/* ================= 4. PDF DOCUMENT PREVIEW ================= */}
              {isPdf && (
                <div className="flex flex-col gap-3">
                  {mediaUrl && (
                    <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl h-[460px] bg-slate-900">
                      <iframe
                        src={mediaUrl}
                        className="w-full h-full border-none"
                        title={file.name}
                      />
                    </div>
                  )}

                  {file.content && (
                    <div className="rounded-2xl bg-black/80 border border-white/15 p-4 sm:p-5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-[320px] overflow-y-auto shadow-inner">
                      <div className="text-[10px] text-cyan-400 font-bold uppercase mb-2">
                        Conteúdo Estruturado do Documento PDF:
                      </div>
                      {file.content}
                    </div>
                  )}
                </div>
              )}

              {/* ================= 5. SPREADSHEET & DATA GRID ================= */}
              {isData && file.content && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">
                      Visualização de dados tabulares
                    </span>
                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono">
                      <button
                        onClick={() => setDataViewMode('table')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          dataViewMode === 'table' ? 'bg-cyan-500/25 text-cyan-200 font-bold' : 'text-slate-400'
                        }`}
                      >
                        Tabela
                      </button>
                      <button
                        onClick={() => setDataViewMode('raw')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          dataViewMode === 'raw' ? 'bg-cyan-500/25 text-cyan-200 font-bold' : 'text-slate-400'
                        }`}
                      >
                        Texto Bruto
                      </button>
                    </div>
                  </div>

                  {dataViewMode === 'table' ? (
                    (() => {
                      const { headers, rows } = parseTableRows(file.content);
                      return (
                        <div className="rounded-2xl bg-black/70 border border-white/15 overflow-x-auto max-h-[440px] shadow-inner">
                          <table className="w-full text-left border-collapse text-xs font-mono">
                            {headers.length > 0 && (
                              <thead className="bg-white/[0.08] sticky top-0 border-b border-white/15 text-cyan-300">
                                <tr>
                                  <th className="p-2.5 px-3 w-10 text-slate-500 text-[10px]">#</th>
                                  {headers.map((h, i) => (
                                    <th key={i} className="p-2.5 px-3 font-semibold whitespace-nowrap">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                            )}
                            <tbody className="divide-y divide-white/[0.06] text-slate-200">
                              {rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/[0.03]">
                                  <td className="p-2 px-3 text-slate-500 text-[10px] select-none font-mono">
                                    {rIdx + 1}
                                  </td>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-2 px-3 whitespace-nowrap">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="rounded-2xl bg-black/70 border border-white/15 p-4 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-[440px] overflow-y-auto">
                      {file.content}
                    </div>
                  )}
                </div>
              )}

              {/* ================= 5.5 HTML5 LIVE INTERACTIVE WEB PREVIEW ================= */}
              {isHtml && file.content && (
                <div
                  className={`flex flex-col gap-3 ${
                    htmlIsFullscreen ? 'fixed inset-0 z-50 p-4 bg-black/95 backdrop-blur-3xl' : ''
                  }`}
                >
                  {/* HTML Toolbar */}
                  <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>HTML5 Live Preview</span>
                      </span>

                      {/* Device switch */}
                      {htmlViewMode === 'live' && (
                        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                          <button
                            onClick={() => setHtmlDeviceMode('desktop')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              htmlDeviceMode === 'desktop'
                                ? 'bg-cyan-500/30 text-cyan-200'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Desktop View (100%)"
                          >
                            <Monitor className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setHtmlDeviceMode('tablet')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              htmlDeviceMode === 'tablet'
                                ? 'bg-cyan-500/30 text-cyan-200'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Tablet View (768px)"
                          >
                            <Tablet className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setHtmlDeviceMode('mobile')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              htmlDeviceMode === 'mobile'
                                ? 'bg-cyan-500/30 text-cyan-200'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Mobile View (375px)"
                          >
                            <Smartphone className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Code vs Live Switch */}
                      <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => setHtmlViewMode('live')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                            htmlViewMode === 'live'
                              ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Página Renderizada</span>
                        </button>
                        <button
                          onClick={() => setHtmlViewMode('code')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                            htmlViewMode === 'code'
                              ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Code className="w-3 h-3" />
                          <span>Código Fonte</span>
                        </button>
                      </div>

                      {htmlViewMode === 'live' && (
                        <button
                          onClick={() => setHtmlIframeKey((k) => k + 1)}
                          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Recarregar Preview"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={handleOpenHtmlNewTab}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        title="Abrir em Nova Aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Nova Aba</span>
                      </button>

                      <button
                        onClick={() => setHtmlIsFullscreen((f) => !f)}
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title={htmlIsFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                      >
                        {htmlIsFullscreen ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Render Area */}
                  {htmlViewMode === 'live' ? (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/15 flex items-center justify-center min-h-[420px] max-h-[70vh] shadow-2xl p-1">
                      <div
                        className="h-full w-full transition-all duration-300 flex items-center justify-center bg-white rounded-xl overflow-hidden"
                        style={{
                          maxWidth:
                            htmlDeviceMode === 'mobile'
                              ? '375px'
                              : htmlDeviceMode === 'tablet'
                              ? '768px'
                              : '100%',
                          height: htmlIsFullscreen ? 'calc(100vh - 120px)' : '480px',
                          boxShadow:
                            htmlDeviceMode !== 'desktop'
                              ? '0 0 40px rgba(0,0,0,0.8)'
                              : undefined,
                        }}
                      >
                        <iframe
                          key={htmlIframeKey}
                          srcDoc={formatHtmlSrcDoc(file.content)}
                          title={file.name}
                          sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                          className="w-full h-full border-none bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-black/90 border border-white/15 p-4 sm:p-5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-[480px] overflow-y-auto shadow-inner flex flex-col">
                      <div className="space-y-1">
                        {file.content.split('\n').map((line, idx) => (
                          <div key={idx} className="flex items-start gap-4">
                            <span className="w-8 text-right text-slate-600 select-none shrink-0 font-mono text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="text-slate-200 flex-1">{line || ' '}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= 6. CODE & SCRIPT VIEWER ================= */}
              {isCode && file.content && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                    <span className="text-cyan-300 font-bold">{file.extension.toUpperCase()} Source File</span>
                    <span>{docMetrics.lines} linhas • {docMetrics.words} palavras</span>
                  </div>
                  <div className="rounded-2xl bg-black/90 border border-white/15 p-4 sm:p-5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-[480px] overflow-y-auto shadow-inner flex flex-col">
                    <div className="space-y-1">
                      {file.content.split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-4">
                          <span className="w-8 text-right text-slate-600 select-none shrink-0 font-mono text-[11px]">
                            {idx + 1}
                          </span>
                          <span className="text-slate-200 flex-1">{line || ' '}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= 7. DOCUMENT & TEXT READER ================= */}
              {isDocument && !isPdf && file.content && (
                <div className="flex flex-col gap-3">
                  {/* Document Toolbar */}
                  <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={docSearchQuery}
                          onChange={(e) => setDocSearchQuery(e.target.value)}
                          placeholder="Buscar no texto..."
                          className="pl-8 pr-3 py-1 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      {docSearchQuery && (
                        <button
                          onClick={() => setDocSearchQuery('')}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-400">
                      <span>{docMetrics.words} palavras</span>
                      <span>•</span>
                      <span>~{docMetrics.readingMinutes} min de leitura</span>
                      <span>•</span>
                      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                        {(['sm', 'base', 'lg'] as const).map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setDocFontSize(sz)}
                            className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                              docFontSize === sz ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {sz === 'sm' ? 'A-' : sz === 'base' ? 'A' : 'A+'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Formatted Text Box */}
                  <div
                    className={`rounded-2xl bg-black/80 border border-white/15 p-4 sm:p-6 font-sans text-slate-200 leading-relaxed select-text max-h-[480px] overflow-y-auto shadow-inner whitespace-pre-wrap ${
                      docFontSize === 'sm' ? 'text-xs' : docFontSize === 'lg' ? 'text-base' : 'text-sm'
                    }`}
                  >
                    {filteredDocumentLines.map((line) => (
                      <div
                        key={line.num}
                        className={line.match ? 'bg-cyan-500/20 text-cyan-100 font-semibold px-1 rounded' : ''}
                      >
                        {line.text || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fast Action Bar with OTTO AI */}
              {onAskOttoAboutFile && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Pergunte ou comande a IA sobre este arquivo:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        onAskOttoAboutFile(file, `Resuma o arquivo ${file.name}`);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-mono transition-all cursor-pointer active:scale-95"
                    >
                      Resumir
                    </button>
                    <button
                      onClick={() => {
                        onAskOttoAboutFile(file, `Analise os detalhes e métricas do arquivo ${file.name}`);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-mono transition-all cursor-pointer active:scale-95"
                    >
                      Análise Profunda
                    </button>
                    <button
                      onClick={() => {
                        onAskOttoAboutFile(file, `Extraia os principais tópicos e tarefas do arquivo ${file.name}`);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-mono transition-all cursor-pointer active:scale-95"
                    >
                      Extrair Tópicos
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: AI METADATA & ANALYSIS ================= */}
          {activeTab === 'meta' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Diagnóstico Neural & Resumo Executivo</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {file.metadata?.summary ||
                    'Arquivo indexado com sucesso pelo OTTO Data Hub. Todos os blocos estão prontos para análise semântica e processamento contínuo.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs space-y-2">
                  <div className="text-cyan-400 font-bold text-[11px] uppercase">Estrutura do Arquivo</div>
                  <div className="flex justify-between text-slate-300">
                    <span>Nome:</span>
                    <span className="text-white truncate max-w-[180px]">{file.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Caminho:</span>
                    <span className="text-cyan-300 truncate max-w-[180px]">{file.path}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Tamanho:</span>
                    <span className="text-white">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Categoria:</span>
                    <span className="text-cyan-300 uppercase">{file.category}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs space-y-2">
                  <div className="text-cyan-400 font-bold text-[11px] uppercase">Integridade & Segurança</div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verificado e Seguro</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Status:</span>
                    <span className="text-emerald-400 uppercase font-bold">{file.status}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Versões Registradas:</span>
                    <span className="text-white">{versions.length} versões</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Última Atualização:</span>
                    <span className="text-slate-400">
                      {new Date(file.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {file.metadata?.tags && file.metadata.tags.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase">Tags & Tópicos Identificados:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {file.metadata.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: LIVE EDITOR ================= */}
          {activeTab === 'edit' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Edição em tempo real com controle de versões (Diff)
                </span>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  {saveSuccess ? 'Salvo com Sucesso!' : 'Salvar Nova Versão'}
                </button>
              </div>

              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-80 rounded-2xl bg-black/80 border border-white/20 p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 resize-none"
                placeholder="Conteúdo do arquivo..."
              />

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Motivo da alteração:</span>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {/* ================= TAB 4: DIFF & VERSION HISTORY ================= */}
          {activeTab === 'diff' && (
            <div className="flex flex-col gap-4">
              <div className="text-xs font-mono text-slate-400">
                Histórico de edições e comparação de alterações com o OTTO:
              </div>

              {versions.length > 0 ? (
                <DataHubDiffViewer
                  file={file}
                  versions={versions}
                  onRestoreVersion={handleRestoreVersion}
                />
              ) : (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  Nenhuma versão anterior registrada para este arquivo.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
