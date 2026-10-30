/**
 * Captura todas as rotas em quatro alturas de janela para conferir que o AppShell preenche a
 * viewport. Para ver a faixa do bug, rola o documento até o fim antes da captura.
 * Uso: `pnpm visual:layout [antes|depois]` → docs/design/screenshots/layout/<rota>-<tag>-<WxH>.png
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const outDir = path.resolve(webRoot, '../../docs/design/screenshots/layout');
const PORT = 5196;
const tag = process.argv[2] === 'antes' ? 'antes' : 'depois';
const NOW = new Date('2026-10-29T10:30:00');
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1280, height: 500 },
];
const ROUTES = [
  ['calendario', '/calendario?fixture=views'],
  ['provas', '/provas?fixture=views'],
  ['tarefas', '/tarefas?fixture=views'],
  ['materias', '/materias?fixture=views'],
  ['blocos', '/blocos?fixture=views'],
  ['habitos', '/habitos?fixture=habits'],
  ['foco', '/foco?fixture=focus'],
  ['estatisticas', '/estatisticas?fixture=stats'],
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
    const size = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();
    await page.clock.install({ time: NOW });
    for (const [name, url] of ROUTES) {
      await page.goto(`http://localhost:${PORT}${url}`);
      await page.waitForTimeout(500);
      const docScroll = await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        return {
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
          scrollY: window.scrollY,
        };
      });
      report.push({ route: name, viewport: size, tag, ...docScroll });
      await page.screenshot({ path: path.join(outDir, `${name}-${tag}-${size}.png`) });
    }
    await context.close();
  }
  writeFileSync(path.join(outDir, `report-${tag}.json`), JSON.stringify(report, null, 2));
  console.log(`${report.length} capturas (${tag}) em ${outDir}`);
} finally {
  await browser.close();
  await server.close();
}
