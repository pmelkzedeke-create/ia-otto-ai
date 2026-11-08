/**
 * OTTO HOLOGRAM - Text Hologram Component
 * Photonic particle materialization forming letters/words into accessible HTML text
 */

import React, { useMemo } from 'react';
import { Copy, Sparkles, Check } from 'lucide-react';
import { HolographicFormation } from './HolographicFormation';
import { sampleTextPixels } from './HologramParticles';

export interface TextHologramProps {
  text: string;
  subtitle?: string;
  category?: string;
  duration?: number;
  originFromMascot?: boolean;
  onComplete?: () => void;
  className?: string;
}

export const TextHologram: React.FC<TextHologramProps> = ({
  text,
  subtitle,
  category = 'DADO HOLOGRÁFICO',
  duration = 1400,
  originFromMascot = false,
  onComplete,
  className = '',
}) => {
  const [copied, setCopied] = React.useState(false);

  // Sample pixels from text letters
  const samplePoints = useMemo(() => {
    return sampleTextPixels(text, 280, 80, 900);
  }, [text]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <HolographicFormation
      type="text"
      duration={duration}
      width="100%"
      height="auto"
      originFromMascot={originFromMascot}
      samplePoints={samplePoints}
      onComplete={onComplete}
      className={`p-4 ${className}`}
    >
      <div className="flex flex-col gap-1.5 select-text">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-cyan-300 uppercase">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{category}</span>
          </div>

          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Copiar texto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Crisp Accessible HTML Text */}
        <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 tracking-tight leading-tight select-all">
          {text}
        </h2>

        {subtitle && (
          <p className="text-xs text-slate-300 font-sans leading-relaxed mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </HolographicFormation>
  );
};
