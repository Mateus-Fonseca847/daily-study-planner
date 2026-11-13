/**
 * Regressão visual do desktop: captura todas as telas com as fixtures de desenvolvimento em
 * 1280×720, 1440×900 e 1920×1080 e compara com a linha de base.
 *   node scripts/desktop-regression.mjs capture   → apps/web/.reports/baseline/   (a linha de base)
 *   node scripts/desktop-regression.mjs compare   → apps/web/.reports/current/ + diferenças em diff.json
 * As pastas ficam fora do Git. A comparação é pixel a pixel (tolerância de canal e de proporção
 * abaixo), feita no navegador com canvas, sem dependências.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const reports = path.join(webRoot, '.reports');
const PORT = 5194;
const mode = process.argv[2] === 'compare' ? 'compare' : 'capture';
const outDir = path.join(reports, mode === 'compare' ? 'current' : 'baseline');

/** Variáveis de nuvem falsas: mostram o botão “Entrar” e a rota /entrar, sem rede. */
process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key';

const VIEWS_NOW = new Date('2026-10-29T10:30:00');
const STATS_NOW = new Date('2026-11-10T10:30:00');
const SIZES = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
];
const CAL = (v) => `/calendario?fixture=views&visao=${v}&data=2026-10-29`;
const ROUTES = [
  ['calendario-mes', CAL('mes'), VIEWS_NOW],
  ['calendario-semana', CAL('semana'), VIEWS_NOW],
  ['calendario-dia', CAL('dia'), VIEWS_NOW],
  ['calendario-ano', CAL('ano'), VIEWS_NOW],
  ['provas', '/provas?fixture=views', VIEWS_NOW],
  ['tarefas', '/tarefas?fixture=views', VIEWS_NOW],
  ['materias', '/materias?fixture=views', VIEWS_NOW],
  ['habitos', '/habitos?fixture=habits', STATS_NOW],
  ['foco', '/foco?fixture=stats', STATS_NOW],
  ['foco-travado', '/foco?fixture=focus', STATS_NOW],
  ['perfil', '/perfil?fixture=stats', STATS_NOW],
  ['preferencias', '/preferencias?fixture=stats', STATS_NOW],
  ['entrar', '/entrar', STATS_NOW],
  ['privacidade', '/privacidade', STATS_NOW],
];

/** Diferença tolerada por canal (suavização de fontes) e proporção de pixels diferentes. */
const CHANNEL_TOLERANCE = 12;
const MAX_DIFF_RATIO = 0.0005;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { port: PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
const failures = [];
const results = [];

try {
  for (const [width, height] of SIZES) {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    for (const [name, url, now] of ROUTES) {
      await page.clock.install({ time: now });
      await page.goto(`http://localhost:${PORT}${url}`);
      await page.waitForTimeout(700);
      const file = `${name}-${width}x${height}.png`;
      await page.screenshot({ path: path.join(outDir, file), animations: 'disabled' });
    }
    await context.close();
  }

  if (mode === 'compare') {
    const baseDir = path.join(reports, 'baseline');
    const compare = await browser.newPage();
    await compare.setContent('<canvas id="a"></canvas><canvas id="b"></canvas>');
    for (const file of readdirSync(baseDir).filter((f) => f.endsWith('.png'))) {
      const a = readFileSync(path.join(baseDir, file)).toString('base64');
      const b = readFileSync(path.join(outDir, file)).toString('base64');
      const r = await compare.evaluate(
        async ({ a, b, tolerance }) => {
          const load = async (b64, id) => {
            const img = new Image();
            img.src = `data:image/png;base64,${b64}`;
            await img.decode();
            const c = document.getElementById(id);
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            return ctx.getImageData(0, 0, img.width, img.height);
          };
          const x = await load(a, 'a');
          const y = await load(b, 'b');
          if (x.width !== y.width || x.height !== y.height)
            return { size: false, ratio: 1, diff: -1 };
          let diff = 0;
          for (let i = 0; i < x.data.length; i += 4) {
            if (
              Math.abs(x.data[i] - y.data[i]) > tolerance ||
              Math.abs(x.data[i + 1] - y.data[i + 1]) > tolerance ||
              Math.abs(x.data[i + 2] - y.data[i + 2]) > tolerance
            )
              diff += 1;
          }
          return { size: true, diff, ratio: diff / (x.width * x.height) };
        },
        { a, b, tolerance: CHANNEL_TOLERANCE },
      );
      results.push({ file, ...r });
      if (!r.size || r.ratio > MAX_DIFF_RATIO) failures.push({ file, ...r });
    }
    writeFileSync(path.join(reports, 'diff.json'), JSON.stringify({ results, failures }, null, 2));
    console.log(
      `${results.length} imagens comparadas; ${failures.length} com diferença acima da tolerância`,
    );
    for (const f of failures)
      console.log(`  ${f.file}  pixels diferentes: ${f.diff}  (${(f.ratio * 100).toFixed(3)} %)`);
  } else {
    console.log(`Linha de base: ${ROUTES.length * SIZES.length} imagens em ${outDir}`);
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failures.length ? 1 : 0);
