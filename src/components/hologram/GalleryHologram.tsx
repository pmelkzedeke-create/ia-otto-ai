/**
 * OTTO HOLOGRAM - Gallery Hologram Component
 * Orchestrates multi-image holographic projection with interactive carousel/grid
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { ImageHologram } from './ImageHologram';

export interface GalleryHologramProps {
  images: Array<{
    url: string;
    title?: string;
    alt?: string;
    source?: string;
  }>;
  originFromMascot?: boolean;
  className?: string;
}

export const GalleryHologram: React.FC<GalleryHologramProps> = ({
  images,
  originFromMascot = false,
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const currentImage = images[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={`flex flex-col gap-2.5 w-full ${className}`}>
      {/* Top Gallery HUD Header */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300 font-semibold">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>GALERIA HOLOGRÁFICA</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
          <span>{activeIndex + 1}</span>
          <span>/</span>
          <span>{images.length}</span>
        </div>
      </div>

      {/* Main Active Holographic Image */}
      <div className="relative">
        <ImageHologram
          key={currentImage.url}
          imageUrl={currentImage.url}
          title={currentImage.title}
          alt={currentImage.alt}
          source={currentImage.source}
          aspectRatio="16/10"
          originFromMascot={originFromMascot}
        />

        {/* Carousel Prev/Next Buttons */}
        {images.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none z-30">
            <button
              onClick={handlePrev}
              className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-white/20 border border-white/25 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-90"
              title="Imagem anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-white/20 border border-white/25 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-90"
              title="Próxima imagem"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Staggered Holographic Thumbnails Strip */}
      {images.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative shrink-0 w-16 h-12 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                idx === activeIndex
                  ? 'border-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.5)] scale-105'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={img.title || ''} className="w-full h-full object-cover" />
              {idx === activeIndex && (
                <div className="absolute inset-0 bg-cyan-400/10 pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
