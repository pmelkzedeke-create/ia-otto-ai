import React, { useState, useEffect, useRef } from 'react';

interface AppleTypewriterProps {
  text: string;
  speedMs?: number;
  onComplete?: () => void;
  className?: string;
  animate?: boolean;
}

export const AppleTypewriter: React.FC<AppleTypewriterProps> = ({
  text,
  speedMs = 18,
  onComplete,
  className = '',
  animate = true,
}) => {
  const [displayedLength, setDisplayedLength] = useState<number>(animate ? 0 : text.length);
  const [isTyping, setIsTyping] = useState<boolean>(animate);
  const prevTextRef = useRef<string>(text);

  useEffect(() => {
    if (!animate) {
      setDisplayedLength(text.length);
      setIsTyping(false);
      return;
    }

    // Reset if text changes
    if (prevTextRef.current !== text) {
      prevTextRef.current = text;
      setDisplayedLength(0);
      setIsTyping(true);
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 2; // Fluid speed
      if (currentIndex >= text.length) {
        setDisplayedLength(text.length);
        setIsTyping(false);
        clearInterval(interval);
        onComplete?.();
      } else {
        setDisplayedLength(currentIndex);
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [text, speedMs, animate, onComplete]);

  const visibleText = text.slice(0, displayedLength);

  return (
    <span className={`relative inline-block font-sans ${className}`}>
      <span>{visibleText}</span>
      {isTyping && (
        <span
          className="inline-block w-1.5 h-3.5 ml-1 bg-gradient-to-b from-cyan-300 via-sky-400 to-blue-500 rounded-sm animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)] align-middle"
        />
      )}
    </span>
  );
};
