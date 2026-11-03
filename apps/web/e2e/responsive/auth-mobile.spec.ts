import { expect, test } from '@playwright/test';

/**
 * Login no celular (só o fluxo existente, sem alterá-lo): o “Entrar com Google” faz um
 * redirecionamento de página inteira (nunca um popup) e volta para `/calendario`; quem segue sem
 * conta não é levado de novo à tela de entrada.
 */
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});

test.describe('Entrada e login no celular', () => {
  test('“Entrar com Google” redireciona a página inteira (sem popup) e volta para /calendario', async ({
    page,
    context,
  }) => {
    let popups = 0;
    context.on('page', () => (popups += 1));

    // A nuvem de teste não existe: captura a navegação para o provedor.
    const authorize: string[] = [];
    await page.route('http://localhost:54321/**', (route) => {
      authorize.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>provedor</p>' });
    });

    await page.goto('/entrar');
    await expect(page.getByRole('heading', { name: /Entre para não perder/ })).toBeVisible();
    await page.getByRole('button', { name: 'Entrar com Google' }).tap();

    await expect.poll(() => authorize.length).toBeGreaterThan(0);
    const url = new URL(authorize[0]!);
    expect(url.pathname).toBe('/auth/v1/authorize');
    expect(url.searchParams.get('provider')).toBe('google');
    // Volta para a rota do calendário, na mesma origem do app.
    expect(url.searchParams.get('redirect_to')).toBe(
      `${new URL(page.url().startsWith('http://localhost:54321') ? 'http://localhost:5197' : page.url()).origin}/calendario`,
    );
    expect(url.searchParams.get('code_challenge')).toBeTruthy(); // PKCE
    expect(popups).toBe(0);
    expect(page.url()).toContain('localhost:54321'); // a própria aba foi para o provedor
  });

  test('“Continuar sem conta” entra no app e a tela de entrada não volta sozinha', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await page.getByRole('button', { name: 'Continuar sem conta' }).tap();
    await expect(page).toHaveURL(/\/calendario/);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    await page.goto('/');
    await expect(page).toHaveURL(/\/calendario/);
    await page.reload();
    await expect(page).toHaveURL(/\/calendario/);
  });

  test('a tela de entrada e a política cabem no celular com botões em largura total', async ({
    page,
  }) => {
    await page.goto('/entrar');
    for (const name of ['Entrar com Google', 'Continuar sem conta']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!;
      expect(box.width).toBeGreaterThan(390 * 0.7);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const fontSize = await page
      .getByRole('heading', { name: /Entre para não perder/ })
      .locator('xpath=following-sibling::p')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });
});
