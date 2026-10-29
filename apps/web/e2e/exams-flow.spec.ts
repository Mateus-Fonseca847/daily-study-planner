import { expect, test } from '@playwright/test';

test('criar matéria → prova com 3 conteúdos → calendário → marcar 2 → recarregar → excluir e desfazer', async ({
  page,
}) => {
  await page.goto('/calendario');
  await expect(page.getByRole('heading', { name: 'Seu calendário está vazio' })).toBeVisible();

  // 1. Matéria, pelo menu “Criar”.
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Matéria' }).click();
  const subjectDialog = page.getByRole('dialog', { name: 'Nova matéria' });
  await subjectDialog.getByLabel('Nome').fill('Cálculo');
  await subjectDialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(subjectDialog).toBeHidden();

  // 2. Prova com 3 conteúdos.
  await page.getByRole('button', { name: 'Nova Prova' }).click();
  const form = page.getByRole('dialog', { name: 'Nova prova' });
  await form.getByLabel('Título').fill('Prova de Cálculo');
  await form
    .getByRole('combobox', { name: 'Matéria', exact: true })
    .selectOption({ label: 'Cálculo' });
  for (const [i, title] of ['Limites', 'Derivadas', 'Integrais'].entries()) {
    await form.getByRole('button', { name: 'Adicionar conteúdo' }).click();
    await form.getByRole('textbox', { name: `Conteúdo ${i + 1}`, exact: true }).fill(title);
  }
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(form).toBeHidden();

  // 3. Aparece no calendário; marca 2 conteúdos.
  const chip = page.getByRole('button', { name: /^Prova: Prova de Cálculo/ });
  await expect(chip).toBeVisible();
  await chip.click();
  const popover = page.getByRole('dialog', { name: 'Detalhes: Prova de Cálculo' });
  await expect(popover.getByText('0/3')).toBeVisible();
  await popover.getByText('Limites').click();
  await popover.getByText('Derivadas').click();
  await expect(popover.getByText('2/3')).toBeVisible();
  await expect(popover.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');

  // 4. Persistência: recarrega a página.
  await page.reload();
  await page.getByRole('button', { name: /^Prova: Prova de Cálculo/ }).click();
  const reopened = page.getByRole('dialog', { name: 'Detalhes: Prova de Cálculo' });
  await expect(reopened.getByText('2/3')).toBeVisible();
  await expect(reopened.getByText('Cálculo', { exact: true })).toBeVisible();

  // 5. Excluir e desfazer.
  await reopened.getByRole('button', { name: 'Excluir evento' }).click();
  await expect(page.getByRole('button', { name: /^Prova: Prova de Cálculo/ })).toHaveCount(0);
  const toast = page.getByRole('status');
  await expect(toast).toContainText('excluído');
  await toast.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('button', { name: /^Prova: Prova de Cálculo/ })).toBeVisible();

  // O desfazer também persiste.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Prova: Prova de Cálculo/ })).toBeVisible();
});

test('dado corrompido no armazenamento não quebra o app', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('daily:v2', '{isto não é json');
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('/calendario');

  const notice = page.getByRole('alert');
  await expect(notice).toContainText('corrompidos');
  await expect(page.getByRole('grid', { name: 'Calendário mensal' })).toBeVisible();

  await notice.getByRole('button', { name: 'Começar do zero' }).click();
  await expect(notice).toBeHidden();
});
