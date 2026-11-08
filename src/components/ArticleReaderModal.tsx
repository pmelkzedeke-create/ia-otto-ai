import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Globe,
  ExternalLink,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ttsEngine } from '../services/ttsEngine';

interface ArticleReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  initialContent?: string;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  isOpen,
  onClose,
  title,
  url,
  initialContent = '',
}) => {
  const [content, setContent] = useState<string>(initialContent);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      // If we have a Wikipedia or web URL, attempt to fetch richer article extract
      if (url && (url.includes('wikipedia.org') || !initialContent || initialContent.length < 300)) {
        loadRichArticle(url, title);
      }
    }
  }, [isOpen, url, title, initialContent]);

  const loadRichArticle = async (targetUrl: string, articleTitle: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/web/article-preview?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(articleTitle)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.extract) {
          setContent(data.extract);
        }
      }
    } catch {
      // Keep initial content
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${title}\n\n${content}\n\nFonte: ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = async () => {
    if (speaking) {
      ttsEngine.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await ttsEngine.speak(content.slice(0, 800));
    setSpeaking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 liquid-glass-overlay font-sans animate-fade-in">
      <div
        className={`relative w-full rounded-[32px] liquid-glass-modal liquid-refraction flex flex-col transition-all duration-300 shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/20 ${
          isMaximized ? 'h-[96vh] max-w-5xl' : 'max-h-[85vh] max-w-2xl h-[640px]'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
              <BookOpen className="w-4 h-4 text-slate-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase font-semibold">
                  LEITOR INTEGRADO OTTO
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-8 h-8 rounded-full liquid-glass-btn flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full liquid-glass-btn flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeak}
              className={`px-3 py-1 rounded-xl text-xs flex items-center gap-1.5 font-medium transition-all cursor-pointer border ${
                speaking
                  ? 'bg-white text-black font-bold border-white animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{speaking ? 'Parar Voz' : 'Ouvir Artigo'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Globe className="w-3 h-3" />
              <span className="truncate max-w-[180px]">{url.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-200 leading-relaxed font-sans text-xs sm:text-sm">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
              <Sparkles className="w-6 h-6 text-white animate-spin-slow" />
              <span className="text-xs font-mono">Carregando conteúdo enciclopédico da web...</span>
            </div>
          ) : (
            <div className="space-y-4 whitespace-pre-line leading-relaxed">
              {content || 'Nenhum texto adicional disponível para este artigo.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
          <span>OTTO Neural Web Reader • Sem anúncios ou rastreadores</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-sans text-xs font-medium cursor-pointer transition-all border border-white/20"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
