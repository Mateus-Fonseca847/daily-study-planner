import { expect, test, type Page } from '@playwright/test';

const NOW = new Date('2026-11-10T10:30:00');

const addCup = (page: Page) => page.getByRole('button', { name: /^Adicionar um copo/ });
const waterBar = (page: Page) => page.getByRole('progressbar', { name: 'Meta de água do dia' });
const habitsBar = (page: Page) =>
  page.getByRole('progressbar', { name: 'Hábitos concluídos hoje' });

test.describe('Perfil', () => {
  test('/estatisticas leva ao Perfil: cabeçalho, “Hoje” e estatísticas pessoais, sem Análises', async ({
    page,
  }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/estatisticas?fixture=stats');
    await expect(page).toHaveURL(/\/perfil/);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana');
    for (const title of [
      'Tempo de foco',
      'Preparação',
      'Água',
      'Hábitos de hoje',
      'Agenda de hoje',
      'Estatísticas pessoais',
      'Consistência',
    ]) {
      await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    }
    for (const gone of ['Horas de estudo', 'Horas estudadas', 'Tempo focado', 'Horas por matéria']) {
      await expect(page.getByRole('heading', { name: gone, exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole('radiogroup', { name: 'Período das análises' })).toHaveCount(0);
    // O cartão “Sequência” (pílula amarela) saiu: cada hábito mostra a própria chama.
    await expect(page.getByText('Sequência', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('img', { name: /^Sequência: \d+ dias?$/ }).first()).toBeVisible();
    await expect(page.getByText('3/5 conteúdos').first()).toBeVisible();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,7 L de 2 L/);
    for (const label of ['Tarefas concluídas', 'Foco na semana', 'Melhor sequência', 'Dias ativos']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('registrar tempo manual soma no cartão “Tempo de foco”', async ({ page }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/perfil');
    const card = page.getByRole('region', { name: 'Tempo de foco' });
    await expect(card).toContainText('0h');

    await card.getByRole('button', { name: 'Registrar tempo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Registrar tempo' });
    await expect(dialog.getByLabel('Data')).toHaveValue('2026-11-10');
    await dialog.getByLabel('Duração').fill('abc');
    await dialog.getByRole('button', { name: 'Registrar' }).click();
    await expect(dialog).toContainText('Informe a duração');
    await dialog.getByLabel('Duração').fill('1h30');
    await dialog.getByLabel('Nota (opcional)').fill('Leitura');
    await dialog.getByRole('button', { name: 'Registrar' }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toContainText('1h30');

    await page.reload();
    await expect(page.getByRole('region', { name: 'Tempo de foco' })).toContainText('1h30');
  });

  test('água: dois copos, persistem ao recarregar e sincronizam entre abas', async ({
    page,
    context,
  }) => {
    await page.goto('/perfil');
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0 L de 2 L/);

    await addCup(page).click();
    await addCup(page).click();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,5 L de 2 L/);

    await page.reload();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,5 L de 2 L/);

    const other = await context.newPage();
    await other.goto('/perfil');
    await expect(waterBar(other)).toHaveAttribute('aria-valuetext', /^0,5 L de 2 L/);
    await addCup(other).click();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,75 L de 2 L/);
  });

  test('hábitos de hoje: marcar um hábito manual muda a porcentagem', async ({ page }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/perfil?fixture=stats');

    const percent = async () => Number(await habitsBar(page).getAttribute('aria-valuenow'));
    const before = await percent();

    // Na fixture a “Luta” de hoje já está feita: desmarcar derruba a %, marcar de novo restaura.
    const fight = page.getByRole('checkbox', { name: 'Luta: feito hoje' });
    await expect(fight).toHaveAttribute('aria-checked', 'true');
    await fight.click();
    await expect(fight).toHaveAttribute('aria-checked', 'false');
    await expect.poll(percent).toBeLessThan(before);

    await fight.click();
    await expect.poll(percent).toBe(before);
  });
});
