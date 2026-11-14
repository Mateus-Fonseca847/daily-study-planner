import { expect, test } from '@playwright/test';

/**
 * Build de produção com a CSP do vercel.json: o tema nasce certo antes do bundle (o JS do app é
 * bloqueado, sobra só o theme-init.js e o CSS), sem violação de CSP.
 */
test.describe('Tema na abertura (produção)', () => {
  for (const [scheme, theme, bg] of [
    ['light', 'light', 'rgb(244, 244, 246)'],
    ['dark', 'dark', 'rgb(19, 19, 19)'],
  ] as const) {
    test(`primeira pintura já no tema ${theme} (Sistema, aparelho ${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      // Sem o bundle do app: o que aparece vem só do <head> (theme-init.js + CSS).
      await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
      await page.goto('/calendario');
      const state = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        scheme: document.documentElement.style.colorScheme,
        bg: getComputedStyle(document.documentElement).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        hydrated: document.getElementById('root')!.childElementCount > 0,
      }));
      expect(state).toEqual({
        theme,
        scheme: theme,
        bg: expect.any(String),
        bodyBg: bg,
        hydrated: false,
      });
    });
  }

  test('usuário existente abre no escuro mesmo com o aparelho claro', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('daily:theme') && !sessionStorage.getItem('seeded')) {
        localStorage.setItem('daily:v5', '{}');
        sessionStorage.setItem('seeded', '1');
      }
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
    await page.goto('/calendario');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  });

  test('sem violação de CSP ao abrir e trocar de tema', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => {
      if (/Content Security Policy|CSP/i.test(m.text())) violations.push(m.text());
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/preferencias');
    await page
      .getByRole('radiogroup', { name: 'Tema' })
      .getByRole('radio', { name: 'Claro' })
      .click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('light');
    await page.getByRole('button', { name: 'Usar tema escuro' }).click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('dark');
    expect(violations).toEqual([]);
  });
});
