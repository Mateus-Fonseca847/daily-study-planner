/**
 * Sonda de auditoria (não é um teste do CI: só roda com `PROBE=1`): mede cada rota em cada tamanho
 * e grava o resultado em `.reports/responsive-probe.json`. Uso:
 *   PROBE=1 pnpm exec playwright test --project=responsive phase0
 */
import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { auditPage, type AuditResult } from './audit';
import { ROUTES, VIEWPORTS } from './routes';

const results: Record<string, AuditResult & { overflowHint?: string }> = {};

test('sonda', async ({ browser }) => {
  test.skip(!process.env.PROBE, 'sonda manual: rode com PROBE=1');
  test.setTimeout(600_000);
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.touch,
      hasTouch: viewport.touch,
      deviceScaleFactor: 2,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();
    for (const route of ROUTES) {
      await page.clock.install({ time: route.now });
      await page.goto(`http://localhost:5197${route.url}`);
      await page.waitForTimeout(600);
      results[`${route.name}@${viewport.name}`] = await auditPage(page);
    }
    await context.close();
  }
  mkdirSync('.reports', { recursive: true });
  writeFileSync('.reports/responsive-probe.json', JSON.stringify(results, null, 2));
});
