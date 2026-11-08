/**
 * OTTO HOLOGRAM - Chart Hologram Component
 * Photonic particle materialization forming chart axes, metrics bars and values
 */

import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import { HolographicFormation } from './HolographicFormation';
import { sampleChartPixels } from './HologramParticles';

export interface ChartHologramProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  unit?: string;
  duration?: number;
  originFromMascot?: boolean;
  onComplete?: () => void;
  className?: string;
}

export const ChartHologram: React.FC<ChartHologramProps> = ({
  title,
  data,
  unit = '%',
  duration = 1600,
  originFromMascot = false,
  onComplete,
  className = '',
}) => {
  const numericValues = useMemo(() => data.map((d) => d.value), [data]);

  const samplePoints = useMemo(() => {
    return sampleChartPixels(numericValues, 320, 180, 1000);
  }, [numericValues]);

  const maxValue = Math.max(...numericValues, 100);

  return (
    <HolographicFormation
      type="chart"
      duration={duration}
      width="100%"
      height="auto"
      originFromMascot={originFromMascot}
      samplePoints={samplePoints}
      onComplete={onComplete}
      className={`p-4 ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Chart Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-[10px] font-mono text-cyan-300">
            <TrendingUp className="w-2.5 h-2.5" />
            <span>Telemetria Holográfica</span>
          </div>
        </div>

        {/* Visual Bars with Value Labels */}
        <div className="flex items-end justify-between gap-2 h-32 pt-2 px-1 border-b border-l border-white/20">
          {data.map((item, idx) => {
            const heightPct = Math.round((item.value / maxValue) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group/bar">
                <span className="text-[10px] font-mono text-cyan-300 opacity-80 group-hover/bar:opacity-100 transition-opacity">
                  {item.value}{unit}
                </span>
                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-cyan-600/40 via-cyan-400/70 to-white/90 border-t border-x border-cyan-300/50 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all duration-500 group-hover/bar:scale-y-105"
                />
                <span className="text-[9px] font-mono text-slate-400 truncate max-w-[48px] text-center">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </HolographicFormation>
  );
};
