/**
 * Verifica o app publicado: rotas, link direto, manifest, service worker e console sem erros.
 * Uso: `pnpm verify:prod [url]` (padrão: https://dailystudyplanner.vercel.app)
 */
import { chromium } from '@playwright/test';

const base = (process.argv[2] ?? 'https://dailystudyplanner.vercel.app').replace(/\/$/, '');
const ROUTES = ['/calendario', '/habitos', '/foco', '/estatisticas'];
const errors = [];
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  locale: 'pt-BR',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

try {
  for (const route of ROUTES) {
    const res = await page.goto(base + route);
    await page.locator('main').waitFor({ timeout: 15000 });
    check(`carrega ${route}`, res?.status() === 200 && (await page.locator('aside').count()) === 1);
  }

  await page.goto(`${base}/habitos`);
  await page.reload(); // rota direta recarregada
  check('recarrega uma rota direta (/habitos)', (await page.locator('main').count()) === 1);

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await context.request.get(new URL(href, base).href)).json();
  check(
    'manifest com ícones e atalhos',
    manifest.icons?.length >= 3 && manifest.shortcuts?.length === 3,
    manifest.name,
  );

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
  check('service worker controla a página', controlled);

  await context.setOffline(true);
  await page.goto(`${base}/estatisticas`);
  check('abre offline (/estatisticas)', (await page.locator('main').count()) === 1);
  await context.setOffline(false);

  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  const ogRes = await context.request.get(new URL(og, base).href);
  check(
    'imagem Open Graph responde',
    ogRes.ok() && /image\/png/.test(ogRes.headers()['content-type'] ?? ''),
    og,
  );

  check('console sem erros', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `${failed.length} falha(s)` : 'Tudo certo em ' + base);
process.exit(failed.length ? 1 : 0);
