import { expect, test, type Page } from '@playwright/test';
import { seedSnapshot } from './helpers';

/** Terça, 10/11/2026, 10h30. */
const NOW = new Date('2026-11-10T10:30:00');

/** Treino toda segunda e quarta às 19h, desde quarta 11/11, com duas subtarefas-modelo. */
const TRAINING = {
  id: 'treino',
  type: 'tarefa',
  title: 'Treino',
  start: '2026-11-11T19:00:00',
  end: '2026-11-11T20:00:00',
  subjectId: null,
  status: 'pendente',
  notes: '',
  subtasks: [
    { id: 'aq', title: 'Aquecer', done: false, order: 0 },
    { id: 'co', title: 'Correr', done: false, order: 1 },
  ],
  createdAt: '2026-11-01T08:00:00',
  recurrence: { freq: 'semanal', interval: 1, weekdays: [1, 3], end: { kind: 'nunca' } },
};

const week = (page: Page, date: string) => page.goto(`/calendario?visao=semana&data=${date}`);
/** Chips/blocos de ocorrências na grade (o nome acessível termina com a regra). */
const blocks = (page: Page, title = 'Treino') =>
  page.getByRole('button', { name: new RegExp(`^Tarefa: ${title},.*repete: `) });
const openOn = async (page: Page, day: string, title = 'Treino') => {
  await page
    .getByRole('gridcell', { name: day })
    .getByRole('button', { name: new RegExp(`^Tarefa: ${title},`) })
    .click();
  return page.getByRole('dialog', { name: title });
};

test.describe('Tarefas recorrentes', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('criar “toda segunda e quarta” pelo personalizado: resumo, prévia e ocorrências no calendário', async ({
    page,
  }) => {
    await week(page, '2026-11-10');
    await page.getByRole('button', { name: 'Nova tarefa' }).click();
    const panel = page.getByRole('dialog', { name: 'Nova tarefa' });
    await panel.getByLabel('Título', { exact: true }).fill('Treino');
    await panel.getByLabel('Data do prazo').fill('2026-11-11');
    await panel.getByLabel('Hora do prazo').fill('19:00');
    const repeat = panel.getByRole('radiogroup', { name: 'Repetir' });
    await expect(repeat.getByRole('radio', { name: 'Não repete' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await repeat.getByRole('radio', { name: 'Personalizado…' }).click();
    const days = panel.getByRole('group', { name: 'Dias da semana' });
    await expect(days.getByRole('button', { name: 'quarta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await days.getByRole('button', { name: 'segunda' }).click();
    await expect(panel.getByText('Toda segunda e quarta', { exact: true })).toBeVisible();
    await expect(
      panel.getByText(/Próximas: qua, 11\/11 · seg, 16\/11 · qua, 18\/11/),
    ).toBeVisible();
    await panel.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(panel).toBeHidden();

    await week(page, '2026-11-16');
    await expect(blocks(page)).toHaveCount(2);
    await expect(blocks(page).first()).toHaveAccessibleName(/repete: Toda segunda e quarta/);
    // Persistência.
    await page.reload();
    await expect(blocks(page)).toHaveCount(2);
  });

  test('concluir só a de segunda; subtarefas reiniciam em cada ocorrência', async ({ page }) => {
    await seedSnapshot(page, { events: [TRAINING] });
    await week(page, '2026-11-16');
    const monday = await openOn(page, '2026-11-16');
    await monday.getByRole('checkbox', { name: 'Marcar “Aquecer”' }).click();
    await monday.getByRole('button', { name: 'Concluir “Treino”' }).click();
    await page.keyboard.press('Escape');

    const mondayBlock = page
      .getByRole('gridcell', { name: '2026-11-16' })
      .getByRole('button', { name: /^Tarefa: Treino/ });
    const wednesdayBlock = page
      .getByRole('gridcell', { name: '2026-11-18' })
      .getByRole('button', { name: /^Tarefa: Treino/ });
    await expect(mondayBlock.locator('..')).toHaveClass(/bg-concluido-soft/);
    await expect(wednesdayBlock.locator('..')).toHaveClass(/bg-pendente-soft/);

    const wednesday = await openOn(page, '2026-11-18');
    await expect(wednesday.getByRole('checkbox', { name: 'Marcar “Aquecer”' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(mondayBlock.locator('..')).toHaveClass(/bg-concluido-soft/);
  });

  test('editar “somente esta”, “esta e as próximas” e “todas”', async ({ page }) => {
    await seedSnapshot(page, { events: [TRAINING] });
    await week(page, '2026-11-16');

    // Somente esta (quarta 18): só ela muda de título.
    let panel = await openOn(page, '2026-11-18');
    await panel.getByLabel('Título', { exact: true }).fill('Treino leve');
    await panel.getByRole('button', { name: 'Salvar…' }).click();
    let scope = page.getByRole('dialog', { name: 'Salvar alteração em…' });
    await scope.getByRole('radio', { name: /Somente esta/ }).check();
    await scope.getByRole('button', { name: 'Salvar' }).click();
    await expect(blocks(page, 'Treino leve')).toHaveCount(1);
    await expect(blocks(page, 'Treino')).toHaveCount(1);

    // Esta e as próximas (segunda 23): horário muda dali em diante.
    await week(page, '2026-11-23');
    panel = await openOn(page, '2026-11-23');
    await panel.getByLabel('Hora do prazo').fill('07:00');
    await panel.getByRole('button', { name: 'Salvar…' }).click();
    scope = page.getByRole('dialog', { name: 'Salvar alteração em…' });
    await scope.getByRole('radio', { name: /Esta e as próximas/ }).check();
    await scope.getByRole('button', { name: 'Salvar' }).click();
    await expect(blocks(page).first()).toHaveAccessibleName(/07:00/);
    await week(page, '2026-11-16');
    await expect(
      page
        .getByRole('gridcell', { name: '2026-11-16' })
        .getByRole('button', { name: /^Tarefa: Treino/ }),
    ).toHaveAccessibleName(/19:00/);

    // Todas (a partir da segunda 16): título novo; a quarta 18 mantém o seu.
    panel = await openOn(page, '2026-11-16');
    await panel.getByLabel('Título', { exact: true }).fill('Musculação');
    await panel.getByRole('button', { name: 'Salvar…' }).click();
    scope = page.getByRole('dialog', { name: 'Salvar alteração em…' });
    await scope.getByRole('radio', { name: /^Todas/ }).check();
    await scope.getByRole('button', { name: 'Salvar' }).click();
    await expect(blocks(page, 'Musculação')).toHaveCount(1);
    await expect(blocks(page, 'Treino leve')).toHaveCount(1);
  });

  test('excluir com escopo e desfazer', async ({ page }) => {
    await seedSnapshot(page, { events: [TRAINING] });
    await week(page, '2026-11-16');
    const panel = await openOn(page, '2026-11-16');
    await panel.getByRole('button', { name: 'Ações de Treino' }).click();
    await page.getByRole('menuitem', { name: 'Excluir' }).click();
    const scope = page.getByRole('dialog', { name: 'Excluir…' });
    await scope.getByRole('radio', { name: /Somente esta/ }).check();
    await scope.getByRole('button', { name: 'Excluir' }).click();
    await expect(blocks(page)).toHaveCount(1);

    await page.getByRole('status').getByRole('button', { name: 'Desfazer' }).click();
    await expect(blocks(page)).toHaveCount(2);
  });

  test('entrada rápida: “Treinar toda segunda 19h” e a página Tarefas mostra uma ocorrência por série', async ({
    page,
  }) => {
    await seedSnapshot(page, { events: [TRAINING] });
    await page.goto('/tarefas');
    const input = page.getByLabel('Nova tarefa');
    await input.fill('Treinar toda segunda 19h');
    await expect(page.getByText(/Entendi: Treinar · 16\/11 · 19:00 · Toda segunda/)).toBeVisible();
    await input.press('Enter');

    const next = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /^Próximas/ }) });
    // Uma linha por série (a próxima ocorrência), com a regra e “+N nesta semana”.
    await expect(next.getByRole('button', { name: /^Treinar / })).toHaveCount(1);
    await expect(next.getByRole('button', { name: /^Treino / })).toHaveCount(1);
    await expect(next).toContainText('Toda segunda e quarta');
    await expect(next).toContainText('Toda segunda');

    await page.reload();
    await expect(next.getByRole('button', { name: /^Treinar / })).toHaveCount(1);
    await page.goto('/calendario?visao=semana&data=2026-11-16');
    await expect(blocks(page, 'Treinar')).toHaveCount(1);
  });
});
