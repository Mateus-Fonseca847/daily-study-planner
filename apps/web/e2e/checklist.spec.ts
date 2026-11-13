import { expect, test } from '@playwright/test';

test('conteúdos da prova no painel atualizam contador e barra; Esc devolve o foco ao chip', async ({
  page,
}) => {
  await page.goto('/calendario?fixture=reference');

  const chip = page.getByRole('button', { name: /^Prova: Prova de Cálculo II/ });
  await chip.click();

  const panel = page.getByRole('dialog', { name: 'Prova de Cálculo II' });
  const bar = panel.getByRole('progressbar');
  await expect(panel.getByRole('heading', { name: /Conteúdos/ })).toContainText('2 de 5');
  await expect(bar).toHaveAttribute('aria-valuenow', '40');

  await panel.getByRole('checkbox', { name: 'Marcar “Limites”' }).click();
  await expect(panel.getByRole('heading', { name: /Conteúdos/ })).toContainText('1 de 5');
  await expect(bar).toHaveAttribute('aria-valuenow', '20');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(chip).toBeFocused();
});
