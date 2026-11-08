/**
 * OTTO HOLOGRAM - HolographicFormation Wrapper Component
 * Orchestrates holographic sequence: SCAN -> PARTICLES -> CONVERGENCE -> FORMATION -> STABILIZATION -> IDLE
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FastForward, Sparkles, AlertCircle } from 'lucide-react';
import { HologramType, HologramState } from './hologramTypes';
import {
  detectPerformanceTier,
  getParticleCount,
  isReducedMotion,
  easeInOutQuart,
  easeOutCubic,
  createParticles,
  generateHolographicMatrix,
  SamplePoint,
} from './HologramParticles';

export interface HolographicFormationProps {
  type: HologramType;
  duration?: number;
  particleDensity?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
  width?: string | number;
  height?: string | number;
  aspectRatio?: string;
  originFromMascot?: boolean;
  samplePoints?: SamplePoint[];
  allowSkip?: boolean;
  children: React.ReactNode;
  fallbackContent?: React.ReactNode;
}

const SESSION_SKIP_KEY = 'otto_skip_hologram_anim';

export const HolographicFormation: React.FC<HolographicFormationProps> = ({
  type,
  duration = 1600,
  particleDensity,
  autoPlay = true,
  onComplete,
  onSkip,
  className = '',
  width = '100%',
  height = '100%',
  aspectRatio,
  originFromMascot = false,
  samplePoints,
  allowSkip = true,
  children,
  fallbackContent,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Check if session preference already skipped animations
  const initialSkipped = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_SKIP_KEY) === 'true';

  const [state, setState] = useState<HologramState>(initialSkipped ? 'complete' : 'idle');
  const [progress, setProgress] = useState(initialSkipped ? 1 : 0);
  const [scanlineY, setScanlineY] = useState<number | null>(null);
  const particlesRef = useRef<ReturnType<typeof createParticles>>([]);

  const handleSkip = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    setState('complete');
    setProgress(1);
    setScanlineY(null);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_SKIP_KEY, 'true');
    }
    onSkip?.();
    onComplete?.();
  }, [onComplete, onSkip]);

  const startAnimation = useCallback(() => {
    if (isReducedMotion() || initialSkipped) {
      setState('complete');
      setProgress(1);
      onComplete?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setState('complete');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setState('complete');
      return;
    }

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Generate samples if not provided
    const tier = detectPerformanceTier();
    const count = getParticleCount(tier, particleDensity);
    const finalSamples = samplePoints && samplePoints.length > 0
      ? samplePoints
      : generateHolographicMatrix(rect.width, rect.height, count);

    particlesRef.current = createParticles(finalSamples, rect.width, rect.height, originFromMascot);

    setState('scanning');
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const rawProgress = Math.min(1, elapsed / duration);
      setProgress(rawProgress);

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Phase 1: SCANNING (0.00 -> 0.20)
      if (rawProgress < 0.2) {
        setState('scanning');
        const scanY = (rawProgress / 0.2) * rect.height;
        setScanlineY(scanY);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(rect.width, scanY);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
        ctx.restore();
      } else {
        setScanlineY(null);
      }

      // Phase 2 & 3: FORMING (0.20 -> 0.75)
      if (rawProgress >= 0.2 && rawProgress < 0.75) {
        setState('forming');
      }

      // Phase 4: REVEALING (0.75 -> 0.95)
      if (rawProgress >= 0.75 && rawProgress < 0.95) {
        setState('revealing');
      }

      // Render converging particles
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Adjusted progress per particle delay
        const pProgress = Math.max(0, Math.min(1, (rawProgress - p.delay) / (1 - p.delay)));
        const t = easeInOutQuart(pProgress);

        // Subtle curved motion for organic photonic flow
        const curveOffset = Math.sin(pProgress * Math.PI) * 16 * Math.sin(p.angle);
        const curveOffsetX = -Math.sin(p.angle) * curveOffset;
        const curveOffsetY = Math.cos(p.angle) * curveOffset;

        p.currentX = p.startX + (p.targetX - p.startX) * t + curveOffsetX;
        p.currentY = p.startY + (p.targetY - p.startY) * t + curveOffsetY;

        // Alpha ramp up then fade out as content materializes
        if (rawProgress < 0.72) {
          p.alpha = Math.min(p.maxAlpha, p.alpha + 0.1);
        } else {
          const fadeOutT = (rawProgress - 0.72) / 0.28;
          p.alpha = p.maxAlpha * (1 - easeOutCubic(fadeOutT));
        }

        if (p.alpha > 0.02) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.currentX, p.currentY, p.size * (1 - pProgress * 0.18), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#38bdf8';
          ctx.fill();
          ctx.restore();
        }
      }

      // Phase 5: STABILIZATION & IDLE
      if (rawProgress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        setState('complete');
        ctx.clearRect(0, 0, rect.width, rect.height);
        onComplete?.();

        // Subtle idle residual shimmer loop (Phase 6)
        startIdleShimmer(ctx, rect.width, rect.height);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
  }, [initialSkipped, duration, particleDensity, samplePoints, originFromMascot, onComplete]);

  // Phase 6: Idle residual particles shimmer (discreet, 1-2px floating motion)
  const startIdleShimmer = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const idleCount = Math.min(24, Math.round(particlesRef.current.length * 0.04));
    const idleParticles = particlesRef.current.slice(0, idleCount);

    const idleAnimate = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < idleParticles.length; i++) {
        const p = idleParticles[i];
        p.idlePhase += p.idleSpeed * 16;
        const offsetX = Math.cos(p.idlePhase) * 1.5;
        const offsetY = Math.sin(p.idlePhase) * 1.5;
        const alpha = 0.25 + Math.sin(p.idlePhase) * 0.15;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.targetX + offsetX, p.targetY + offsetY, p.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.fill();
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(idleAnimate);
    };

    animFrameIdRef.current = requestAnimationFrame(idleAnimate);
  };

  useEffect(() => {
    if (autoPlay && state === 'idle') {
      startAnimation();
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [autoPlay, state, startAnimation]);

  const isFormed = state === 'revealing' || state === 'complete';

  return (
    <div
      ref={containerRef}
      style={{ width, height, aspectRatio }}
      className={`relative overflow-hidden group/hologram rounded-2xl bg-black/30 border border-white/15 backdrop-blur-md ${className}`}
    >
      {/* Canvas for Photonic Particle Convergence */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none z-20 transition-opacity duration-500 ${
          state === 'complete' ? 'opacity-40' : 'opacity-100'
        }`}
      />

      {/* Target Content: reveals progressively */}
      <div
        className={`w-full h-full transition-all duration-700 ease-out ${
          isFormed
            ? 'opacity-100 scale-100 filter-none'
            : 'opacity-0 scale-95 blur-sm pointer-events-none'
        }`}
      >
        {children}
      </div>

      {/* Status Overlay & Skip Button (Visible during formation) */}
      {!isFormed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center z-30 pointer-events-none select-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>
              {state === 'scanning' && 'Escaneando Matriz...'}
              {state === 'forming' && `Convergindo Holograma (${Math.round(progress * 100)}%)`}
              {state === 'idle' && 'Preparando...'}
            </span>
          </div>

          {allowSkip && (
            <button
              onClick={handleSkip}
              className="pointer-events-auto px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono flex items-center gap-1 border border-white/20 transition-all cursor-pointer active:scale-95 shadow-md"
              title="Exibir conteúdo instantaneamente"
            >
              <FastForward className="w-3 h-3 text-cyan-300" />
              <span>Pular animação</span>
            </button>
          )}
        </div>
      )}

      {/* Subtle Scanline Effect in Scanning Phase */}
      {scanlineY !== null && (
        <div
          style={{ top: `${scanlineY}px` }}
          className="absolute inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8] pointer-events-none z-30 transition-transform duration-75"
        />
      )}

      {/* Error Fallback */}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/85 z-40 text-center gap-2">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <span className="text-xs text-slate-300 font-medium">Holograma Indisponível</span>
          {fallbackContent}
        </div>
      )}
    </div>
  );
};
