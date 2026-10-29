import { expect, test } from '@playwright/test';

test('checklist da prova atualiza contador e barra; Esc devolve o foco ao chip', async ({
  page,
}) => {
  await page.goto('/calendario?fixture=reference');

  const chip = page.getByRole('button', { name: /^Prova: Prova de Cálculo II/ });
  await chip.click();

  const dialog = page.getByRole('dialog');
  const bar = dialog.getByRole('progressbar');
  await expect(dialog.getByText('2/5')).toBeVisible();
  await expect(bar).toHaveAttribute('aria-valuenow', '40');

  await dialog.getByText('Limites').click();
  await expect(dialog.getByText('1/5')).toBeVisible();
  await expect(bar).toHaveAttribute('aria-valuenow', '20');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(chip).toBeFocused();
});
