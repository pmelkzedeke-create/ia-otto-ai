import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

/**
 * Em desenvolvimento: se o servidor reiniciar (novo BUILD_ID), recarrega a
 * página sozinho. Sem isso o navegador pode ficar exibindo uma versão antiga
 * em cache quando o HMR não está disponível (ex.: atrás de proxy de preview).
 */
if (import.meta.env.DEV) {
  // Selo discreto de build (só em dev): confirma qual versão está na tela.
  const badge = document.createElement('div');
  badge.style.cssText =
    'position:fixed;left:6px;bottom:4px;z-index:9999;font:10px/1 ui-monospace,monospace;' +
    'color:rgba(148,163,184,.55);pointer-events:none;user-select:none;letter-spacing:.04em';
  badge.textContent = 'build …';
  document.body.appendChild(badge);

  const STORAGE_KEY = 'otto_build_id';
  let currentBuildId: string | null = null;

  const check = async () => {
    try {
      const res = await fetch('/__otto/live', { cache: 'no-store' });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId?: string };
      if (!buildId) return;

      if (badge.textContent === 'build …') badge.textContent = `build ${buildId}`;

      if (!currentBuildId) {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        currentBuildId = buildId;
        if (stored && stored !== buildId) {
          sessionStorage.setItem(STORAGE_KEY, buildId);
          window.location.reload();
          return;
        }
        sessionStorage.setItem(STORAGE_KEY, buildId);
        return;
      }

      if (buildId !== currentBuildId) {
        currentBuildId = buildId;
        sessionStorage.setItem(STORAGE_KEY, buildId);
        window.location.reload();
      }
    } catch {
      /* servidor reiniciando — tenta de novo no próximo ciclo */
    }
  };

  void check();
  window.setInterval(check, 2500);
}
