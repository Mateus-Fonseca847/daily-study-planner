import { expect, test, type Page } from '@playwright/test';
import { seedSnapshot } from './helpers';

/** Terça, 10/11/2026, 10h30. */
const NOW = new Date('2026-11-10T10:30:00');

const event = (id: string, type: string, day: string, time: string, extra = {}) => ({
  id,
  type,
  title: id,
  start: `${day}T${time}:00`,
  end: `${day}T${time}:00`,
  subjectId: null,
  status: 'pendente',
  notes: '',
  subtasks: [],
  createdAt: '2026-11-01T08:00:00',
  ...extra,
});

const EVENTS = [
  event('Ler capítulo 3', 'tarefa', '2026-11-10', '18:00', {
    subtasks: [
      { id: 's1', title: 'Seção 3.1', done: true, order: 0 },
      { id: 's2', title: 'Seção 3.2', done: false, order: 1 },
    ],
  }),
  event('Entregar relatório', 'tarefa', '2026-11-09', '18:00'),
  event('Prova de Física', 'prova', '2026-11-25', '08:00'),
  event('Viagem de campo', 'especial', '2026-11-12', '07:00'),
];

const row = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('button', { name: new RegExp(title) }) });

test.describe('Tarefas', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
    await seedSnapshot(page, { events: EVENTS });
  });

  test('seções e resumo: atrasadas, hoje e próximas sem limite de 7 dias (prova a 15 dias)', async ({
    page,
  }) => {
    await page.goto('/tarefas');
    const section = (name: string) =>
      page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}`) }) });
    await expect(section('Atrasadas')).toContainText('Entregar relatório');
    await expect(section('Hoje')).toContainText('Ler capítulo 3');
    await expect(section('Hoje')).toContainText('1 de 2 subtarefas');
    await expect(section('Próximas')).toContainText('Viagem de campo');
    await expect(section('Próximas')).toContainText('Prova de Física'); // 15 dias à frente
    await expect(section('Próximas')).toContainText('Mais tarde');
    // Contador da sidebar: tarefas pendentes, com as atrasadas.
    await expect(page.getByRole('link', { name: /Tarefas/ })).toContainText('2');

    // “Ver no calendário” abre a visão Dia daquela data.
    await row(page, 'Prova de Física')
      .getByRole('link', { name: /no calendário/ })
      .click();
    await expect(page).toHaveURL(/visao=dia&data=2026-11-25/);
  });

  test('concluir com um clique deixa verde e riscada; Desfazer volta', async ({ page }) => {
    await page.goto('/tarefas');
    await page.getByRole('button', { name: 'Concluir “Ler capítulo 3”' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'concluída' })).toBeVisible();
    await page.getByRole('button', { name: /Concluídas/ }).click();
    const done = page.getByRole('button', { name: 'Reabrir “Ler capítulo 3”' });
    await expect(done).toHaveAttribute('aria-pressed', 'true');
    await expect(done.locator('span').first()).toHaveClass(/bg-concluido/);

    await page.getByRole('status').getByRole('button', { name: 'Desfazer' }).click();
    await expect(page.getByRole('button', { name: 'Concluir “Ler capítulo 3”' })).toBeVisible();
  });

  test('no calendário: concluir fica verde; cancelar pelo menu fica vermelho e riscado', async ({
    page,
  }) => {
    await page.goto('/calendario?visao=dia&data=2026-11-10');
    const chip = page.getByRole('button', { name: /^Tarefa: Ler capítulo 3/ });
    await expect(chip.locator('..')).toHaveClass(/bg-pendente-soft/);

    await chip.click();
    const panel = page.getByRole('dialog', { name: 'Ler capítulo 3' });
    await panel.getByRole('button', { name: 'Concluir “Ler capítulo 3”' }).click();
    await expect(panel.getByRole('radio', { name: 'Concluído' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(chip.locator('..')).toHaveClass(/bg-concluido-soft/);

    await chip.click();
    await panel.getByRole('button', { name: 'Ações de Ler capítulo 3' }).click();
    await page.getByRole('menuitem', { name: 'Cancelar' }).click();
    await page.keyboard.press('Escape');
    await expect(chip.locator('..')).toHaveClass(/bg-cancelado-soft/);
    await expect(chip.getByText('Ler capítulo 3')).toHaveClass(/line-through/);
  });

  test('subtarefas numa tarefa comum: adicionar, marcar, reordenar e o progresso muda', async ({
    page,
  }) => {
    await page.goto('/tarefas');
    await page.getByRole('button', { name: /^Entregar relatório/ }).click();
    const panel = page.getByRole('dialog', { name: 'Entregar relatório' });
    await expect(panel.getByRole('heading', { name: /^Subtarefas/ })).toBeVisible();
    for (const title of ['Introdução', 'Conclusão']) {
      await panel.getByLabel('Nova subtarefa').fill(title);
      await panel.getByLabel('Nova subtarefa').press('Enter');
    }
    await panel.getByRole('button', { name: 'Subir “Conclusão”' }).click();
    await expect(panel.getByRole('checkbox')).toHaveText(['', '']);
    await expect(panel.getByRole('textbox', { name: /^Título de/ }).first()).toHaveValue(
      'Conclusão',
    );
    await panel.getByRole('checkbox', { name: 'Marcar “Introdução”' }).click();
    await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    await page.keyboard.press('Escape');
    await expect(row(page, 'Entregar relatório')).toContainText('1 de 2 subtarefas');
  });

  test('filtro por tipo (multisseleção) vale para Tarefas e calendário e persiste', async ({
    page,
  }) => {
    await page.goto('/tarefas');
    await page.getByRole('button', { name: 'Filtrar por tipo: Todos os tipos' }).click();
    const filter = page.getByRole('dialog', { name: 'Filtrar por tipo' });
    await filter.getByRole('checkbox', { name: 'Provas' }).check();
    await filter.getByRole('checkbox', { name: 'Especiais' }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Filtrar por tipo: 2 tipos' })).toBeVisible();
    await expect(page.getByText('Ler capítulo 3')).toHaveCount(0);
    await expect(page.getByText('Prova de Física')).toBeVisible();
    await expect(page.getByText('Viagem de campo')).toBeVisible();

    await page.goto('/calendario?visao=semana&data=2026-11-10');
    await expect(page.getByRole('button', { name: /^Especial: Viagem de campo/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Tarefa: Ler capítulo 3/ })).toHaveCount(0);

    await page.reload();
    await page.getByRole('button', { name: 'Filtrar por tipo: 2 tipos' }).click();
    await page
      .getByRole('dialog', { name: 'Filtrar por tipo' })
      .getByRole('button', { name: 'Limpar' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Filtrar por tipo: Todos os tipos' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Tarefa: Ler capítulo 3/ })).toBeVisible();
  });

  test('rotas antigas: /blocos vai ao calendário e /estatisticas ao Perfil', async ({ page }) => {
    await page.goto('/blocos');
    await expect(page).toHaveURL(/\/calendario/);
    await expect(page.getByRole('link', { name: 'Blocos de estudo' })).toHaveCount(0);
    await page.goto('/estatisticas');
    await expect(page).toHaveURL(/\/perfil/);
  });
});
