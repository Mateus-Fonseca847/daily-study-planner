/**
 * Captura screenshots da fixture de referência e gera comparações lado a lado
 * (referência | app) na mesma escala. Uso: `pnpm visual:capture`.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const designDir = path.resolve(webRoot, '../../docs/design');
const outDir = path.join(designDir, 'screenshots');
const compareDir = path.join(outDir, 'compare');
const REF_PATH = path.join(designDir, 'reference/calendar.png');

const PORT = 5199;
const URL_FIXTURE = `http://localhost:${PORT}/calendario?fixture=reference`;
const PROVA = 'Prova: Prova de Cálculo II, 09:30 – 10:30';

/** Referência (808×609): a tela útil começa em ORIGIN e equivale a 1440 px de largura. */
const REF = { width: 808, height: 609 };
const ORIGIN = { x: 23, y: 22 };
const REF_SCREEN_W = 767;
const S = 1440 / REF_SCREEN_W;

/** Regiões em px da imagem de referência; `app` (opcional) é o seletor que define o recorte no app. */
const REGIONS = [
  { name: 'sidebar', ref: { x: 23, y: 22, w: 133, h: 330 }, layout: 'row' },
  { name: 'topbar', ref: { x: 155, y: 22, w: 640, h: 42 }, layout: 'column' },
  { name: 'controls', ref: { x: 155, y: 64, w: 640, h: 54 }, layout: 'column' },
  { name: 'grid', ref: { x: 155, y: 117, w: 640, h: 200 }, layout: 'column', shot: 'plain' },
  { name: 'chips', ref: { x: 333, y: 404, w: 262, h: 96 }, layout: 'row', shot: 'plain' },
  { name: 'popover', ref: { x: 521, y: 270, w: 156, h: 160 }, layout: 'row', popover: true },
];

const b64 = (file) => readFileSync(file).toString('base64');

async function shoot(browser, { width, height, dpr, file, popover }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await context.newPage();
  await page.goto(URL_FIXTURE);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: PROVA }).waitFor();
  const info = { file: path.basename(file) };
  if (popover) {
    await page.getByRole('button', { name: PROVA }).click();
    await page.getByRole('dialog').waitFor();
    info.popover = await page.getByRole('dialog').boundingBox();
  }
  await page.mouse.move(width - 1, height - 1);
  await page.screenshot({ path: file });
  info.overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  await context.close();
  return info;
}

function figure(label, bg, size, x, y, w, h) {
  return `<figure style="margin:0"><div style="width:${w}px;height:${h}px;background:url(data:image/png;base64,${bg}) no-repeat;background-size:${size.w}px ${size.h}px;background-position:${-x}px ${-y}px;"></div><figcaption>${label}</figcaption></figure>`;
}

async function compare(browser, region, shots, popoverBox) {
  const { ref } = region;
  const w = Math.round(ref.w * S);
  const h = Math.round(ref.h * S);
  const appShot = region.popover ? shots.popover : shots.plain;
  // O app é recortado a partir do mesmo canto (mapeado), exceto o popover, alinhado pelo próprio painel.
  let ax = Math.round((ref.x - ORIGIN.x) * S);
  let ay = Math.round((ref.y - ORIGIN.y) * S);
  if (region.popover) {
    ax = Math.round(popoverBox.x);
    ay = Math.round(popoverBox.y);
  }
  const refBg = figure(
    'referência',
    b64(REF_PATH),
    { w: REF.width * S, h: REF.height * S },
    ref.x * S,
    ref.y * S,
    w,
    h,
  );
  const appBg = figure('app', b64(appShot), { w: 1440, h: 900 }, ax, ay, w, h);
  const dir = region.layout === 'column' ? 'column' : 'row';
  const html = `<body style="margin:0;padding:8px;background:#444;font:12px sans-serif;color:#ddd"><div style="display:flex;flex-direction:${dir};gap:8px;width:max-content">${refBg}${appBg}</div></body>`;
  const page = await browser.newPage({ viewport: { width: 2600, height: 1400 } });
  await page.setContent(html);
  await page
    .locator('body > div')
    .screenshot({ path: path.join(compareDir, `${region.name}.png`) });
  await page.close();
}

mkdirSync(compareDir, { recursive: true });
const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { port: PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
try {
  const report = [];
  for (const dpr of [1, 2]) {
    report.push(
      await shoot(browser, {
        width: 1440,
        height: 900,
        dpr,
        file: path.join(outDir, `fixture-1440x900@${dpr}x.png`),
      }),
    );
    report.push(
      await shoot(browser, {
        width: 1440,
        height: 900,
        dpr,
        popover: true,
        file: path.join(outDir, `fixture-popover-1440x900@${dpr}x.png`),
      }),
    );
  }
  for (const [width, height] of [
    [1280, 720],
    [1280, 800],
  ]) {
    report.push(
      await shoot(browser, {
        width,
        height,
        dpr: 1,
        popover: true,
        file: path.join(outDir, `fixture-popover-${width}x${height}@1x.png`),
      }),
    );
  }
  const shots = {
    plain: path.join(outDir, 'fixture-1440x900@1x.png'),
    popover: path.join(outDir, 'fixture-popover-1440x900@1x.png'),
  };
  const popoverBox = report.find((r) => r.file === 'fixture-popover-1440x900@1x.png').popover;
  for (const region of REGIONS) await compare(browser, region, shots, popoverBox);
  copyFileSync(
    path.join(outDir, 'fixture-popover-1440x900@2x.png'),
    path.join(outDir, 'calendar.png'),
  );
  writeFileSync(path.join(outDir, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.table(
    report.map(({ file, overflowX, popover }) => ({
      file,
      overflowX,
      popover:
        popover &&
        `${Math.round(popover.x)},${Math.round(popover.y)} ${Math.round(popover.width)}x${Math.round(popover.height)}`,
    })),
  );
} finally {
  await browser.close();
  await server.close();
}
