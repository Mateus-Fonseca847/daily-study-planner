import { expect, test, type Page } from '@playwright/test';

/** Espera o service worker ativar e passar a controlar a página (recarrega se preciso). */
async function waitControlled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) {
    await page.reload();
  }
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
}

/** Registra erros de console e exceções não tratadas. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.describe('PWA (build de produção)', () => {
  test('o manifest é servido com os campos exigidos, ícones e atalhos', async ({
    page,
    request,
  }) => {
    await page.goto('/calendario');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const response = await request.get(href!);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();

    expect(manifest).toMatchObject({
      name: 'Daily — organizador de estudos',
      short_name: 'Daily',
      lang: 'pt-BR',
      start_url: '/calendario',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#131313',
      background_color: '#131313',
      categories: ['education', 'productivity'],
    });
    expect(manifest.description).toBeTruthy();

    const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => [
      i.sizes,
      i.purpose ?? 'any',
    ]);
    expect(sizes).toEqual(
      expect.arrayContaining([
        ['192x192', 'any'],
        ['512x512', 'any'],
        ['512x512', 'maskable'],
      ]),
    );
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    }

    expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual([
      '/foco',
      '/habitos',
      '/estatisticas',
    ]);
  });

  test('o service worker registra e passa a controlar a página', async ({ page }) => {
    await page.goto('/calendario');
    await waitControlled(page);
    const scope = await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistration())?.scope,
    );
    expect(scope).toMatch(/\/$/);
  });

  test('offline: /habitos e /foco abrem e os dados continuam lá', async ({ page, context }) => {
    const errors = collectErrors(page);
    await page.goto('/materias');
    await waitControlled(page);

    // Cria um dado para conferir a persistência.
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Matéria' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova matéria' });
    await dialog.getByLabel('Nome').fill('Cálculo offline');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Cálculo offline').locator('visible=true').first()).toBeVisible();

    await context.setOffline(true);

    for (const path of ['/habitos', '/foco', '/estatisticas']) {
      await page.goto(path); // navegação direta, só com o service worker
      await expect(page.getByRole('navigation', { name: 'Menus' })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();

    await page.goto('/materias');
    await expect(page.getByText('Cálculo offline').locator('visible=true').first()).toBeVisible();

    await context.setOffline(false);
    expect(errors.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('?fixture= não tem efeito no build de produção', async ({ page }) => {
    await page.goto('/calendario?fixture=views&visao=semana&data=2026-10-29');
    await expect(page.getByRole('grid', { name: 'Calendário semanal' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Simulado|Grupo de estudos/ })).toHaveCount(0);

    await page.goto('/foco?fixture=focus');
    await expect(page.locator('aside')).toHaveCount(1); // a fixture “focus” travaria o app
    await expect(page.getByRole('navigation', { name: 'Menus' })).toBeVisible();

    await page.goto('/habitos?fixture=habits');
    await expect(page.getByRole('heading', { name: 'Hidratação' })).toHaveCount(0);
  });

  test('as rotas principais carregam sem erros de console', async ({ page }) => {
    const errors = collectErrors(page);
    for (const path of [
      '/calendario',
      '/provas',
      '/tarefas',
      '/habitos',
      '/foco',
      '/estatisticas',
    ]) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
