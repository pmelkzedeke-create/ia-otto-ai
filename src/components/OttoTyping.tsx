import React, { useEffect, useState, useRef } from 'react';

interface OttoTypingProps {
  message?: string;
  loop?: boolean;
  className?: string;
  onComplete?: () => void;
}

/**
 * Otto · "escrevendo" — máquina de escrever com caret
 * Exatamente de acordo com a especificação fornecida, sem alterar classes ou estilos.
 */
export const OttoTyping: React.FC<OttoTypingProps> = ({
  message = 'Olá! Sou a Otto. Como posso ajudar hoje?',
  loop = true,
  className = '',
  onComplete,
}) => {
  const [text, setText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReduced) {
      setText(message);
      setIsTyping(false);
      onComplete?.();
      return;
    }

    let timeoutId: any = null;
    let i = 0;
    let dir = 1;

    function tick() {
      setIsTyping(true);
      i += dir;
      setText(message.slice(0, i));

      if (dir === 1 && i >= message.length) {
        setIsTyping(false);
        onComplete?.();
        if (loop) {
          dir = -1;
          timeoutId = setTimeout(tick, 1600);
        }
      } else if (dir === -1 && i <= 0) {
        dir = 1;
        timeoutId = setTimeout(tick, 500);
      } else {
        timeoutId = setTimeout(tick, dir === 1 ? 30 + Math.random() * 45 : 14);
      }
    }

    timeoutId = setTimeout(tick, 400);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [message, loop, onComplete]);

  return (
    <div
      ref={containerRef}
      className={`otto-typing ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="otto-typed">{text}</span>
      <span className={`otto-caret ${isTyping ? 'typing' : ''}`} />
    </div>
  );
};

export default OttoTyping;
