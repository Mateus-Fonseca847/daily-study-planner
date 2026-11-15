import { expect, test } from '@playwright/test';

test.describe('Termos de Serviço', () => {
  test('a página pública abre sem o shell, com as seções, o contato e os links', async ({
    page,
  }) => {
    await page.goto('/termos');
    await expect(page.getByRole('heading', { level: 1, name: 'Termos de Serviço' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '5. Uso aceitável' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '12. Contato' })).toBeVisible();
    // Fora do AppShell: sem navegação lateral.
    await expect(page.getByRole('navigation')).toHaveCount(0);

    await page.getByRole('link', { name: 'Política de privacidade' }).first().click();
    await expect(page).toHaveURL(/\/privacidade$/);
    await page.getByRole('link', { name: 'Termos de Serviço' }).click();
    await expect(page).toHaveURL(/\/termos$/);
  });

  test('“Voltar ao Daily” leva ao app', async ({ page }) => {
    await page.goto('/termos');
    await page.getByRole('link', { name: '← Voltar ao Daily' }).click();
    await expect(page).toHaveURL(/\/calendario/);
  });
});
