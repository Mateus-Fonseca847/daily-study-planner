import { expect, test, type Page } from '@playwright/test';

const NOW = new Date('2026-11-10T10:30:00');

const addCup = (page: Page) => page.getByRole('button', { name: /^Adicionar um copo/ });
const waterBar = (page: Page) => page.getByRole('progressbar', { name: 'Meta de água do dia' });
const goalsBar = (page: Page) => page.getByRole('progressbar', { name: 'Metas concluídas hoje' });

test.describe('Estatísticas', () => {
  test('fixture: os cartões de “Hoje” e as seis análises aparecem', async ({ page }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/estatisticas?fixture=stats');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Olá, Ana');
    for (const title of [
      'Horas de estudo',
      'Preparação',
      'Metas do dia',
      'Agenda de hoje',
      'Horas estudadas',
      'Tempo focado',
      'Preparação das próximas provas',
      'Horas por matéria',
      'Metas',
      'Água', // só na seção Hoje
    ]) {
      await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    }
    // A seção Análises tem 5 cartões (a água fica só em “Hoje”).
    await expect(page.getByRole('heading', { name: 'Água', exact: true })).toHaveCount(1);
    await expect(page.getByText('8 dias').first()).toBeVisible();
    await expect(page.getByText('3/5 conteúdos').first()).toBeVisible();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,7 L de 2 L/);

    // O seletor de período troca os dados sem erro e mantém os cartões.
    const period = page.getByRole('radiogroup', { name: 'Período das análises' });
    await period.getByText('90 dias').click();
    await expect(page.getByRole('heading', { name: 'Tempo focado' })).toBeVisible();
    await expect(page.getByText('Ainda não há dados neste período')).toHaveCount(0);
  });

  test('água: dois copos, persistem ao recarregar e sincronizam entre abas', async ({
    page,
    context,
  }) => {
    await page.goto('/estatisticas');
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0 L de 2 L/);

    await addCup(page).click();
    await addCup(page).click();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,5 L de 2 L/);

    await page.reload();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,5 L de 2 L/);

    const other = await context.newPage();
    await other.goto('/estatisticas');
    await expect(waterBar(other)).toHaveAttribute('aria-valuetext', /^0,5 L de 2 L/);
    await addCup(other).click();
    await expect(waterBar(page)).toHaveAttribute('aria-valuetext', /^0,75 L de 2 L/);
  });

  test('metas: marcar uma meta manual muda a porcentagem', async ({ page }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/estatisticas?fixture=stats');

    const before = Number(await goalsBar(page).getAttribute('aria-valuenow'));
    const goal = page.getByRole('checkbox').first();
    const percent = async () => Number(await goalsBar(page).getAttribute('aria-valuenow'));

    // Na fixture as metas manuais já estão cumpridas: desmarcar derruba a %, marcar de novo restaura.
    await expect(goal).toHaveAttribute('aria-checked', 'true');
    await goal.click();
    await expect(goal).toHaveAttribute('aria-checked', 'false');
    await expect.poll(percent).toBeLessThan(before);

    await goal.click();
    await expect.poll(percent).toBe(before);
  });
});
