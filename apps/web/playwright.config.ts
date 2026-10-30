import { defineConfig } from '@playwright/test';

const PORT = 5198;
/**
 * O projeto “pwa” roda contra `vite build` servido com as regras de `vercel.json` (rewrites e
 * cabeçalhos, inclusive a CSP); o service worker não existe no dev.
 */
const PWA_PORT = 5199;

const shared = {
  viewport: { width: 1440, height: 900 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  trace: 'retain-on-failure',
} as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    {
      name: 'app',
      testIgnore: '**/pwa/**',
      use: { ...shared, baseURL: `http://localhost:${PORT}` },
    },
    {
      name: 'pwa',
      testMatch: '**/pwa/**/*.spec.ts',
      use: { ...shared, baseURL: `http://localhost:${PWA_PORT}` },
    },
  ],
  webServer: [
    {
      command: `pnpm exec vite --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm exec vite build --outDir dist-pwa && node scripts/serve-dist.mjs dist-pwa ${PWA_PORT}`,
      url: `http://localhost:${PWA_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
