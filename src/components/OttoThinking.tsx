import React from 'react';

interface OttoThinkingProps {
  className?: string;
}

/**
 * Otto · "pensando" — minimalista, P&B, estilo Apple
 * Exatamente de acordo com a especificação fornecida, sem alterar classes ou estilos.
 */
export const OttoThinking: React.FC<OttoThinkingProps> = ({ className = '' }) => {
  return (
    <div className={`otto-thinking ${className}`.trim()} role="status" aria-label="Otto está pensando">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
  );
};

export default OttoThinking;
