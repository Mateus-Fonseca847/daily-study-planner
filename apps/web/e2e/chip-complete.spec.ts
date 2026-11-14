import { expect, test, type Page } from '@playwright/test';
import { seedSnapshot } from './helpers';

/** Terça, 10/11/2026, 10h30. */
const NOW = new Date('2026-11-10T10:30:00');

const event = (
  id: string,
  type: 'tarefa' | 'prova',
  title: string,
  start: string,
  end: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  type,
  title,
  start,
  end,
  subjectId: null,
  status: 'pendente',
  notes: '',
  subtasks: [],
  createdAt: '2026-11-01T08:00:00',
  ...extra,
});

const READ = event('ler', 'tarefa', 'Ler capítulo 3', '2026-11-10T14:00:00', '2026-11-10T15:30:00');
const EXAM = event(
  'prova',
  'prova',
  'Prova de Cálculo',
  '2026-11-10T16:00:00',
  '2026-11-10T18:00:00',
);
/** Treino toda segunda e quarta às 19h, desde quarta 11/11. */
const TRAINING = event('treino', 'tarefa', 'Treino', '2026-11-11T19:00:00', '2026-11-11T20:00:00', {
  recurrence: { freq: 'semanal', interval: 1, weekdays: [1, 3], end: { kind: 'nunca' } },
});

/** Botão principal do chip (abre o painel); o contêiner é o pai dele. */
const chip = (page: Page, title: string) =>
  page.getByRole('button', { name: new RegExp(`^(Tarefa|Prova): ${title},`) });
const container = (page: Page, title: string) => chip(page, title).locator('..');
const toasts = (page: Page) => page.getByRole('status');

test.describe('Concluir com um clique nos chips do calendário', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
    await seedSnapshot(page, {
      events: [READ, EXAM, TRAINING],
      onboarding: { waterHabitCreated: true, achievementsSeededAt: '2026-01-01T00:00:00' },
    });
  });

  test('Dia: conclui pelo bloco sem abrir o painel, avalia medalhas e o Desfazer reabre', async ({
    page,
  }) => {
    await page.goto('/calendario?visao=dia&data=2026-11-10');
    await expect(container(page, 'Ler capítulo 3')).toHaveClass(/bg-pendente-soft/);
    await page.getByRole('button', { name: 'Concluir “Ler capítulo 3”' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(container(page, 'Ler capítulo 3')).toHaveClass(/bg-concluido-soft/);
    await expect(chip(page, 'Ler capítulo 3')).toHaveAccessibleName(/, concluída$/);
    const reopen = page.getByRole('button', { name: 'Reabrir “Ler capítulo 3”' });
    await expect(reopen).toHaveAttribute('aria-pressed', 'true');
    // A primeira tarefa concluída rende a medalha, como em qualquer outro lugar.
    await expect(toasts(page).filter({ hasText: 'Primeiro passo' })).toBeVisible();

    await toasts(page)
      .filter({ hasText: '“Ler capítulo 3” concluída' })
      .getByRole('button', { name: 'Desfazer' })
      .click();
    await expect(container(page, 'Ler capítulo 3')).toHaveClass(/bg-pendente-soft/);
    await expect(page.getByRole('button', { name: 'Concluir “Ler capítulo 3”' })).toBeVisible();
  });

  test('Prova não ganha o botão de concluir', async ({ page }) => {
    await page.goto('/calendario?visao=dia&data=2026-11-10');
    await expect(chip(page, 'Prova de Cálculo')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^(Concluir|Reabrir) “Prova de Cálculo”/ }),
    ).toHaveCount(0);
  });

  test('Semana: concluir uma ocorrência da série não mexe nas outras', async ({ page }) => {
    await page.goto('/calendario?visao=semana&data=2026-11-16');
    const monday = page.getByRole('gridcell', { name: '2026-11-16' });
    const wednesday = page.getByRole('gridcell', { name: '2026-11-18' });
    await monday.getByRole('button', { name: 'Concluir “Treino”' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(monday.getByRole('button', { name: /^Tarefa: Treino/ }).locator('..')).toHaveClass(
      /bg-concluido-soft/,
    );
    await expect(
      wednesday.getByRole('button', { name: /^Tarefa: Treino/ }).locator('..'),
    ).toHaveClass(/bg-pendente-soft/);
    await page.reload();
    await expect(monday.getByRole('button', { name: 'Reabrir “Treino”' })).toBeVisible();
    await expect(wednesday.getByRole('button', { name: 'Concluir “Treino”' })).toBeVisible();
  });

  test('Mês: Tab vai do chip ao concluir (que aparece no foco) e Espaço conclui', async ({
    page,
  }) => {
    await page.goto('/calendario?visao=mes&data=2026-11-10');
    const main = chip(page, 'Ler capítulo 3');
    const control = page.getByRole('button', { name: 'Concluir “Ler capítulo 3”' });
    // Escondido até passar o mouse ou focar (chip pequeno da grade).
    await expect(control).toHaveCSS('opacity', '0');
    await main.focus();
    await page.keyboard.press('Tab');
    await expect(control).toBeFocused();
    await expect(control).toHaveCSS('opacity', '1');
    await page.keyboard.press('Space');
    await expect(container(page, 'Ler capítulo 3')).toHaveClass(/bg-concluido-soft/);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Enter no botão principal continua abrindo o painel.
    await main.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Ler capítulo 3' })).toBeVisible();
  });

  test('Mês: passar o mouse mostra o controle; a Prova continua sem ele', async ({ page }) => {
    await page.goto('/calendario?visao=mes&data=2026-11-10');
    await chip(page, 'Ler capítulo 3').hover();
    await expect(page.getByRole('button', { name: 'Concluir “Ler capítulo 3”' })).toHaveCSS(
      'opacity',
      '1',
    );
    await chip(page, 'Prova de Cálculo').hover();
    await expect(page.getByRole('button', { name: /“Prova de Cálculo”/ })).toHaveCount(0);
  });

  test('agenda de hoje (Perfil): conclui pelo cartão e o Desfazer reabre', async ({ page }) => {
    await page.goto('/perfil');
    const agenda = page.getByRole('region', { name: 'Agenda de hoje' });
    await agenda.getByRole('button', { name: 'Concluir “Ler capítulo 3”' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(agenda.getByRole('button', { name: 'Reabrir “Ler capítulo 3”' })).toBeVisible();
    await expect(agenda.getByRole('button', { name: /“Prova de Cálculo”/ })).toHaveCount(0);
    await toasts(page)
      .filter({ hasText: '“Ler capítulo 3” concluída' })
      .getByRole('button', { name: 'Desfazer' })
      .click();
    await expect(agenda.getByRole('button', { name: 'Concluir “Ler capítulo 3”' })).toBeVisible();
  });
});
