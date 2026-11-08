/**
 * OTTO HOLOGRAM - High-Performance Particle Engine
 * Computes, samples and animates photonic particles converging into target forms.
 */

import { HologramParticle, PerformanceTier } from './hologramTypes';

// Detect client capability tier
export function detectPerformanceTier(): PerformanceTier {
  if (typeof window === 'undefined') return 'MEDIUM';

  const width = window.innerWidth;
  const memory = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;

  if (width < 640 || memory < 4 || cores < 4) {
    return 'LOW';
  }
  if (width < 1024 || memory < 8 || cores < 8) {
    return 'MEDIUM';
  }
  return 'HIGH';
}

// Get optimal particle count based on tier and user preference
export function getParticleCount(tier: PerformanceTier, customDensity?: number): number {
  let base: number;
  switch (tier) {
    case 'LOW':
      base = 450;
      break;
    case 'MEDIUM':
      base = 900;
      break;
    case 'HIGH':
    default:
      base = 1500;
      break;
  }

  if (customDensity && customDensity > 0) {
    return Math.round(base * Math.min(2, Math.max(0.3, customDensity)));
  }
  return base;
}

// Check for reduced motion accessibility
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Easing functions for liquid holographic convergence
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export interface SamplePoint {
  x: number;
  y: number;
  color: string;
}

/**
 * Samples pixel coordinates and colors from an HTMLImageElement
 */
export function sampleImagePixels(
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  targetCount: number
): SamplePoint[] {
  const points: SamplePoint[] = [];

  try {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return points;

    const sampleW = Math.min(Math.round(canvasWidth), 140);
    const sampleH = Math.min(Math.round(canvasHeight), 140);
    offCanvas.width = sampleW;
    offCanvas.height = sampleH;

    offCtx.drawImage(img, 0, 0, sampleW, sampleH);
    const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    // Step calculation for uniform point distribution
    const totalPixels = (sampleW * sampleH) / 4;
    const step = Math.max(1, Math.floor(Math.sqrt(totalPixels / (targetCount * 1.2))));

    for (let y = 0; y < sampleH; y += step * 2) {
      for (let x = 0; x < sampleW; x += step * 2) {
        const idx = (y * sampleW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 30) {
          const targetX = (x / sampleW) * canvasWidth;
          const targetY = (y / sampleH) * canvasHeight;

          // Holographic photonic tint with silver-cyan highlights
          const color = `rgba(${Math.min(255, r + 35)}, ${Math.min(255, g + 55)}, ${Math.min(255, b + 80)}, ${Math.max(0.35, a / 255)})`;
          points.push({ x: targetX, y: targetY, color });
        }
      }
    }
  } catch {
    // If CORS or tainted canvas, return empty so grid fallback activates
    return [];
  }

  return points;
}

/**
 * Samples pixel points from rendered text
 */
export function sampleTextPixels(
  text: string,
  canvasWidth: number,
  canvasHeight: number,
  targetCount: number
): SamplePoint[] {
  const points: SamplePoint[] = [];
  try {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return points;

    const sampleW = Math.min(Math.round(canvasWidth), 200);
    const sampleH = Math.min(Math.round(canvasHeight), 80);
    offCanvas.width = sampleW;
    offCanvas.height = sampleH;

    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, sampleW, sampleH);

    // Compute responsive font size
    const fontSize = Math.max(16, Math.min(36, Math.round(sampleW / Math.max(4, text.length * 0.75))));
    offCtx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    offCtx.fillStyle = '#ffffff';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(text.slice(0, 32), sampleW / 2, sampleH / 2);

    const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    for (let y = 0; y < sampleH; y += 2) {
      for (let x = 0; x < sampleW; x += 2) {
        const idx = (y * sampleW + x) * 4;
        const brightness = data[idx]; // Grayscale from white text
        if (brightness > 90) {
          const targetX = (x / sampleW) * canvasWidth;
          const targetY = (y / sampleH) * canvasHeight;
          const alpha = brightness / 255;
          const color = `rgba(220, 245, 255, ${alpha.toFixed(2)})`;
          points.push({ x: targetX, y: targetY, color });
        }
      }
    }
  } catch {
    return [];
  }
  return points;
}

/**
 * Samples structured points along card frames and content blocks
 */
export function sampleCardOutlinePixels(
  canvasWidth: number,
  canvasHeight: number,
  targetCount: number
): SamplePoint[] {
  const points: SamplePoint[] = [];
  const padding = 16;
  const innerW = canvasWidth - padding * 2;
  const innerH = canvasHeight - padding * 2;

  // Sample perimeter border
  const borderPoints = Math.round(targetCount * 0.45);
  const perimeter = 2 * (innerW + innerH);

  for (let i = 0; i < borderPoints; i++) {
    const d = (i / borderPoints) * perimeter;
    let x = padding;
    let y = padding;

    if (d < innerW) {
      x = padding + d;
      y = padding;
    } else if (d < innerW + innerH) {
      x = padding + innerW;
      y = padding + (d - innerW);
    } else if (d < 2 * innerW + innerH) {
      x = padding + innerW - (d - (innerW + innerH));
      y = padding + innerH;
    } else {
      x = padding;
      y = padding + innerH - (d - (2 * innerW + innerH));
    }

    const color = `hsla(${195 + Math.random() * 30}, 85%, 75%, 0.85)`;
    points.push({ x, y, color });
  }

  // Sample header separation and text placeholder rows
  const rowCount = Math.round(targetCount * 0.55);
  const lineY1 = padding + 40;
  const lineY2 = padding + 75;
  const lineY3 = padding + 105;

  for (let i = 0; i < rowCount; i++) {
    const fraction = i / rowCount;
    let y: number;
    let lineW = innerW * 0.85;

    if (fraction < 0.3) {
      y = lineY1;
    } else if (fraction < 0.65) {
      y = lineY2;
      lineW = innerW * 0.7;
    } else {
      y = lineY3;
      lineW = innerW * 0.55;
    }

    const x = padding + 15 + Math.random() * lineW;
    const color = `hsla(${205 + Math.random() * 25}, 80%, 78%, 0.75)`;
    points.push({ x, y, color });
  }

  return points;
}

/**
 * Samples structured chart grid, axes and simulated bars
 */
export function sampleChartPixels(
  dataValues: number[] | undefined,
  canvasWidth: number,
  canvasHeight: number,
  targetCount: number
): SamplePoint[] {
  const points: SamplePoint[] = [];
  const pad = 24;
  const w = canvasWidth - pad * 2;
  const h = canvasHeight - pad * 2;

  // Axes (bottom & left)
  const axisCount = Math.round(targetCount * 0.3);
  for (let i = 0; i < axisCount; i++) {
    const t = i / axisCount;
    if (t < 0.5) {
      // Bottom axis
      const x = pad + (t * 2) * w;
      const y = pad + h;
      points.push({ x, y, color: 'rgba(255, 255, 255, 0.7)' });
    } else {
      // Left axis
      const x = pad;
      const y = pad + ((t - 0.5) * 2) * h;
      points.push({ x, y, color: 'rgba(255, 255, 255, 0.7)' });
    }
  }

  // Bars or line segments
  const values = dataValues && dataValues.length > 0 ? dataValues : [35, 65, 45, 90, 75, 60, 85];
  const barCount = values.length;
  const barStep = w / (barCount + 1);
  const remainingCount = targetCount - points.length;

  for (let b = 0; b < barCount; b++) {
    const val = values[b] / 100;
    const barX = pad + (b + 1) * barStep;
    const barH = val * (h - 20);
    const pointsPerBar = Math.floor(remainingCount / barCount);

    for (let p = 0; p < pointsPerBar; p++) {
      const frac = p / pointsPerBar;
      const x = barX + (Math.random() - 0.5) * 12;
      const y = pad + h - frac * barH;
      const color = `hsla(${190 + val * 45}, 90%, 75%, 0.85)`;
      points.push({ x, y, color });
    }
  }

  return points;
}

/**
 * Generates regular holographic matrix points when source sampling is not available
 */
export function generateHolographicMatrix(
  canvasWidth: number,
  canvasHeight: number,
  targetCount: number
): SamplePoint[] {
  const points: SamplePoint[] = [];
  const cols = Math.max(1, Math.floor(Math.sqrt(targetCount * (canvasWidth / canvasHeight))));
  const rows = Math.max(1, Math.floor(targetCount / cols));
  const dx = canvasWidth / cols;
  const dy = canvasHeight / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * dx + (Math.random() - 0.5) * dx * 0.4;
      const y = (r + 0.5) * dy + (Math.random() - 0.5) * dy * 0.4;
      const hue = 192 + Math.random() * 35;
      const lum = 70 + Math.random() * 25;
      points.push({ x, y, color: `hsla(${hue}, 85%, ${lum}%, 0.85)` });
    }
  }

  return points;
}

/**
 * Initializes particles with either orbital field dispersion or top photonic stream (mascot origin)
 */
export function createParticles(
  samples: SamplePoint[],
  canvasWidth: number,
  canvasHeight: number,
  originFromMascot: boolean = false
): HologramParticle[] {
  const particles: HologramParticle[] = [];
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const maxRadius = Math.max(canvasWidth, canvasHeight) * 0.75;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    let startX: number;
    let startY: number;

    if (originFromMascot) {
      // Stream downward from mascot emitter above
      startX = centerX + (Math.random() - 0.5) * (canvasWidth * 0.45);
      startY = -30 - Math.random() * 70;
    } else {
      // Dispersed orbital field around center
      const angle = Math.random() * Math.PI * 2;
      const dist = maxRadius * (0.35 + Math.random() * 0.8);
      startX = centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40;
      startY = centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40;
    }

    const size = Math.random() * 2.0 + 0.8;
    const maxAlpha = Math.random() * 0.35 + 0.65;
    const delay = Math.random() * 0.32; // Staggered arrival for organic fluid feel

    particles.push({
      id: i,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      targetX: s.x,
      targetY: s.y,
      size,
      alpha: 0,
      maxAlpha,
      color: s.color,
      delay,
      speed: 0.85 + Math.random() * 0.35,
      angle: Math.random() * Math.PI * 2,
      baseRadius: maxRadius,
      idlePhase: Math.random() * Math.PI * 2,
      idleSpeed: 0.0015 + Math.random() * 0.002,
    });
  }

  return particles;
}
