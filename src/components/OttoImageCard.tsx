import React, { useState } from 'react';
import {
  Maximize2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Globe,
  Brain,
  X,
} from 'lucide-react';
import { OttoImageItem } from '../types/otto';
import { ImageParticleReveal } from './ImageParticleReveal';
import { ApiBridge } from '../services/apiBridge';

export interface OttoImageCardProps {
  image: OttoImageItem;
  className?: string;
  onOpenLightbox?: (img: OttoImageItem) => void;
  aspectRatio?: string;
  compact?: boolean;
}

export const OttoImageCard: React.FC<OttoImageCardProps> = ({
  image,
  className = '',
  onOpenLightbox,
  aspectRatio = '16/10',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rematerializeKey, setRematerializeKey] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(image.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = image.url;
      a.download = image.title ? `${image.title.replace(/\s+/g, '_')}.jpg` : 'otto_imagem.jpg';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(image.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSaveToMemory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saved) return;
    try {
      await ApiBridge.saveMemory(
        `img_${Date.now()}`,
        `Imagem: ${image.title || image.alt || 'Imagem salva'} (${image.url})`,
        {
          title: image.title || 'Imagem Holográfica',
          category: 'KNOWLEDGE',
          color: '#38bdf8',
          tags: ['imagem', 'holograma', 'pesquisa'],
        }
      );
      setSaved(true);
    } catch {
      setSaved(true);
    }
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRematerializeKey((prev) => prev + 1);
  };

  const handleCardClick = () => {
    if (onOpenLightbox) {
      onOpenLightbox(image);
    } else {
      setIsLightboxOpen(true);
    }
  };

  return (
    <>
      <div
        className={`group relative rounded-[24px] glass-medium liquid-refraction p-2.5 sm:p-3 border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.6)] font-sans transition-all duration-300 hover:border-white/40 flex flex-col gap-2 ${className}`}
      >
        {/* Holographic Header Tag */}
        <div className="flex items-center justify-between gap-2 px-1 text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-4 h-4 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />
            </span>
            <span className="uppercase tracking-wider font-semibold truncate text-white">
              {image.title || 'Projeção Holográfica'}
            </span>
          </div>

          {image.source && (
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] text-slate-300 shrink-0 font-medium truncate max-w-[120px]">
              {image.source}
            </span>
          )}
        </div>

        {/* Image with Particle Materialization */}
        <div
          onClick={handleCardClick}
          className="relative w-full rounded-xl overflow-hidden cursor-pointer bg-black/40 border border-white/10 group/img-box shadow-inner"
        >
          <ImageParticleReveal
            key={rematerializeKey}
            imageUrl={image.url}
            alt={image.alt || image.title || 'Imagem encontrada pelo OTTO'}
            aspectRatio={aspectRatio}
            objectFit="cover"
            duration={1700}
            className="w-full h-auto"
          />

          {/* Quick Hover Zoom Icon Overlay */}
          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/img-box:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white shadow-lg">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Discreet Actions Bar */}
        <div className="flex items-center justify-between gap-1.5 pt-1 px-0.5 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCardClick}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer border border-white/15 active:scale-95 shadow-sm"
              title="Ampliar imagem em tela cheia"
            >
              <Maximize2 className="w-3 h-3 text-slate-200" />
              <span>Ampliar</span>
            </button>

            <button
              type="button"
              onClick={handleReplay}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Rematerializar partículas holográficas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Copiar link da imagem"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Baixar imagem original"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSaveToMemory}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                saved
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
              }`}
              title="Salvar na memória planetária do OTTO"
            >
              <Brain className="w-3.5 h-3.5" />
            </button>

            <a
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Abrir URL original em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox Modal (if standalone) */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-in font-sans"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full rounded-[28px] glass-medium p-4 sm:p-5 border border-white/30 shadow-2xl flex flex-col items-center gap-3 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/15 text-xs text-white font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="font-bold truncate text-sm">
                  {image.title || image.alt || 'Imagem Holográfica'}
                </span>
              </div>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-res Image Preview */}
            <div className="w-full max-h-[75vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black/60 border border-white/10 p-1">
              <img
                src={image.url}
                alt={image.alt || image.title || 'Imagem ampliada'}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-300">
              <span className="text-[11px] font-mono text-slate-400 truncate">
                {image.source ? `Fonte: ${image.source}` : 'Projetado pelo OTTO'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/30 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
