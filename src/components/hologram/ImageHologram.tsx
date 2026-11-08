/**
 * OTTO HOLOGRAM - Image Hologram Component
 * Photonic particle materialization of images with proxy fallback and interactive actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Download, Copy, ExternalLink, Sparkles, Check } from 'lucide-react';
import { HolographicFormation } from './HolographicFormation';
import { sampleImagePixels, SamplePoint } from './HologramParticles';

export interface ImageHologramProps {
  imageUrl: string;
  alt?: string;
  title?: string;
  source?: string;
  width?: string | number;
  height?: string | number;
  aspectRatio?: string;
  duration?: number;
  originFromMascot?: boolean;
  onComplete?: () => void;
  className?: string;
}

export const ImageHologram: React.FC<ImageHologramProps> = ({
  imageUrl,
  alt = 'Imagem Holográfica OTTO',
  title,
  source,
  width = '100%',
  height = '100%',
  aspectRatio = '16/9',
  duration = 1600,
  originFromMascot = false,
  onComplete,
  className = '',
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(imageUrl);
  const [triedProxy, setTriedProxy] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [samplePoints, setSamplePoints] = useState<SamplePoint[]>([]);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copied, setCopied] = useState(false);

  const preloaderRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setCurrentSrc(imageUrl);
    setTriedProxy(false);
    setImageLoaded(false);
    setLoadError(false);
  }, [imageUrl]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setLoadError(false);
    if (preloaderRef.current) {
      // Sample pixels for particle formation
      const points = sampleImagePixels(preloaderRef.current, 320, 180, 1200);
      setSamplePoints(points);
    }
  };

  const handleImageError = () => {
    if (!triedProxy && !currentSrc.startsWith('/api/proxy/image')) {
      setTriedProxy(true);
      setCurrentSrc(`/api/proxy/image?url=${encodeURIComponent(imageUrl)}`);
    } else {
      setLoadError(true);
      setImageLoaded(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSrc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentSrc;
    a.download = `otto-hologram-${Date.now()}.jpg`;
    a.target = '_blank';
    a.click();
  };

  return (
    <>
      {/* Hidden preloader for pixel extraction & CORS check */}
      <img
        ref={preloaderRef}
        src={currentSrc}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="hidden"
      />

      <HolographicFormation
        type="image"
        duration={duration}
        width={width}
        height={height}
        aspectRatio={aspectRatio}
        originFromMascot={originFromMascot}
        samplePoints={samplePoints}
        onComplete={onComplete}
        className={className}
      >
        <div className="relative w-full h-full group/img flex flex-col justify-end">
          <img
            src={currentSrc}
            alt={alt}
            className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover/img:scale-[1.02]"
            loading="lazy"
          />

          {/* Holographic Liquid Overlay & Interactive Action Bar */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 rounded-2xl pointer-events-none">
            {/* Top Bar: Title & Source */}
            <div className="flex items-center justify-between text-xs text-white">
              <span className="font-mono text-[11px] text-cyan-300 flex items-center gap-1.5 truncate max-w-[200px]">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                {title || 'Holograma Cristalizado'}
              </span>
              {source && (
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                  {source}
                </span>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-1.5 pointer-events-auto">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="Copiar link da imagem"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="Baixar imagem"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsZoomed(true)}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="Ampliar holograma"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </HolographicFormation>

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[88vh] rounded-3xl overflow-hidden border border-white/25 shadow-[0_20px_70px_rgba(0,0,0,0.9)]">
            <img src={currentSrc} alt={alt} className="w-full h-full object-contain" />
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/70 hover:bg-white/20 text-white text-xs font-mono border border-white/30 backdrop-blur-md cursor-pointer"
            >
              Fechar ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};
