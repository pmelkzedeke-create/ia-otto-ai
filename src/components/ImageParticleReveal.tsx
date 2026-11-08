import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export interface ImageParticleRevealProps {
  imageUrl: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  particleCount?: number;
  duration?: number; // ms
  autoPlay?: boolean;
  onComplete?: () => void;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  aspectRatio?: string;
  originFromMascot?: boolean;
}

interface Particle {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  delay: number; // 0 to 1 progress delay
  speed: number;
  angle: number;
  orbitRadius: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export const ImageParticleReveal: React.FC<ImageParticleRevealProps> = ({
  imageUrl,
  alt = 'Imagem holográfica',
  width = '100%',
  height = '100%',
  particleCount,
  duration = 1800,
  autoPlay = true,
  onComplete,
  className = '',
  objectFit = 'cover',
  aspectRatio,
  originFromMascot = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [currentSrc, setCurrentSrc] = useState<string>(imageUrl);
  const [triedProxy, setTriedProxy] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [progress, setProgress] = useState(0);

  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Update currentSrc if imageUrl prop changes
  useEffect(() => {
    setCurrentSrc(imageUrl);
    setTriedProxy(false);
    setImageLoaded(false);
    setLoadError(false);
    setIsRevealed(false);
  }, [imageUrl]);

  // Adaptive particle count based on screen width & device capability
  const getOptimalParticleCount = useCallback(() => {
    if (particleCount && particleCount > 0) return particleCount;
    if (typeof window === 'undefined') return 1200;

    const screenWidth = window.innerWidth;
    if (screenWidth < 640) return 600; // Mobile
    if (screenWidth < 1024) return 1100; // Tablet / Laptop
    return 1800; // Desktop
  }, [particleCount]);

  // Check accessibility: prefers-reduced-motion
  const isReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Build target particle points either by sampling image luminance or using structured holographic grid
  const initializeParticles = useCallback(
    (img: HTMLImageElement, canvasWidth: number, canvasHeight: number) => {
      const count = getOptimalParticleCount();
      const particles: Particle[] = [];

      let sampledPixels: Array<{ x: number; y: number; color: string }> = [];

      try {
        const offCanvas = document.createElement('canvas');
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
          const sampleW = Math.min(canvasWidth, 120);
          const sampleH = Math.min(canvasHeight, 120);
          offCanvas.width = sampleW;
          offCanvas.height = sampleH;

          offCtx.drawImage(img, 0, 0, sampleW, sampleH);
          const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
          const data = imgData.data;

          for (let y = 0; y < sampleH; y += 2) {
            for (let x = 0; x < sampleW; x += 2) {
              const idx = (y * sampleW + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              if (a > 30) {
                const targetX = (x / sampleW) * canvasWidth;
                const targetY = (y / sampleH) * canvasHeight;

                // Color accent with subtle cyan/silver photonic glow
                const color = `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 90)}, ${a / 255})`;
                sampledPixels.push({ x: targetX, y: targetY, color });
              }
            }
          }
        }
      } catch {
        // Fallback: use structured holographic matrix distribution
        sampledPixels = [];
      }

      // If sampling was empty or blocked by CORS, generate structured matrix
      if (sampledPixels.length === 0) {
        const cols = Math.floor(Math.sqrt(count * (canvasWidth / canvasHeight)));
        const rows = Math.floor(count / cols);
        const dx = canvasWidth / Math.max(1, cols);
        const dy = canvasHeight / Math.max(1, rows);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const targetX = (c + 0.5) * dx + (Math.random() - 0.5) * dx * 0.5;
            const targetY = (r + 0.5) * dy + (Math.random() - 0.5) * dy * 0.5;

            // Liquid cyan & chrome glow palette
            const hue = 190 + Math.random() * 40;
            const lum = 70 + Math.random() * 25;
            const color = `hsla(${hue}, 90%, ${lum}%, 0.85)`;

            sampledPixels.push({ x: targetX, y: targetY, color });
          }
        }
      }

      // Generate particles targeting sampled destinations
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const maxRadius = Math.max(canvasWidth, canvasHeight) * 0.85;

      for (let i = 0; i < count; i++) {
        const sample = sampledPixels[i % sampledPixels.length];
        let startX: number;
        let startY: number;

        if (originFromMascot) {
          // Particles originate from top center (emanating from OTTO mascot)
          startX = centerX + (Math.random() - 0.5) * (canvasWidth * 0.5);
          startY = -40 - Math.random() * 80;
        } else {
          // Dispersed in orbital field around center
          const angle = Math.random() * Math.PI * 2;
          const dist = maxRadius * (0.35 + Math.random() * 0.85);
          startX = centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 60;
          startY = centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 60;
        }

        const size = Math.random() * 2.2 + 0.8;
        const maxAlpha = Math.random() * 0.4 + 0.6;
        const delay = Math.random() * 0.35; // Staggered arrival for organic fluid feel

        particles.push({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          targetX: sample.x,
          targetY: sample.y,
          size,
          alpha: 0,
          maxAlpha,
          color: sample.color,
          delay,
          speed: 0.8 + Math.random() * 0.4,
          angle: Math.random() * Math.PI * 2,
          orbitRadius: maxRadius,
          trail: [],
        });
      }

      particlesRef.current = particles;
    },
    [getOptimalParticleCount, originFromMascot]
  );

  // Smooth easing function for fluid holographic convergence
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const easeInOutQuart = (t: number): number => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  };

  // Main animation loop
  const startMaterialization = useCallback(() => {
    if (isReducedMotion()) {
      setIsRevealed(true);
      setIsMaterializing(false);
      onComplete?.();
      return;
    }

    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions matching container
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    initializeParticles(img, rect.width, rect.height);

    setIsMaterializing(true);
    setIsRevealed(false);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const rawProgress = Math.min(1, elapsed / duration);
      setProgress(rawProgress);

      ctx.clearRect(0, 0, rect.width, rect.height);

      const particles = particlesRef.current;
      let allSettled = true;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Adjusted progress with delay offset
        const particleProgress = Math.max(0, Math.min(1, (rawProgress - p.delay) / (1 - p.delay)));

        if (particleProgress < 1) {
          allSettled = false;
        }

        // Convergence easing
        const t = easeInOutQuart(particleProgress);

        // Add subtle spiral / organic curve to motion
        const curveOffset = Math.sin(particleProgress * Math.PI) * 18 * Math.sin(p.angle);
        const curveOffsetX = -Math.sin(p.angle) * curveOffset;
        const curveOffsetY = Math.cos(p.angle) * curveOffset;

        p.currentX = p.startX + (p.targetX - p.startX) * t + curveOffsetX;
        p.currentY = p.startY + (p.targetY - p.startY) * t + curveOffsetY;

        // Alpha calculation: fade in rapidly, sustain, then fade out gently as image reveals
        if (rawProgress < 0.75) {
          p.alpha = Math.min(p.maxAlpha, p.alpha + 0.1);
        } else {
          // Fade out particles as image crystallizes
          const fadeOutT = (rawProgress - 0.75) / 0.25;
          p.alpha = p.maxAlpha * (1 - easeOutCubic(fadeOutT));
        }

        // Draw particle with glow
        if (p.alpha > 0.02) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.currentX, p.currentY, p.size * (1 - particleProgress * 0.2), 0, Math.PI * 2);

          // Photonic particle rendering
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#38bdf8';
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw subtle holographic sweep scanline when progress is between 0.65 and 0.95
      if (rawProgress >= 0.6 && rawProgress <= 0.95) {
        const scanY = ((rawProgress - 0.6) / 0.35) * rect.height;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(rect.width, scanY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f0ff';
        ctx.stroke();
        ctx.restore();
      }

      // Trigger full image reveal slightly before total particle dissipation for seamless blending
      if (rawProgress >= 0.78 && !isRevealed) {
        setIsRevealed(true);
      }

      if (rawProgress < 1 || !allSettled) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Complete
        setIsMaterializing(false);
        setIsRevealed(true);
        ctx.clearRect(0, 0, rect.width, rect.height);
        onComplete?.();
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
  }, [duration, imageLoaded, initializeParticles, isReducedMotion, isRevealed, onComplete]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    setLoadError(false);
  };

  const handleImageError = () => {
    // If original URL fails, automatically retry through our backend proxy!
    if (!triedProxy && !currentSrc.startsWith('/api/proxy/image')) {
      setTriedProxy(true);
      setCurrentSrc(`/api/proxy/image?url=${encodeURIComponent(imageUrl)}`);
    } else {
      setLoadError(true);
      setImageLoaded(false);
      setIsMaterializing(false);
      setIsRevealed(false);
    }
  };

  // Start materialization on load if autoPlay is true
  useEffect(() => {
    if (imageLoaded && autoPlay && !isRevealed && !isMaterializing) {
      startMaterialization();
    }
  }, [imageLoaded, autoPlay, isRevealed, isMaterializing, startMaterialization]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height, aspectRatio }}
      className={`relative overflow-hidden select-none group/particle-box rounded-2xl bg-black/40 border border-white/10 ${className}`}
    >
      {/* Hidden preloader image to sample dimensions & pixel data */}
      <img
        ref={imageRef}
        src={currentSrc}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="hidden"
      />

      {/* Target Real Image */}
      {imageLoaded && !loadError && (
        <img
          src={currentSrc}
          alt={alt}
          style={{ objectFit }}
          className={`w-full h-full transition-all duration-700 ease-out ${
            isRevealed
              ? 'opacity-100 scale-100 filter-none'
              : 'opacity-0 scale-95 blur-sm pointer-events-none'
          }`}
          loading="lazy"
        />
      )}

      {/* Particle Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-500 ${
          isMaterializing ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Loading / Materializing Photonic Status Indicator */}
      {!imageLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-4 text-center z-20 backdrop-blur-md bg-black/50">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="text-[11px] font-mono text-slate-300 tracking-wider uppercase animate-pulse">
            Sintonizando Imagem Holográfica...
          </span>
        </div>
      )}

      {/* Materialization Active Glow Badge */}
      {isMaterializing && (
        <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/30 text-[10px] font-mono text-white flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.25)] animate-fade-in pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>Materializando ({Math.round(progress * 100)}%)</span>
        </div>
      )}

      {/* Error Fallback Card */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center z-20 bg-slate-950/80 border border-red-500/30 rounded-2xl">
          <AlertCircle className="w-7 h-7 text-red-400" />
          <span className="text-xs font-semibold text-slate-200">Imagem Indisponível</span>
          <span className="text-[10px] text-slate-400 max-w-[200px] truncate">
            {imageUrl}
          </span>
          <button
            onClick={() => {
              setLoadError(false);
              setImageLoaded(false);
              setTriedProxy(false);
              setCurrentSrc(`/api/proxy/image?url=${encodeURIComponent(imageUrl)}&t=${Date.now()}`);
            }}
            className="mt-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer border border-white/20 active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      )}
    </div>
  );
};
