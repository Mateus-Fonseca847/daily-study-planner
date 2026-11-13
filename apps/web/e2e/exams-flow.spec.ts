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

  // 2. Prova com 3 conteúdos, pelo painel (“+ Nova tarefa” e o tipo Prova).
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByRole('dialog', { name: 'Nova tarefa' }).getByRole('radio', { name: 'Prova' }).click();
  // O painel acompanha o tipo escolhido.
  const form = page.getByRole('dialog', { name: 'Nova prova' });
  await expect(form).toBeVisible();
  await form.getByLabel('Título', { exact: true }).fill('Prova de Cálculo');
  await form.getByRole('button', { name: 'Mais opções' }).click();
  await form.getByLabel('Matéria').selectOption({ label: 'Cálculo' });
  for (const title of ['Limites', 'Derivadas', 'Integrais']) {
    await form.getByLabel('Novo conteúdo').fill(title);
    await form.getByLabel('Novo conteúdo').press('Enter');
  }
  await form.getByRole('button', { name: 'Criar prova' }).click();
  await expect(form).toBeHidden();

  // 3. Aparece no calendário; marca 2 conteúdos.
  const chip = page.getByRole('button', { name: /^Prova: Prova de Cálculo/ });
  await expect(chip).toBeVisible();
  await chip.click();
  const panel = page.getByRole('dialog', { name: 'Prova de Cálculo' });
  const heading = panel.getByRole('heading', { name: /Conteúdos/ });
  await expect(heading).toContainText('0 de 3');
  await panel.getByRole('checkbox', { name: 'Marcar “Limites”' }).click();
  await panel.getByRole('checkbox', { name: 'Marcar “Derivadas”' }).click();
  await expect(heading).toContainText('2 de 3');
  await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');

  // 4. Persistência: recarrega a página.
  await page.reload();
  await page.getByRole('button', { name: /^Prova: Prova de Cálculo/ }).click();
  const reopened = page.getByRole('dialog', { name: 'Prova de Cálculo' });
  await expect(reopened.getByRole('heading', { name: /Conteúdos/ })).toContainText('2 de 3');
  await reopened.getByRole('button', { name: 'Mais opções' }).click();
  await expect(reopened.getByLabel('Matéria')).toHaveValue(/.+/);

  // 5. Excluir (menu “…”) e desfazer.
  await reopened.getByRole('button', { name: 'Ações de Prova de Cálculo' }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await expect(page.getByRole('button', { name: /^Prova: Prova de Cálculo/ })).toHaveCount(0);
  const toast = page.getByRole('status').filter({ hasText: 'excluído' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('button', { name: /^Prova: Prova de Cálculo/ })).toBeVisible();

  // O desfazer também persiste.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Prova: Prova de Cálculo/ })).toBeVisible();
});
