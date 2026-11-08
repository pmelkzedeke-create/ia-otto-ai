import React, { useState } from 'react';
import {
  Sparkles,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Images,
} from 'lucide-react';
import { OttoImageItem } from '../types/otto';
import { ImageParticleReveal } from './ImageParticleReveal';

export interface OttoImageGalleryProps {
  images: OttoImageItem[];
  title?: string;
  className?: string;
}

export const OttoImageGallery: React.FC<OttoImageGalleryProps> = ({
  images,
  title,
  className = '',
}) => {
  const [activeLightboxIdx, setActiveLightboxIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  if (!images || images.length === 0) return null;

  const currentImg = activeLightboxIdx !== null ? images[activeLightboxIdx] : null;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIdx !== null) {
      setActiveLightboxIdx((activeLightboxIdx - 1 + images.length) % images.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIdx !== null) {
      setActiveLightboxIdx((activeLightboxIdx + 1) % images.length);
    }
  };

  return (
    <div
      className={`rounded-[26px] glass-medium liquid-refraction p-3.5 sm:p-4 border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.65)] font-sans flex flex-col gap-3 ${className}`}
    >
      {/* Gallery Header */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Images className="w-3 h-3 text-white" />
          </span>
          <span className="font-bold text-white tracking-tight text-xs sm:text-sm">
            {title || 'Galeria de Imagens Holográficas'}
          </span>
        </div>

        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-slate-300">
          {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
        </span>
      </div>

      {/* Grid of Holographic Images */}
      <div
        className={`grid gap-2.5 ${
          images.length === 1
            ? 'grid-cols-1'
            : images.length === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
        }`}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setActiveLightboxIdx(idx)}
            className="group/item relative rounded-xl overflow-hidden cursor-pointer bg-black/50 border border-white/15 hover:border-white/40 transition-all shadow-md flex flex-col justify-between"
          >
            {/* Particle Materialization View */}
            <div className="relative w-full aspect-[16/10] overflow-hidden">
              <ImageParticleReveal
                imageUrl={img.url}
                alt={img.alt || img.title || `Imagem ${idx + 1}`}
                aspectRatio="16/10"
                objectFit="cover"
                duration={1600 + idx * 200} // Staggered reveals for multiple images
                particleCount={images.length > 2 ? 800 : 1200}
                className="w-full h-full"
              />

              <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/item:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white shadow-lg">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Caption & Source Footer */}
            {(img.title || img.source) && (
              <div className="p-2 bg-white/[0.03] border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="truncate font-medium text-white max-w-[70%]">
                  {img.title || img.alt || `Imagem ${idx + 1}`}
                </span>
                {img.source && (
                  <span className="text-slate-400 truncate max-w-[30%]">
                    {img.source}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox Carousel Modal */}
      {currentImg && activeLightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-in font-sans"
          onClick={() => setActiveLightboxIdx(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-[30px] glass-medium p-4 sm:p-6 border border-white/30 shadow-2xl flex flex-col items-center gap-3.5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/15 text-xs text-white font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="font-bold truncate text-sm">
                  {currentImg.title || currentImg.alt || `Imagem ${activeLightboxIdx + 1}`}
                </span>
                <span className="text-slate-400 text-[11px]">
                  ({activeLightboxIdx + 1} de {images.length})
                </span>
              </div>
              <button
                onClick={() => setActiveLightboxIdx(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Carousel Image View */}
            <div className="relative w-full max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black/70 border border-white/15 p-2">
              <img
                src={currentImg.url}
                alt={currentImg.alt || currentImg.title || 'Imagem ampliada'}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl"
              />

              {/* Prev / Next Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/25 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                    title="Imagem anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/25 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                    title="Próxima imagem"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Footer Actions */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-300 flex-wrap gap-2">
              <span className="text-[11px] font-mono text-slate-400 truncate">
                {currentImg.source ? `Fonte: ${currentImg.source}` : 'Materializado pelo OTTO'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(currentImg.url)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar URL'}</span>
                </button>
                <a
                  href={currentImg.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/30 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
