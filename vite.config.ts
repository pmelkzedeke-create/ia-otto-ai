import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

const PROJECT_ROOT = path.resolve(import.meta.dirname ?? __dirname);

/**
 * Injeta o token de sessão do OTTO no HTML servido em desenvolvimento.
 * O token é lido de process.env.OTTO_SESSION_TOKEN, definido por server.ts
 * (initSessionToken) antes de o Vite carregar este config.
 * Em produção, o mesmo é feito pelo Express ao servir dist/index.html.
 */
function ottoSessionTokenPlugin(): Plugin {
  return {
    name: 'otto-session-token',
    transformIndexHtml(html) {
      const token = process.env.OTTO_SESSION_TOKEN;
      if (!token || html.includes('name="otto-token"')) return html;
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { name: 'otto-token', content: token },
            injectTo: 'head-prepend' as const,
          },
        ],
      };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), ottoSessionTokenPlugin()],
    resolve: {
      alias: {
        '@': PROJECT_ROOT,
      },
    },
    server: {
      // Permite acesso via hosts externos (proxies de preview / sandbox).
      allowedHosts: true as const,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
