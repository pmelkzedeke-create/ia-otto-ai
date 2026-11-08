/**
 * OTTO HOLOGRAM - Card Hologram Component
 * Photonic particle materialization forming card borders and structured data
 */

import React, { useMemo } from 'react';
import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import { HolographicFormation } from './HolographicFormation';
import { sampleCardOutlinePixels } from './HologramParticles';

export interface CardHologramProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  actionText?: string;
  onAction?: () => void;
  actionUrl?: string;
  duration?: number;
  originFromMascot?: boolean;
  onComplete?: () => void;
  className?: string;
}

export const CardHologram: React.FC<CardHologramProps> = ({
  title,
  subtitle,
  description,
  badge = 'OTTO KNOWLEDGE',
  actionText = 'Explorar Detalhes',
  onAction,
  actionUrl,
  duration = 1500,
  originFromMascot = false,
  onComplete,
  className = '',
}) => {
  const samplePoints = useMemo(() => {
    return sampleCardOutlinePixels(320, 180, 1000);
  }, []);

  return (
    <HolographicFormation
      type="card"
      duration={duration}
      width="100%"
      height="auto"
      originFromMascot={originFromMascot}
      samplePoints={samplePoints}
      onComplete={onComplete}
      className={`p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-col gap-2.5">
        {/* Card Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span className="uppercase tracking-wider">{badge}</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        {/* Card Titles & Content */}
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-cyan-200/80 font-mono mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {description && (
          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
            {description}
          </p>
        )}

        {/* Action Button */}
        {(onAction || actionUrl) && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-end">
            {actionUrl ? (
              <a
                href={actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>{actionText}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button
                onClick={onAction}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>{actionText}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </HolographicFormation>
  );
};
