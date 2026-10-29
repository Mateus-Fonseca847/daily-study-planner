import { expect, test, type Page } from '@playwright/test';

/** Quarta-feira: dia agendado da “Musculação” (seg, qua e sex). */
const NOW = new Date('2026-11-11T10:30:00');

const habitCard = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const cell = (page: Page, name: string, date: string) =>
  habitCard(page, name).locator(`[data-date="${date}"]`);

/** Cria a “Musculação” (seg, qua e sex) com início em 01/11/2026, pelo formulário. */
async function createGym(page: Page) {
  await page.getByRole('button', { name: 'Novo hábito' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Novo hábito' });
  await dialog.getByLabel('Nome').fill('Musculação');
  await dialog.getByLabel('Repetição').selectOption('dias');
  for (const day of ['dom', 'ter', 'qui', 'sáb']) {
    await dialog.getByRole('button', { name: day, exact: true }).click();
  }
  await dialog.getByLabel('Início', { exact: true }).fill('2026-11-01');
  await dialog.getByRole('button', { name: 'Criar hábito' }).click();
  await expect(dialog).toHaveCount(0);
}

const stat = (page: Page, name: string, label: string) =>
  habitCard(page, name)
    .locator('div', { has: page.getByText(label, { exact: true }) })
    .locator('dd')
    .first();

test.describe('Hábitos', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('criar “Musculação” (seg, qua e sex): cartão, resumo e heatmap', async ({ page }) => {
    await page.goto('/habitos');
    await expect(page.getByText('Nenhum hábito ainda')).toBeVisible();
    await createGym(page);

    const card = habitCard(page, 'Musculação');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Seg, qua e sex');
    const grid = card.getByRole('grid', { name: 'Calendário de Musculação' });
    await expect(grid).toBeVisible();
    // Segunda 09/11 estava agendada e não foi feita; terça 10/11 não era agendada.
    await expect(cell(page, 'Musculação', '2026-11-09')).toHaveAttribute('aria-label', /não feito/);
    await expect(cell(page, 'Musculação', '2026-11-10')).toHaveAttribute(
      'aria-label',
      /não agendado/,
    );
    await expect(cell(page, 'Musculação', '2026-11-11')).toHaveAttribute('aria-label', /pendente/);
    await expect(page.getByRole('link', { name: /Hábitos/ })).toContainText('1'); // pendente hoje
  });

  test('marcar hoje, corrigir um dia passado e recarregar: sequência e taxa mudam e persistem', async ({
    page,
  }) => {
    await page.goto('/habitos');
    await createGym(page);
    await expect(stat(page, 'Musculação', 'Sequência')).toHaveText('0 dias');

    // Hoje (quarta): feito → 1 dia; taxa = 1 de 5 dias agendados (2, 4, 6, 9 e hoje).
    await page.getByRole('checkbox', { name: 'Musculação: feito hoje' }).click();
    await expect(stat(page, 'Musculação', 'Sequência')).toHaveText('1 dia');
    await expect(stat(page, 'Musculação', 'Taxa (90 dias)')).toHaveText('20%');

    // Corrige a segunda 09/11 pelo heatmap: a terça não agendada não quebra → sequência de 2.
    await cell(page, 'Musculação', '2026-11-09').click();
    await page.getByRole('button', { name: 'Marcar como feito' }).click();
    await expect(cell(page, 'Musculação', '2026-11-09')).toHaveAttribute('aria-label', /: feito/);
    await expect(stat(page, 'Musculação', 'Sequência')).toHaveText('2 dias');
    await expect(stat(page, 'Musculação', 'Taxa (90 dias)')).toHaveText('40%');

    await page.reload();
    await expect(stat(page, 'Musculação', 'Sequência')).toHaveText('2 dias');
    await expect(stat(page, 'Musculação', 'Melhor')).toHaveText('2 dias');
    await expect(page.getByRole('checkbox', { name: 'Musculação: feito hoje' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('o heatmap dos últimos 12 meses não mostra dias futuros', async ({ page }) => {
    await page.goto('/habitos');
    await createGym(page);
    await expect(cell(page, 'Musculação', '2026-11-13')).toHaveCount(0);
  });

  test('Hidratação reflete o copo de água adicionado em Estatísticas', async ({ page }) => {
    await page.goto('/habitos');
    await page.getByRole('button', { name: 'Hidratação' }).click();
    const card = habitCard(page, 'Hidratação');
    await expect(card).toContainText('Automático: água do dia');
    await expect(cell(page, 'Hidratação', '2026-11-11')).toHaveAttribute('aria-label', /pendente/);

    await page.goto('/estatisticas');
    await page.getByRole('button', { name: /^Adicionar um copo/ }).click();

    await page.goto('/habitos');
    await expect(cell(page, 'Hidratação', '2026-11-11')).toHaveAttribute(
      'aria-label',
      /250 ml de 2000 ml/,
    );
    // Em Estatísticas o hábito aparece em “Hábitos de hoje”.
    await page.goto('/estatisticas');
    await expect(page.getByRole('heading', { name: 'Hábitos de hoje' })).toBeVisible();
    await expect(page.getByText('Hidratação').first()).toBeVisible();
  });

  test('metas salvas no formato v2 viram hábitos, sem perder registros', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('daily:v3')) return;
      const goal = (id: string, title: string, kind: string, order: number) => ({
        id,
        title,
        icon: 'moon',
        kind,
        order,
        createdAt: '2026-10-01T08:00:00',
        archivedAt: null,
      });
      localStorage.setItem(
        'daily:v2',
        JSON.stringify({
          app: 'daily',
          version: 2,
          savedAt: '2026-11-10T00:00:00.000Z',
          data: {
            subjects: [],
            events: [],
            preferences: {
              name: '',
              waterGoalMl: 2000,
              cupMl: 250,
              focusDurationSec: 1500,
              lockByDefault: false,
            },
            goals: [goal('g1', 'Dormir 7h', 'manual', 0), goal('g2', 'Beber água', 'auto-agua', 1)],
            goalLogs: [{ id: 'g1:2026-11-09', goalId: 'g1', date: '2026-11-09', done: true }],
            waterLogs: [],
            focusSessions: [],
          },
        }),
      );
    });
    await page.goto('/habitos');
    await expect(habitCard(page, 'Dormir 7h')).toBeVisible();
    await expect(habitCard(page, 'Beber água')).toContainText('Automático: água do dia');
    await expect(cell(page, 'Dormir 7h', '2026-11-09')).toHaveAttribute('aria-label', /: feito/);

    const keys = await page.evaluate(() => ({
      v3: localStorage.getItem('daily:v3') !== null,
      backup: localStorage.getItem('daily:v2:pre-v3') !== null,
    }));
    expect(keys).toEqual({ v3: true, backup: true });
  });

  test('o heatmap se navega pelo teclado: setas movem entre dias e Enter abre o dia', async ({
    page,
  }) => {
    await page.goto('/habitos');
    await createGym(page);
    const today = cell(page, 'Musculação', '2026-11-11');
    await today.focus();
    await page.keyboard.press('ArrowUp'); // dia anterior (terça)
    await expect(cell(page, 'Musculação', '2026-11-10')).toBeFocused();
    await page.keyboard.press('ArrowLeft'); // uma semana antes (03/11)
    await expect(cell(page, 'Musculação', '2026-11-03')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: /Musculação, / })).toBeVisible();
  });
});
