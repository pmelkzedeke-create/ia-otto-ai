/**
 * OTTO HOLOGRAM - Core Type Definitions
 * Sistema de materialização holográfica de conteúdo digital via partículas convergentes
 */

export type HologramType =
  | 'image'
  | 'text'
  | 'card'
  | 'chart'
  | 'search-result'
  | 'gallery'
  | 'custom';

export type HologramState =
  | 'idle'
  | 'scanning'
  | 'forming'
  | 'revealing'
  | 'complete'
  | 'error';

export type PerformanceTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface HologramParticle {
  id: number;
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
  delay: number;
  speed: number;
  angle: number;
  baseRadius: number;
  idlePhase: number;
  idleSpeed: number;
}

export interface OttoHologramContent {
  id: string;
  type: HologramType;
  title?: string;
  text?: string;
  imageUrl?: string;
  images?: Array<{
    url: string;
    title?: string;
    alt?: string;
    source?: string;
    thumbnailUrl?: string;
  }>;
  data?: any;
  metadata?: Record<string, any>;
  aspectRatio?: string;
  priority?: boolean;
}

export interface HolographicFormationProps {
  source?: string;
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
  title?: string;
  originFromMascot?: boolean;
  showControls?: boolean;
  allowSkip?: boolean;
  children?: React.ReactNode;
}
