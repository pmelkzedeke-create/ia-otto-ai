import React, { useEffect, useState } from 'react';

/**
 * Faixa discreta de "sem conexão".
 *
 * Antes, quando a rede caía, o OTTO simplesmente não respondia e a pessoa
 * achava que o app havia travado. Aqui a causa é dita em uma frase e a faixa
 * sai sozinha quando a conexão volta — sem modal, sem clique obrigatório.
 */
export const OfflineBanner: React.FC<{ isLight?: boolean }> = ({ isLight = false }) => {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let restoredTimer: ReturnType<typeof setTimeout> | undefined;

    const handleOnline = () => {
      setOnline(true);
      setRestored(true);
      restoredTimer = setTimeout(() => setRestored(false), 2600);
    };
    const handleOffline = () => {
      setOnline(false);
      setRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (restoredTimer) clearTimeout(restoredTimer);
    };
  }, []);

  const visible = !online || restored;

  return (
    <div
      className={`ot-offline ${visible ? 'ot-offline--visible' : ''} ${
        isLight ? 'ot-offline--light' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span className={`ot-offline__dot ${online ? 'ot-offline__dot--ok' : ''}`} />
      <span className="ot-offline__text">
        {online ? 'Conexão restabelecida' : 'Sem conexão — o OTTO não consegue responder agora'}
      </span>
    </div>
  );
};
