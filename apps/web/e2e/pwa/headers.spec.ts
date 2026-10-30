import { expect, test } from '@playwright/test';

const ROUTES = [
  '/calendario',
  '/provas',
  '/tarefas',
  '/materias',
  '/blocos',
  '/habitos',
  '/foco',
  '/estatisticas',
  '/preferencias',
];

test.describe('Cabeçalhos de produção (vercel.json)', () => {
  test('cache, segurança e rewrites SPA', async ({ request, page }) => {
    // Links diretos: o rewrite devolve o index.html com os cabeçalhos do documento.
    const route = await request.get('/habitos');
    expect(route.status()).toBe(200);
    expect(route.headers()['cache-control']).toContain('must-revalidate');
    expect(route.headers()['content-security-policy']).toContain("default-src 'self'");
    expect(route.headers()['x-content-type-options']).toBe('nosniff');
    expect(route.headers()['x-frame-options']).toBe('DENY');
    expect(route.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(route.headers()['permissions-policy']).toContain('camera=()');

    for (const path of ['/sw.js', '/index.html', '/manifest.webmanifest']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()['cache-control'], path).toContain('max-age=0');
    }

    // Arquivos com hash são imutáveis; arquivo inexistente não vira index.html.
    await page.goto('/calendario');
    const asset = await page.locator('script[type="module"]').getAttribute('src');
    const res = await request.get(asset!);
    expect(res.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
    expect((await request.get('/assets/nao-existe.js')).status()).toBe(404);
    expect((await request.get('/robots.txt')).headers()['content-type']).toContain('text/plain');
  });
});

test.describe('CSP sem violações', () => {
  test('nenhuma rota viola a política e o Modo Foco (tela cheia, wake lock, som) funciona', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const w = window as unknown as { __csp: string[] };
      w.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        w.__csp.push(
          `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`,
        );
      });
    });

    const violations = () =>
      page.evaluate(() => (window as unknown as { __csp: string[] }).__csp ?? []);

    for (const path of ROUTES) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      expect(await violations(), path).toEqual([]);
    }

    // Modo Foco: iniciar, tela cheia, wake lock e Web Audio.
    await page.goto('/foco');
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
    const fullscreen = page.getByRole('button', { name: /tela cheia/i });
    if (await fullscreen.count()) await fullscreen.first().click();
    const features = await page.evaluate(async () => {
      const AudioCtx = window.AudioContext;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      oscillator.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.01);
      await context.close();
      return {
        wakeLock: 'wakeLock' in navigator,
        fullscreen: document.fullscreenEnabled,
        serviceWorker: 'serviceWorker' in navigator,
      };
    });
    expect(features).toEqual({ wakeLock: true, fullscreen: true, serviceWorker: true });
    expect(await violations()).toEqual([]);

    // O service worker registra sob a política.
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then(Boolean)))
      .toBe(true);
    expect(errors.filter((e) => !/wake ?lock|NotAllowed|fullscreen/i.test(e))).toEqual([]);
  });
});
