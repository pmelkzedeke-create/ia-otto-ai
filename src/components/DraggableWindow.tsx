import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripHorizontal, X, Minimize2, Maximize2, Move, RotateCcw, Maximize } from 'lucide-react';

export interface DraggableWindowProps {
  children: React.ReactNode;
  title?: string;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  defaultCentered?: boolean;
  onClose?: () => void;
  className?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  zIndex?: number;
  showControls?: boolean;
  allowMinimize?: boolean;
  headerIcon?: React.ReactNode;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  children,
  title = 'Janela OTTO',
  initialX,
  initialY,
  initialWidth = 480,
  initialHeight,
  defaultCentered = true,
  onClose,
  className = '',
  minWidth = 280,
  maxWidth = 1100,
  minHeight = 200,
  maxHeight = 900,
  zIndex = 40,
  showControls = true,
  allowMinimize = true,
  headerIcon,
}) => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: initialWidth,
    height: initialHeight || 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentZIndex, setCurrentZIndex] = useState(zIndex);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    hasMoved: false,
  });

  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({
    startX: 0,
    startY: 0,
    startWidth: initialWidth,
    startHeight: initialHeight || 360,
  });

  // Calculate default position centered in screen or from props
  useEffect(() => {
    if (position === null && typeof window !== 'undefined') {
      if (initialX !== undefined && initialY !== undefined) {
        setPosition({ x: initialX, y: initialY });
      } else if (defaultCentered) {
        const w = Math.min(initialWidth, window.innerWidth * 0.9);
        const posX = Math.max(16, (window.innerWidth - w) / 2);
        const posY = Math.max(50, window.innerHeight * 0.38);
        setPosition({ x: posX, y: posY });
      } else {
        setPosition({ x: 24, y: 80 });
      }
    }
  }, [defaultCentered, initialWidth, initialX, initialY, position]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag when clicking the header handle
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }

    e.preventDefault();
    setCurrentZIndex((prev) => Math.max(prev, 55));

    const currentX = position?.x ?? 0;
    const currentY = position?.y ?? 0;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
      hasMoved: false,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStartRef.current.startX;
      const dy = ev.clientY - dragStartRef.current.startY;

      if (!dragStartRef.current.hasMoved && Math.hypot(dx, dy) > 3) {
        dragStartRef.current.hasMoved = true;
        setIsDragging(true);
      }

      if (dragStartRef.current.hasMoved) {
        const nextX = Math.max(8, Math.min(window.innerWidth - 80, dragStartRef.current.posX + dx));
        const nextY = Math.max(20, Math.min(window.innerHeight - 60, dragStartRef.current.posY + dy));
        setPosition({ x: nextX, y: nextY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentZIndex((prev) => Math.max(prev, 55));
    setIsResizing(true);

    const currentW = windowRef.current ? windowRef.current.offsetWidth : size.width;
    const currentH = windowRef.current ? windowRef.current.offsetHeight : size.height;

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentW,
      startHeight: currentH,
    };

    const handleResizeMove = (ev: PointerEvent) => {
      const dw = ev.clientX - resizeStartRef.current.startX;
      const dh = ev.clientY - resizeStartRef.current.startY;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.startWidth + dw));
      const newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartRef.current.startHeight + dh));

      setSize({ width: newWidth, height: newHeight });
    };

    const handleResizeUp = () => {
      window.removeEventListener('pointermove', handleResizeMove);
      window.removeEventListener('pointerup', handleResizeUp);
      window.removeEventListener('pointercancel', handleResizeUp);
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handleResizeMove);
    window.addEventListener('pointerup', handleResizeUp);
    window.addEventListener('pointercancel', handleResizeUp);
  };

  const handleResetPositionAndSize = () => {
    if (typeof window === 'undefined') return;
    const w = Math.min(initialWidth, window.innerWidth * 0.9);
    setPosition({
      x: Math.max(16, (window.innerWidth - w) / 2),
      y: Math.max(50, window.innerHeight * 0.38),
    });
    setSize({ width: initialWidth, height: initialHeight || 0 });
  };

  if (!position) return null;

  return (
    <div
      ref={windowRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: currentZIndex,
        width: `${size.width}px`,
        minWidth: `${minWidth}px`,
        maxWidth: `${maxWidth}px`,
      }}
      className={`fixed touch-none font-sans transition-shadow select-none animate-fade-in ${
        isDragging ? 'cursor-grabbing opacity-95 scale-[1.01]' : ''
      } ${isResizing ? 'cursor-se-resize opacity-95' : ''} ${className}`}
      onClick={() => setCurrentZIndex((prev) => Math.max(prev, 55))}
    >
      <div className="relative rounded-[26px] glass-medium liquid-refraction border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(255,255,255,0.15)] flex flex-col overflow-hidden ring-1 ring-white/10">
        {/* Sleek Draggable Top Header Bar */}
        <div
          onPointerDown={handlePointerDown}
          className={`flex items-center justify-between px-3.5 py-2 bg-white/[0.08] backdrop-blur-xl border-b border-white/15 cursor-grab active:cursor-grabbing transition-colors ${
            isDragging ? 'bg-white/20' : 'hover:bg-white/[0.12]'
          }`}
          title="Arraste para mover na tela"
        >
          {/* Left Title & Grab Indicator */}
          <div className="flex items-center gap-2 min-w-0 pr-2 pointer-events-none">
            <div className="flex items-center gap-1 text-slate-300">
              <Move className="w-3.5 h-3.5 text-slate-200 shrink-0 animate-pulse" />
              <GripHorizontal className="w-4 h-4 text-slate-400 opacity-80" />
            </div>

            {headerIcon && <div className="shrink-0">{headerIcon}</div>}

            <span className="text-xs font-bold text-white tracking-tight truncate">
              {title}
            </span>
          </div>

          {/* Right Window Controls */}
          {showControls && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleResetPositionAndSize}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Redefinir Posição e Tamanho"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {allowMinimize && (
                <button
                  onClick={() => setIsMinimized((prev) => !prev)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isMinimized ? 'Expandir' : 'Minimizar'}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer ml-0.5"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Window Content */}
        {!isMinimized && (
          <div
            style={{ height: size.height ? `${size.height}px` : 'auto' }}
            className="p-2 sm:p-2.5 overflow-y-auto overflow-x-hidden flex flex-col relative"
          >
            {children}

            {/* Bottom-Right Resize Handle */}
            <div
              onPointerDown={handleResizePointerDown}
              className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-white/40 hover:text-white/90 transition-colors z-30"
              title="Arraste para redimensionar"
            >
              <Maximize className="w-3 h-3 rotate-90" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
