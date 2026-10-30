import { expect, test } from '@playwright/test';

test.describe('Preferências: aplicativo e armazenamento', () => {
  test('mostra a situação do armazenamento, o espaço usado e instruções de instalação', async ({
    page,
  }) => {
    await page.goto('/preferencias');
    const section = page.getByRole('region', { name: 'Aplicativo e armazenamento' });
    await expect(section).toBeVisible();
    await expect(section.locator('p', { hasText: 'Situação:' })).toContainText(
      /ativo|não garantido/,
    );
    await expect(section.getByText(/espaço usado:/)).toBeVisible();
    // Sem `beforeinstallprompt` (dev/Playwright) o botão não aparece e há instruções manuais.
    await expect(section.getByRole('button', { name: 'Instalar app' })).toHaveCount(0);
    await expect(section.getByText(/Chrome ou no Edge/)).toBeVisible();
    await expect(section.getByRole('button', { name: 'Exportar dados' })).toBeEnabled();
  });

  test('o botão “Instalar app” aparece quando o navegador oferece a instalação', async ({
    page,
  }) => {
    await page.goto('/preferencias');
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      });
      window.dispatchEvent(event);
    });
    await expect(page.getByRole('button', { name: 'Instalar app' })).toHaveCount(2); // sidebar + seção
    await page.getByRole('button', { name: 'Instalar app' }).last().click();
    await expect(page.getByRole('button', { name: 'Instalar app' })).toHaveCount(0);
  });

  test('o indicador “Offline” aparece na topbar sem conexão', async ({ page, context }) => {
    await page.goto('/calendario');
    await expect(page.getByText('Offline', { exact: true })).toHaveCount(0);
    await context.setOffline(true);
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText('Offline', { exact: true })).toHaveCount(0);
  });
});
