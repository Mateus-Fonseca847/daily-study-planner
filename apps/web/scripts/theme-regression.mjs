/**
 * Regressão visual de um tema: captura todas as rotas (com as fixtures de desenvolvimento) em
 * todos os tamanhos dos testes responsivos e do desktop, mais alguns estados abertos (painel,
 * menu Criar, sheet “Mais”), e compara com a linha de base.
 *   node scripts/theme-regression.mjs capture [dark|light]  → .reports/baseline-<tema>/
 *   node scripts/theme-regression.mjs compare [dark|light]  → .reports/current-<tema>/ + diff-<tema>.json
 * O tema vem de `prefers-color-scheme` emulado (o padrão do app para uma instalação nova é
 * “Sistema”). Na comparação do escuro, o atalho de tema e a seção Aparência (novos) ficam
 * invisíveis no lugar. As pastas ficam fora do Git; a comparação é pixel a pixel no canvas.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const reports = path.join(webRoot, '.reports');
const PORT = 5195;
const mode = process.argv[2] === 'compare' ? 'compare' : 'capture';
const theme = process.argv[3] === 'light' ? 'light' : 'dark';
const baseDir = path.join(reports, `baseline-${theme}`);
const outDir = mode === 'compare' ? path.join(reports, `current-${theme}`) : baseDir;

process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key';

const VIEWS_NOW = new Date('2026-10-29T10:30:00');
const STATS_NOW = new Date('2026-11-10T10:30:00');
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
/** Estados abertos: [nome, rota, agora, ação, só no celular?]. */
const STATES = [
  [
    'painel-nova-tarefa',
    CAL('semana'),
    VIEWS_NOW,
    (p) => p.getByRole('button', { name: 'Nova tarefa' }).first().click(),
    false,
  ],
  [
    'menu-criar',
    CAL('mes'),
    VIEWS_NOW,
    (p) => p.getByRole('button', { name: 'Criar', exact: true }).first().click(),
    false,
  ],
  [
    'sheet-mais',
    CAL('mes'),
    VIEWS_NOW,
    (p) => p.getByRole('button', { name: 'Mais', exact: true }).tap(),
    true,
  ],
];
const SIZES = [
  ['celular-375x667', 375, 667, true],
  ['celular-390x844', 390, 844, true],
  ['celular-412x915', 412, 915, true],
  ['celular-paisagem-844x390', 844, 390, true],
  ['tablet-768x1024', 768, 1024, true],
  ['notebook-1024x768', 1024, 768, true],
  ['tablet-paisagem-1194x834', 1194, 834, true],
  ['desktop-1280x720', 1280, 720, false],
  ['desktop-1440x900', 1440, 900, false],
  ['desktop-1920x1080', 1920, 1080, false],
];
const PHONES = new Set(['celular-390x844']);
const STATE_SIZES = new Set(['celular-390x844', 'tablet-768x1024', 'desktop-1440x900']);

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
let shots = 0;

try {
  for (const [size, width, height, touch] of SIZES) {
    const context = await browser.newContext({
      viewport: { width, height },
      ...(touch ? { isMobile: true, hasTouch: true } : {}),
      deviceScaleFactor: 1,
      colorScheme: theme,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const shoot = async (name) => {
      // Na prova do escuro, os controles novos do Prompt 13 (atalho de tema e seção Aparência)
      // ficam invisíveis sem sair do lugar: o resto tem de ser idêntico à linha de base.
      if (theme === 'dark' && mode === 'compare') {
        await page.addStyleTag({
          content: '[data-theme-toggle], [data-appearance] { visibility: hidden !important; }',
        });
      }
      await page.screenshot({
        path: path.join(outDir, `${name}-${size}.png`),
        animations: 'disabled',
      });
      shots += 1;
    };
    for (const [name, url, now] of ROUTES) {
      await page.clock.install({ time: now });
      await page.goto(`http://localhost:${PORT}${url}`);
      await page.waitForTimeout(700);
      await shoot(name);
    }
    if (STATE_SIZES.has(size)) {
      for (const [name, url, now, act, phoneOnly] of STATES) {
        if (phoneOnly && !PHONES.has(size)) continue;
        await page.clock.install({ time: now });
        await page.goto(`http://localhost:${PORT}${url}`);
        await page.waitForTimeout(600);
        try {
          await act(page);
          await page.waitForTimeout(500);
          await shoot(name);
        } catch (error) {
          console.log(
            `  (estado ${name} em ${size} indisponível: ${String(error).split('\n')[0]})`,
          );
        }
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
    await context.close();
  }

  if (mode === 'compare') {
    const compare = await browser.newPage();
    await compare.setContent('<canvas id="a"></canvas><canvas id="b"></canvas>');
    for (const file of readdirSync(baseDir).filter((f) => f.endsWith('.png'))) {
      if (!existsSync(path.join(outDir, file))) {
        failures.push({ file, missing: true });
        continue;
      }
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
    writeFileSync(
      path.join(reports, `diff-${theme}.json`),
      JSON.stringify({ results, failures }, null, 2),
    );
    console.log(`${results.length} imagens comparadas; ${failures.length} acima da tolerância`);
    for (const f of failures)
      console.log(
        `  ${f.file}  ${f.missing ? 'faltando' : `${f.diff} px (${(f.ratio * 100).toFixed(3)} %)`}`,
      );
  } else {
    console.log(`Linha de base (${theme}): ${shots} imagens em ${outDir}`);
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failures.length ? 1 : 0);
