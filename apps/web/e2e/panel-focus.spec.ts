import { expect, test } from '@playwright/test';
import {
  expectRingsInsideDialog,
  expectRingsInsidePanel,
  manualHabit,
  seedSnapshot,
} from './helpers';

const NOW = new Date('2026-11-10T10:30:00');

test.describe('Anel de foco dentro de painéis, modais e popovers', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('painel “Nova tarefa”: anel dentro da área visível e margens iguais (desktop)', async ({
    page,
  }) => {
    await page.goto('/calendario');
    await page.getByRole('button', { name: 'Nova tarefa' }).click();
    await expectRingsInsidePanel(page);
  });

  test('tarefa em edição/detalhe (prova), hábito, matéria, registrar tempo e dia do heatmap', async ({
    page,
  }) => {
    await seedSnapshot(page, {
      subjects: [{ id: 'mat', name: 'Matemática', color: 'ciano' }],
      habits: [manualHabit('leitura', 'Leitura', 0)],
      events: [
        {
          id: 'p',
          type: 'prova',
          title: 'Prova de Cálculo',
          start: '2026-11-10T14:00:00',
          end: '2026-11-10T16:00:00',
          subjectId: 'mat',
          status: 'pendente',
          notes: '',
          subtasks: [{ id: 's', title: 'Limites', done: false, order: 0 }],
          createdAt: '2026-11-01T08:00:00',
        },
      ],
    });

    // Detalhe/edição: começa pelo cabeçalho (check, “…”, fechar) e desce pelos campos.
    await page.goto('/calendario?visao=dia&data=2026-11-10');
    await page.getByRole('button', { name: /^Prova: Prova de Cálculo/ }).click();
    const panel = page.getByRole('dialog', { name: 'Prova de Cálculo' });
    await panel.getByLabel('Título', { exact: true }).focus();
    await page.keyboard.press('Shift+Tab'); // volta e entra de novo pelo teclado
    await page.keyboard.press('Tab');
    expect((await expectRingsInsideDialog(page, panel, 14)).length).toBeGreaterThanOrEqual(8);
    await page.keyboard.press('Escape');

    await page.goto('/habitos');
    await page.getByRole('button', { name: 'Novo hábito' }).first().click();
    const habit = page.getByRole('dialog', { name: 'Novo hábito' });
    expect((await expectRingsInsideDialog(page, habit, 10)).length).toBeGreaterThanOrEqual(6);
    await page.keyboard.press('Escape');

    await page.goto('/materias');
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Matéria' }).click();
    const subject = page.getByRole('dialog', { name: 'Nova matéria' });
    expect((await expectRingsInsideDialog(page, subject, 6)).length).toBeGreaterThanOrEqual(3);
    await page.keyboard.press('Escape');

    await page.goto('/perfil');
    await page.getByRole('button', { name: 'Registrar tempo' }).click();
    const log = page.getByRole('dialog', { name: 'Registrar tempo' });
    expect((await expectRingsInsideDialog(page, log, 5)).length).toBeGreaterThanOrEqual(3);
    await page.keyboard.press('Escape');

    // Popover do dia no heatmap (descanso): Enter abre pelo teclado.
    await page.goto('/habitos');
    const cell = page
      .getByRole('region', { name: 'Leitura', exact: true })
      .locator('[data-date="2026-11-09"]');
    await cell.focus();
    await page.keyboard.press('Enter');
    const day = page.getByRole('dialog', { name: /^Leitura, / });
    expect((await expectRingsInsideDialog(page, day, 6)).length).toBeGreaterThanOrEqual(3);
  });
});
