import React, { useState } from 'react';
import {
  Globe,
  Image as ImageIcon,
  ExternalLink,
  BookOpen,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Brain,
  Info,
} from 'lucide-react';
import { KnowledgeCard } from '../types/otto';
import { ttsEngine } from '../services/ttsEngine';
import { ApiBridge } from '../services/apiBridge';
import { ImageParticleReveal } from './ImageParticleReveal';

interface KnowledgeCardViewerProps {
  card: KnowledgeCard;
  onOpenArticleReader?: (title: string, url: string, content?: string) => void;
  onExploreQuery?: (query: string) => void;
  compact?: boolean;
}

export const KnowledgeCardViewer: React.FC<KnowledgeCardViewerProps> = ({
  card,
  onOpenArticleReader,
  onExploreQuery,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<{ url: string; caption?: string } | null>(null);
  const [savedToMemory, setSavedToMemory] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopy = () => {
    const textToCopy = `${card.title} - ${card.subtitle || ''}\n\n${card.summary}\n\nFontes:\n${(card.sources || []).map((s) => `- ${s.title}: ${s.url}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
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
    await ttsEngine.speak(card.summary);
    setSpeaking(false);
  };

  const handleSaveMemory = async () => {
    if (savedToMemory) return;
    try {
      await ApiBridge.saveMemory(
        `knowledge_${card.title.toLowerCase().replace(/\s+/g, '_')}`,
        `${card.subtitle ? `[${card.subtitle}] ` : ''}${card.summary}`,
        {
          title: card.title,
          category: 'KNOWLEDGE',
          color: '#38bdf8',
          tags: ['conhecimento', 'web', card.title.toLowerCase()],
        }
      );
      setSavedToMemory(true);
    } catch {
      setSavedToMemory(true);
    }
  };

  return (
    <div className="w-full rounded-[28px] glass-medium liquid-refraction p-4 sm:p-5 border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.6)] font-sans relative overflow-hidden transition-all duration-300 animate-fade-in group">
      {/* Specular Ambient Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/[0.04] blur-3xl pointer-events-none -z-10" />

      {/* Top Header & Badges */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-sm">
            <Globe className="w-3.5 h-3.5 animate-spin-slow" />
          </span>
          <span className="text-[10px] font-mono tracking-widest text-slate-200 uppercase font-semibold flex items-center gap-1.5">
            <span>CONHECIMENTO WEB EM TEMPO REAL</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        </div>

        {card.category && (
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono text-slate-300 font-medium">
            {card.category}
          </span>
        )}
      </div>

      {/* Main Content Layout: Hero Image + Info */}
      <div className={`flex flex-col ${card.heroImage ? 'sm:flex-row gap-4 sm:gap-5' : 'gap-3'} items-start`}>
        {/* Hero Image Thumbnail with Particle Hologram Reveal */}
        {card.heroImage && (
          <div
            className="relative w-full sm:w-44 h-48 sm:h-44 rounded-2xl overflow-hidden border border-white/25 shadow-xl shrink-0 group/img bg-slate-950/60 cursor-pointer"
            onClick={() => setSelectedGalleryImg({ url: card.heroImage!, caption: card.title })}
          >
            <ImageParticleReveal
              imageUrl={card.heroImage}
              alt={card.title}
              objectFit="cover"
              duration={1600}
              className="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white font-mono px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 z-20">
              <span className="truncate">Foto Oficial</span>
              <Maximize2 className="w-3 h-3 text-slate-300 group-hover/img:text-white shrink-0 ml-1" />
            </div>
          </div>
        )}

        {/* Text & Key Facts Column */}
        <div className="flex-1 w-full space-y-2.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{card.title}</span>
            </h3>
            {card.subtitle && (
              <div className="text-xs text-slate-300 font-medium font-sans mt-0.5">
                {card.subtitle}
              </div>
            )}
          </div>

          {/* Spoken Summary */}
          <div className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-sans">
            {isExpanded && card.fullExtract ? card.fullExtract : card.summary}
          </div>

          {/* Key Facts Pill Grid */}
          {card.keyFacts && card.keyFacts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-white/10 text-xs">
              {card.keyFacts.map((fact, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2 shadow-sm"
                >
                  <Info className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 block leading-tight">
                      {fact.label}
                    </span>
                    <span className="text-xs font-semibold text-white truncate block">
                      {fact.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Image Gallery (if present) */}
      {card.images && card.images.length > 1 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3 text-slate-300" />
            <span>GALERIA DE IMAGENS & DOCUMENTOS</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {card.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedGalleryImg(img)}
                className="relative w-20 h-16 rounded-xl overflow-hidden border border-white/20 shrink-0 cursor-pointer group/thumb hover:border-white transition-all shadow-md"
              >
                <img
                  src={img.url}
                  alt={img.caption || `Imagem ${idx + 1}`}
                  className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-transparent transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sources & Citations Section */}
      {card.sources && card.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-slate-300" />
              <span>FONTES & ARTIGOS CONSULTADOS (LEITURA INTEGRADA)</span>
            </div>
            <span className="text-[9px] text-slate-400">Sem sair do site</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {card.sources.map((src, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all flex flex-col justify-between gap-1.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-white leading-tight line-clamp-1">
                    {src.title}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 shrink-0 border border-white/15">
                    {src.domain}
                  </span>
                </div>

                {src.snippet && (
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                    {src.snippet}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenArticleReader?.(src.title, src.url, src.snippet || card.fullExtract || card.summary)
                    }
                    className="flex-1 py-1 px-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm border border-white/20"
                  >
                    <BookOpen className="w-3 h-3 text-slate-200" />
                    <span>Ler no OTTO</span>
                  </button>

                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Abrir em nova aba (externo)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Explorations Chips */}
      {card.relatedQueries && card.relatedQueries.length > 0 && (
        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-300" />
            <span>Explorar:</span>
          </span>
          {card.relatedQueries.map((rq, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onExploreQuery?.(rq)}
              className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/15 text-slate-300 hover:text-white border border-white/15 text-[11px] font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              {rq}
            </button>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSpeak}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-all cursor-pointer shadow-sm ${
              speaking
                ? 'bg-white text-black font-bold border-white animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{speaking ? 'Parar Voz' : 'Ouvir Resumo'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 font-medium transition-all cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveMemory}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-all cursor-pointer shadow-sm ${
              savedToMemory
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
            }`}
            title="Salvar no mapa mental planetário de memórias"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{savedToMemory ? 'Salvo na Memória' : 'Salvar Memória'}</span>
          </button>
        </div>

        {card.fullExtract && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Ver Menos' : 'Ver Artigo Completo'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {selectedGalleryImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
          onClick={() => setSelectedGalleryImg(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-3xl glass-medium p-4 border border-white/30 shadow-2xl flex flex-col items-center gap-3 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-white/15 text-xs text-white font-mono">
              <span className="truncate">{card.title}</span>
              <button
                onClick={() => setSelectedGalleryImg(null)}
                className="p-1 rounded-full hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="w-full max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black/50 border border-white/10">
              <img
                src={selectedGalleryImg.url}
                alt={selectedGalleryImg.caption || card.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            {selectedGalleryImg.caption && (
              <div className="text-xs text-slate-200 text-center font-sans">
                {selectedGalleryImg.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
