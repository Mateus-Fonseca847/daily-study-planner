/**
 * Captura /habitos (fixture `habits`), o modal “Novo hábito”, o popover do dia e os cartões de
 * Estatísticas com hábitos, em 1920×1080, 1440×900 e 1280×720. Também checa overflow horizontal.
 * Uso: `pnpm visual:habits` → docs/design/screenshots/habits/.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const outDir = path.resolve(webRoot, '../../docs/design/screenshots/habits');
const PORT = 5197;
const NOW = new Date('2026-11-10T10:30:00');
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
];

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
    const base = `http://localhost:${PORT}`;
    const scroller = page.locator('main > div.overflow-y-auto');
    const fullPage = async (name) => {
      const metrics = await scroller.evaluate((el) => ({
        height: el.scrollHeight,
        client: el.clientHeight,
        overflowX: el.scrollWidth > el.clientWidth,
      }));
      report.push({ page: name, viewport: tag, overflowX: metrics.overflowX });
      await page.setViewportSize({
        width: viewport.width,
        height: metrics.height + (viewport.height - metrics.client),
      });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(outDir, `${name}-${tag}.png`) });
      await page.setViewportSize(viewport);
    };

    await page.goto(`${base}/habitos?fixture=habits`);
    await page.getByRole('heading', { name: 'Hábitos', level: 1 }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, `habitos-viewport-${tag}.png`) });
    await fullPage('habitos-pagina');

    // Popover do dia: um dia passado do hábito manual “Musculação”.
    const gym = page.getByRole('region', { name: 'Musculação' });
    await gym.getByRole('gridcell').nth(300).scrollIntoViewIfNeeded();
    await gym.locator('[data-date="2026-11-04"]').click();
    await page.getByRole('dialog', { name: /Musculação/ }).waitFor();
    await page.screenshot({ path: path.join(outDir, `popover-do-dia-${tag}.png`) });
    await page.keyboard.press('Escape');

    // Modal “Novo hábito”.
    await page.getByRole('button', { name: 'Novo hábito' }).click();
    await page.getByRole('dialog', { name: 'Novo hábito' }).waitFor();
    await page.screenshot({ path: path.join(outDir, `modal-novo-habito-${tag}.png`) });
    await page.keyboard.press('Escape');

    await page.goto(`${base}/estatisticas?fixture=habits`);
    await page.getByRole('heading', { name: 'Hábitos de hoje' }).waitFor();
    await page.waitForTimeout(500);
    await fullPage('estatisticas-habitos');
    await context.close();
  }
  writeFileSync(path.join(outDir, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await server.close();
}
