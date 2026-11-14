import { defineConfig } from '@playwright/test';

const PORT = 5198;
/**
 * O projeto “pwa” roda contra `vite build` servido com as regras de `vercel.json` (rewrites e
 * cabeçalhos, inclusive a CSP); o service worker não existe no dev.
 */
const PWA_PORT = 5199;
/** O projeto “responsive” usa o app em dev com variáveis de nuvem falsas (mostra “Entrar” e `/entrar`, sem rede). */
const RESPONSIVE_PORT = 5197;

const shared = {
  viewport: { width: 1440, height: 900 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  // O Playwright emula `light` por padrão; os testes rodam no tema escuro (o original), e
  // `e2e/theme.spec.ts` troca com `page.emulateMedia`.
  colorScheme: 'dark',
  trace: 'retain-on-failure',
} as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Local: 2 workers. Com o padrão (metade dos núcleos) a máquina satura e testes de tempo real
  // (gestos, navegação) ficam instáveis. O CI usa o padrão do runner.
  workers: process.env.CI ? undefined : 2,
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    {
      name: 'app',
      testIgnore: ['**/pwa/**', '**/responsive/**'],
      use: { ...shared, baseURL: `http://localhost:${PORT}` },
    },
    {
      name: 'responsive',
      testMatch: '**/responsive/**/*.spec.ts',
      use: { ...shared, baseURL: `http://localhost:${RESPONSIVE_PORT}` },
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
      command: `pnpm exec vite --port ${RESPONSIVE_PORT} --strictPort`,
      url: `http://localhost:${RESPONSIVE_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-key' },
    },
    {
      command: `pnpm exec vite build --outDir dist-pwa && node scripts/serve-dist.mjs dist-pwa ${PWA_PORT}`,
      url: `http://localhost:${PWA_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
