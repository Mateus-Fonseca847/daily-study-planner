import { expect, test } from '@playwright/test';
import { auditPage } from './audit';
import { DESKTOP_VIEWPORTS, ROUTES, VIEWPORTS } from './routes';

/**
 * Cada rota em cada tamanho: (a) o documento não rola; (b) nada visível fora da janela, exceto em
 * áreas de rolagem horizontal intencionais (`data-scroll-x`); (c) alvos de toque ≥ 44 px nos
 * controles principais e ≥ 24 px nos densos; (d) campos de texto com ≥ 16 px; (e) sem erro de
 * console nem violação de CSP. No desktop só valem (a), (b) e (e) (regressão).
 */
for (const viewport of [...VIEWPORTS, ...DESKTOP_VIEWPORTS]) {
  test.describe(`${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.touch,
      hasTouch: viewport.touch,
      deviceScaleFactor: viewport.touch ? 2 : 1,
    });

    test(`todas as rotas em ${viewport.width}×${viewport.height}`, async ({ page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const w = window as unknown as { __csp: string[] };
        w.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
        });
      });

      for (const route of ROUTES) {
        await page.clock.install({ time: route.now });
        await page.goto(route.url);
        await page.waitForTimeout(400);
        const audit = await auditPage(page);
        const where = `${route.name} @ ${viewport.name}`;

        expect(
          audit.documentOverflow.x,
          `${where}: rolagem horizontal do documento`,
        ).toBeLessThanOrEqual(0);
        expect(
          audit.documentOverflow.y,
          `${where}: rolagem vertical do documento`,
        ).toBeLessThanOrEqual(0);
        expect(audit.offscreen, `${where}: elementos fora da janela`).toEqual([]);
        expect(audit.horizontalScrollers, `${where}: rolagem horizontal não intencional`).toEqual(
          [],
        );
        if (viewport.touch) {
          expect(audit.smallTargets, `${where}: alvos de toque < 44 px`).toEqual([]);
          expect(audit.tinyTargets, `${where}: alvos densos < 24 px`).toEqual([]);
          expect(audit.smallInputs, `${where}: campos com fonte < 16 px`).toEqual([]);
        }
        const csp = await page.evaluate(
          () => (window as unknown as { __csp: string[] }).__csp ?? [],
        );
        expect(csp, `${where}: violações de CSP`).toEqual([]);
      }
      expect(errors, 'erros de console').toEqual([]);
    });
  });
}
