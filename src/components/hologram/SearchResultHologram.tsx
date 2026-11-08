/**
 * OTTO HOLOGRAM - Search Result Hologram Component
 * Photonic particle materialization forming web and search intelligence results
 */

import React, { useMemo } from 'react';
import { Globe, ExternalLink, Sparkles } from 'lucide-react';
import { HolographicFormation } from './HolographicFormation';
import { sampleCardOutlinePixels } from './HologramParticles';

export interface SearchResultHologramProps {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  duration?: number;
  originFromMascot?: boolean;
  onComplete?: () => void;
  className?: string;
}

export const SearchResultHologram: React.FC<SearchResultHologramProps> = ({
  title,
  url,
  domain,
  snippet,
  duration = 1400,
  originFromMascot = false,
  onComplete,
  className = '',
}) => {
  const samplePoints = useMemo(() => {
    return sampleCardOutlinePixels(300, 140, 800);
  }, []);

  return (
    <HolographicFormation
      type="search-result"
      duration={duration}
      width="100%"
      height="auto"
      originFromMascot={originFromMascot}
      samplePoints={samplePoints}
      onComplete={onComplete}
      className={`p-3.5 sm:p-4 ${className}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate max-w-[180px]">{domain}</span>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-[11px] font-mono transition-all cursor-pointer"
          >
            <span>Acessar</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm font-semibold text-white hover:text-cyan-200 transition-colors line-clamp-2"
        >
          {title}
        </a>

        {snippet && (
          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            {snippet}
          </p>
        )}
      </div>
    </HolographicFormation>
  );
};
