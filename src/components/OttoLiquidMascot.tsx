import React, { useEffect, useRef } from 'react';
import { OttoState } from '../types/otto';
import { audioAnalyzer } from '../services/audioAnalyzer';

interface OttoLiquidMascotProps {
  state: OttoState;
  isListening: boolean;
  isSpeaking: boolean;
  isProjectingHologram?: boolean;
  onClick?: () => void;
  className?: string;
}

export const OttoLiquidMascot: React.FC<OttoLiquidMascotProps> = ({
  state,
  isListening,
  isSpeaking,
  isProjectingHologram = false,
  onClick,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mousePosRef = useRef({ x: 0, y: 0 });

  const stateRef = useRef(state);
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);
  const isProjectingRef = useRef(isProjectingHologram);

  useEffect(() => {
    stateRef.current = state;
    isListeningRef.current = isListening;
    isSpeakingRef.current = isSpeaking;
    isProjectingRef.current = isProjectingHologram;
  }, [state, isListening, isSpeaking, isProjectingHologram]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1920;
      const h = window.innerHeight || 1080;
      const nx = (e.clientX / w) * 2 - 1;
      const ny = (e.clientY / h) * 2 - 1;
      mousePosRef.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
      };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let prevTime = performance.now();
    let angle = 0;

    let blinkProgress = 0;
    let isBlinking = false;
    let nextBlinkTime = performance.now() + 2500;

    let curLookX = 0;
    let curLookY = 0;

    let silverIntensity = 0;
    let smoothAudioVol = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const now = performance.now();
      const delta = Math.min((now - prevTime) / 1000, 0.1);
      prevTime = now;

      const currentState = stateRef.current;
      const liveListening = isListeningRef.current || currentState === 'LISTENING';
      const liveSpeaking = isSpeakingRef.current || currentState === 'SPEAKING';

      const targetSilver = liveSpeaking ? 0.9 : liveListening ? 0.75 : 0.0;
      silverIntensity += (targetSilver - silverIntensity) * 0.08;

      const syntheticBoost = liveSpeaking ? 0.4 + Math.sin(now * 0.008) * 0.3 : 0;
      const rawAudio = audioAnalyzer.getMetrics(syntheticBoost).volume;
      smoothAudioVol += (rawAudio - smoothAudioVol) * 0.12;

      const rotSpeed = currentState === 'THINKING' ? 0.022 : liveListening ? 0.015 : 0.007;
      angle += rotSpeed;

      const parentW = containerRef.current?.clientWidth || 300;
      const parentH = containerRef.current?.clientHeight || 300;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(parentW * dpr);
      const targetH = Math.round(parentH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, parentW, parentH);

      const cx = parentW / 2;
      const cy = parentH / 2;

      const scale = Math.max(0.2, parentW / 300);
      const radius = Math.min(parentW, parentH) * 0.31;

      if (now > nextBlinkTime && !isBlinking && currentState !== 'THINKING') {
        isBlinking = true;
      }
      if (isBlinking) {
        blinkProgress += delta * 8;
        if (blinkProgress >= 1) {
          blinkProgress = 0;
          isBlinking = false;
          nextBlinkTime = now + 2400 + Math.random() * 3000;
        }
      }

      const mouse = mousePosRef.current;
      let targetLookX = mouse.x * 0.45;
      let targetLookY = mouse.y * 0.3;
      if (liveListening) targetLookY -= 0.12;
      curLookX += (targetLookX - curLookX) * 0.06;
      curLookY += (targetLookY - curLookY) * 0.06;

      // 1. Silver / Chrome Glow behind crystal
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.5);
      const glowAlpha = 0.12 + silverIntensity * 0.28;
      glowGrad.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha.toFixed(3)})`);
      glowGrad.addColorStop(0.5, `rgba(200, 210, 225, ${(silverIntensity * 0.18).toFixed(3)})`);
      glowGrad.addColorStop(1, 'rgba(10, 10, 12, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, parentW, parentH);

      // 2. Liquid Glass & Chrome Torus Loops
      const numLoops = 4;
      const basePulse = Math.sin(now * 0.0025) * (2.2 * scale) + (smoothAudioVol * 6 * scale);

      ctx.save();
      ctx.translate(cx, cy);

      for (let i = 0; i < numLoops; i++) {
        const loopAngle = angle + (i * Math.PI) / (numLoops / 2);
        const rotX = Math.cos(loopAngle) * 0.6;
        const rotY = Math.sin(loopAngle) * 0.4;

        ctx.save();
        ctx.rotate(loopAngle * 0.5 + curLookX * 0.08);

        const rMajor = radius + basePulse;
        const rMinor = radius * 0.52;
        const offsetX = Math.cos(loopAngle) * (14 * scale);
        const offsetY = Math.sin(loopAngle) * (9 * scale);

        ctx.beginPath();
        ctx.ellipse(
          offsetX,
          offsetY,
          rMajor,
          rMinor,
          rotX + (i * Math.PI) / 4,
          0,
          Math.PI * 2
        );

        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetX = 1.5 * scale;
        ctx.shadowOffsetY = 3 * scale;

        // Metallic Silver Chrome Gradient
        const glassGrad = ctx.createLinearGradient(-rMajor, -rMinor, rMajor, rMinor);
        glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        glassGrad.addColorStop(0.25, `rgba(226, 232, 240, ${(0.4 + silverIntensity * 0.2).toFixed(2)})`);
        glassGrad.addColorStop(0.5, `rgba(148, 163, 184, ${(0.2 + silverIntensity * 0.15).toFixed(2)})`);
        glassGrad.addColorStop(0.75, 'rgba(203, 213, 225, 0.5)');
        glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

        ctx.lineWidth = Math.max(2, 16 * scale);
        ctx.strokeStyle = glassGrad;
        ctx.stroke();

        // Outer crystal specular reflection
        ctx.shadowBlur = 0;
        ctx.lineWidth = Math.max(0.9, 2.8 * scale);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.stroke();

        // Inner silver caustic line
        ctx.beginPath();
        ctx.ellipse(
          offsetX,
          offsetY,
          rMajor * 0.86,
          rMinor * 0.8,
          rotX + (i * Math.PI) / 4,
          0,
          Math.PI * 2
        );
        ctx.lineWidth = Math.max(0.6, 1.3 * scale);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.6 + silverIntensity * 0.3).toFixed(2)})`;
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();

      // 3. Central smiling face with pure silver/white eyes
      const eyeSpacing = 24 * scale;
      const eyeY = cy - (2 * scale) + curLookY * (7 * scale);
      const leftEyeX = cx - eyeSpacing + curLookX * (8 * scale);
      const rightEyeX = cx + eyeSpacing + curLookX * (8 * scale);
      const eyeRadius = 11 * scale;

      ctx.save();

      const eyeGlowAlpha = (0.75 + silverIntensity * 0.25).toFixed(2);
      ctx.shadowColor = `rgba(255, 255, 255, ${eyeGlowAlpha})`;
      ctx.shadowBlur = (8 + smoothAudioVol * 8) * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.lineWidth = Math.max(1.5, 4.5 * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (blinkProgress > 0.05) {
        const len = eyeRadius * (1 - blinkProgress * 0.4);
        [leftEyeX, rightEyeX].forEach((ex) => {
          ctx.beginPath();
          ctx.moveTo(ex - len, eyeY);
          ctx.lineTo(ex + len, eyeY);
          ctx.stroke();
        });
      } else {
        const bounce = liveSpeaking ? Math.sin(now * 0.014) * (smoothAudioVol * 3 * scale) : 0;
        [leftEyeX, rightEyeX].forEach((ex) => {
          ctx.beginPath();
          ctx.arc(ex, eyeY + eyeRadius * 0.45 - bounce, eyeRadius, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        });

        if (silverIntensity > 0.15) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(silverIntensity * 0.22).toFixed(2)})`;
          ctx.beginPath();
          ctx.ellipse(leftEyeX - (3.5 * scale), eyeY + (10 * scale), 5 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
          ctx.ellipse(rightEyeX + (3.5 * scale), eyeY + (10 * scale), 5 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      // Holographic Emitter Beam & Particles when projecting
      if (isProjectingRef.current) {
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
        const emitterY = cy + radius * 0.9;

        // Emitter ring
        ctx.beginPath();
        ctx.ellipse(cx, emitterY, radius * 0.45 * (0.95 + pulse * 0.1), radius * 0.12, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${(0.4 + pulse * 0.4).toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();

        // Downward photonic cone
        const coneGrad = ctx.createLinearGradient(cx, emitterY, cx, parentH);
        coneGrad.addColorStop(0, `rgba(56, 189, 248, ${(0.25 + pulse * 0.15).toFixed(2)})`);
        coneGrad.addColorStop(0.6, `rgba(56, 189, 248, ${(0.08 + pulse * 0.05).toFixed(2)})`);
        coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.35, emitterY);
        ctx.lineTo(cx + radius * 0.35, emitterY);
        ctx.lineTo(cx + radius * 0.9, parentH);
        ctx.lineTo(cx - radius * 0.9, parentH);
        ctx.closePath();
        ctx.fillStyle = coneGrad;
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
