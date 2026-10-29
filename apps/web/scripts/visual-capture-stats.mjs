/**
 * Captura a página de Estatísticas (fixture `stats`) em 1920×1080, 1440×900 e 1280×720:
 * a página inteira (rolagem expandida), a seção “Hoje” e, por região, o lado a lado com a
 * referência `docs/design/reference/stats-dashboard.png`. Também checa overflow horizontal.
 * Uso: `pnpm visual:stats`.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const outDir = path.resolve(webRoot, '../../docs/design/screenshots/stats');
const refPath = path.resolve(webRoot, '../../docs/design/reference/stats-dashboard.png');
const PORT = 5194;
const NOW = new Date('2026-11-10T10:30:00');
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
];

/** Regiões da referência (px na imagem 1187×896) e o cartão equivalente na página. */
const REGIONS = [
  { name: 'horas', ref: [82, 276, 248, 287], card: 'Horas de estudo' },
  { name: 'preparacao', ref: [343, 276, 249, 287], card: 'Preparação' },
  { name: 'sequencia-agua', ref: [604, 276, 161, 287], card: 'Água', withStreak: true },
  { name: 'metas', ref: [778, 276, 336, 529], card: 'Metas do dia' },
  { name: 'agenda', ref: [82, 576, 683, 229], card: 'Agenda de hoje' },
];

const refB64 = readFileSync(refPath).toString('base64');
const REF_SIZE = { w: 1187, h: 896 };

mkdirSync(outDir, { recursive: true });
const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { port: PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
const report = [];

const figure = (label, inner) =>
  `<figure style="margin:0;font:12px Inter,sans-serif;color:#aaa">${inner}<figcaption style="padding:6px 0">${label}</figcaption></figure>`;

async function sideBySide(page, region, mineBuffer, mineH, tag) {
  const [x, y, w, h] = region.ref;
  const refEl = `<div style="width:${w}px;height:${h}px;background:url(data:image/png;base64,${refB64}) no-repeat;background-size:${REF_SIZE.w}px ${REF_SIZE.h}px;background-position:${-x}px ${-y}px;border-radius:24px"></div>`;
  const mine = `<img height="${mineH}" src="data:image/png;base64,${mineBuffer.toString('base64')}" />`;
  await page.setViewportSize({ width: 1500, height: 700 });
  await page.setContent(
    `<body style="margin:0;padding:16px;background:#111;display:flex;gap:24px;align-items:flex-start;width:max-content">${figure('Referência', refEl)}${figure(`Daily (${tag})`, mine)}</body>`,
  );
  await page.locator('body').screenshot({
    path: path.join(outDir, `compare-${region.name}-${tag}.png`),
  });
}

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
    await page.goto(`http://localhost:${PORT}/estatisticas?fixture=stats`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForTimeout(600);

    const scroller = page.locator('main > div.overflow-y-auto');
    const metrics = await scroller.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowX: el.scrollWidth > el.clientWidth,
    }));
    report.push({ viewport: tag, ...metrics });

    // Viewport inicial (primeira dobra).
    await page.screenshot({ path: path.join(outDir, `viewport-${tag}.png`) });

    // Página inteira: amplia a janela até caber toda a rolagem.
    const chrome = viewport.height - metrics.clientHeight;
    await page.setViewportSize({
      width: viewport.width,
      height: metrics.scrollHeight + chrome,
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `full-${tag}.png`) });

    // Lado a lado por região, só na janela principal e em 1440 (a referência é 4 colunas).
    if (viewport.width >= 1440) {
      for (const region of REGIONS) {
        const box = await page
          .getByRole('region', { name: region.card, exact: true })
          .first()
          .boundingBox();
        if (!box) continue;
        let { x, y, width, height } = box;
        if (region.withStreak) {
          const pill = await page
            .getByText(/^\d+ dias?$/)
            .first()
            .boundingBox();
          if (pill) {
            height = y + height - pill.y;
            y = pill.y;
          }
        }
        const buffer = await page.screenshot({
          clip: { x, y, width, height },
        });
        await sideBySide(await context.newPage(), region, buffer, region.ref[3], tag);
      }
    }
    await context.close();
  }
  writeFileSync(path.join(outDir, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await server.close();
}
