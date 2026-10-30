import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * URL pública do app, usada nas metas Open Graph e Twitter (que exigem endereço absoluto).
 * Endereço de produção na Vercel; `SITE_URL` no ambiente tem precedência (vazio = caminhos relativos).
 */
const SITE_URL = (process.env.SITE_URL ?? 'https://dailystudyplanner.vercel.app').replace(/\/$/, '');

/** Mesmo valor de `--ds-color-bg` em `tokens.css` (o manifest não lê CSS). */
const BG_COLOR = '#131313';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'daily-site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL),
    },
    VitePWA({
      // “prompt”: a nova versão só entra quando o usuário aceita (nunca recarrega sozinho).
      registerType: 'prompt',
      // O service worker só existe no build e no preview; `pnpm dev` não o registra.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'favicon.ico', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Daily — organizador de estudos',
        short_name: 'Daily',
        description:
          'Organizador de estudos: calendário, provas, tarefas, hábitos, Modo Foco e estatísticas, tudo no seu navegador.',
        lang: 'pt-BR',
        start_url: '/calendario',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: BG_COLOR,
        background_color: BG_COLOR,
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/daily-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/daily-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/daily-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Modo Foco',
            url: '/foco',
            icons: [{ src: '/icons/daily-192.png', sizes: '192x192' }],
          },
          {
            name: 'Hábitos',
            url: '/habitos',
            icons: [{ src: '/icons/daily-192.png', sizes: '192x192' }],
          },
          {
            name: 'Estatísticas',
            url: '/estatisticas',
            icons: [{ src: '/icons/daily-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Pré-cache de todo o app shell; links diretos a qualquer rota caem no index.html.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5173 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
