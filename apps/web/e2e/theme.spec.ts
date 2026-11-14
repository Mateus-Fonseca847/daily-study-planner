import { expect, test, type Page } from '@playwright/test';
import { seedSnapshot } from './helpers';

const LIGHT_BG = 'rgb(244, 244, 246)';
const DARK_BG = 'rgb(19, 19, 19)';
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const themeColors = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(
      (m) => m.content,
    ),
  );
const appearance = (page: Page) => page.getByRole('radiogroup', { name: 'Tema' });

test.describe('Tema claro e escuro', () => {
  test('instalação nova começa em Sistema e acompanha o aparelho sem recarregar', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/preferencias');
    await expect(appearance(page).getByRole('radio', { name: 'Sistema' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(await theme(page)).toBe('light');
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
    expect(await themeColors(page)).toEqual(['#131313', '#f4f4f6']);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => theme(page)).toBe('dark');
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
  });

  test('usuário existente (com dados) continua no escuro mesmo com o aparelho claro', async ({
    page,
  }) => {
    await seedSnapshot(page, {});
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/preferencias');
    expect(await theme(page)).toBe('dark');
    await expect(appearance(page).getByRole('radio', { name: 'Escuro' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('escolha manual vale contra o aparelho e sobrevive ao recarregar', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/preferencias');
    await appearance(page).getByRole('radio', { name: 'Claro' }).click();
    await expect.poll(() => theme(page)).toBe('light');
    expect(await themeColors(page)).toEqual(['#f4f4f6', '#f4f4f6']);

    await page.reload();
    expect(await theme(page)).toBe('light');
    await expect(appearance(page).getByRole('radio', { name: 'Claro' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Mudar o aparelho não mexe numa escolha manual.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await theme(page)).toBe('light');
  });

  test('atalho sol/lua na topbar alterna e grava; a página não faz requisições por causa do tema', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/calendario');
    await expect(page.getByRole('button', { name: 'Usar tema claro' })).toBeVisible();
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    await page.getByRole('button', { name: 'Usar tema claro' }).click();
    await expect.poll(() => theme(page)).toBe('light');
    await page.getByRole('button', { name: 'Usar tema escuro' }).click();
    await expect.poll(() => theme(page)).toBe('dark');
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('daily:theme'))).toBe('escuro');
  });

  test('trocar de tema com o Modo Foco rodando não perturba o cronômetro', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-10T10:00:00') });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/foco');
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await page.clock.fastForward(60_000);
    await expect(page.getByRole('timer')).toHaveText(/^2[34]:\d\d$/);

    await page.getByRole('button', { name: 'Usar tema claro' }).click();
    await expect.poll(() => theme(page)).toBe('light');
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await page.clock.fastForward(60_000);
    await expect(page.getByRole('timer')).toHaveText(/^2[23]:\d\d$/);
  });

  test('outra aba acompanha a troca', async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/calendario');
    const other = await context.newPage();
    await other.emulateMedia({ colorScheme: 'dark' });
    await other.goto('/habitos');
    await page.getByRole('button', { name: 'Usar tema claro' }).click();
    await expect.poll(() => theme(other)).toBe('light');
  });
});
