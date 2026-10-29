/**
 * Captura as visões do calendário (Dia, Semana, Mês e Ano) com a fixture `views`, mais o popover
 * de um evento na Semana, em 1920×1080, 1440×900 e 1280×720. Também mede o overflow horizontal
 * da página. Uso: `pnpm visual:views` → docs/design/screenshots/views/.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const outDir = path.resolve(webRoot, '../../docs/design/screenshots/views');
const PORT = 5198;
const NOW = new Date('2026-10-29T10:30:00');
const DATE = '2026-10-29';
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
];
const VIEWS = ['dia', 'semana', 'mes', 'ano'];

mkdirSync(outDir, { recursive: true });
const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { port: PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    const tag = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();
    await page.clock.install({ time: NOW });
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

    for (const view of VIEWS) {
      await page.goto(
        `http://localhost:${PORT}/calendario?visao=${view}&data=${DATE}&fixture=views`,
      );
      await page.getByRole('radio', { name: /^(Dia|Semana|Mês|Ano)$/, checked: true }).waitFor();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, `${view}-${tag}.png`) });
      report.push({ view, viewport: tag, overflowX: await overflow() });
    }

    // Popover aberto na Semana.
    await page.goto(`http://localhost:${PORT}/calendario?visao=semana&data=${DATE}&fixture=views`);
    await page.getByRole('grid', { name: 'Calendário semanal' }).waitFor();
    await page.getByRole('button', { name: /Prova: Prova de Física/ }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `semana-popover-${tag}.png`) });
    const box = await page.getByRole('dialog').boundingBox();
    report.push({
      view: 'popover',
      viewport: tag,
      overflowX: await overflow(),
      insideViewport:
        !!box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height,
    });
    await context.close();
  }
  writeFileSync(path.join(outDir, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await server.close();
}
