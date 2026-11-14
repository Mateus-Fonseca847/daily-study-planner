import { expect, test, type Page } from '@playwright/test';
import { seedSnapshot } from './helpers';

/** Terça, 10/11/2026, 10h30. */
const NOW = new Date('2026-11-10T10:30:00');
const SEEDED = { waterHabitCreated: true, achievementsSeededAt: '2026-01-01T00:00:00' };

const task = (
  id: string,
  day: string,
  status = 'pendente',
  extra: Record<string, unknown> = {},
) => ({
  id,
  type: 'tarefa',
  title: `Tarefa ${id}`,
  start: `${day}T09:00:00`,
  end: `${day}T10:00:00`,
  subjectId: null,
  status,
  notes: '',
  subtasks: [],
  createdAt: `${day}T08:00:00`,
  ...extra,
});
const medal = (id: string, levels: string[], featured = false) => ({
  id,
  level: levels.length,
  levels,
  featured,
});
const toasts = (page: Page) => page.getByRole('status');

test.describe('Medalhas e conquistas', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('concluir uma tarefa: um aviso só com as medalhas novas e “Ver” abre o Perfil', async ({
    page,
  }) => {
    // A tarefa de hoje às 23h: concluir fecha o dia (Dia limpo) e é a primeira (Primeiro passo).
    await seedSnapshot(page, {
      events: [task('a', '2026-11-10')],
      onboarding: SEEDED,
    });
    await page.goto('/tarefas');
    await page.getByRole('button', { name: 'Concluir “Tarefa a”' }).click();
    await expect(toasts(page)).toContainText(
      '2 novas medalhas: Primeiro passo, Dia limpo — bronze',
    );
    await expect(toasts(page).getByText(/novas medalhas/)).toHaveCount(1);

    await toasts(page).getByRole('button', { name: 'Ver' }).click();
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.locator('#conquistas-title')).toContainText('2 de 13');
  });

  test('com o Modo Foco rodando, o aviso espera a sessão acabar', async ({ page }) => {
    await seedSnapshot(page, { events: [task('a', '2026-11-10')], onboarding: SEEDED });
    await page.goto('/foco');
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await page.goto('/tarefas');
    await page.getByRole('button', { name: 'Concluir “Tarefa a”' }).click();
    await page.clock.runFor(2000);
    await expect(page.getByText(/nova medalha|novas medalhas|já conquistou/i)).toHaveCount(0);

    // A sessão termina (25 min): o aviso aparece, agrupado (com “Sessão completa”).
    await page.clock.fastForward(25 * 60_000 - 4000);
    await expect(page.getByText(/nova medalha|novas medalhas|já conquistou/i)).toHaveCount(0);
    await page.clock.runFor(4000);
    await expect(toasts(page)).toContainText(/novas medalhas: .*Primeiro passo/);
  });

  test('concessão retroativa: um único resumo; Perfil com contador, progresso e filtros', async ({
    page,
  }) => {
    const done = Array.from({ length: 12 }, (_, i) =>
      task(`d${i}`, `2026-10-${String(i + 1).padStart(2, '0')}`, 'concluido'),
    );
    await seedSnapshot(page, {
      events: [...done, task('p', '2026-11-20')],
      onboarding: { waterHabitCreated: true, achievementsSeededAt: null },
    });
    await page.goto('/perfil');
    await expect(toasts(page)).toContainText('Você já conquistou 3 medalhas');
    await expect(toasts(page).getByText(/medalha/)).toHaveCount(1);

    const section = page.locator('#conquistas');
    await expect(section.locator('#conquistas-title')).toContainText('3 de 13');
    // Bronze em “Mãos à obra” (10), a caminho da prata (50).
    const hands = section.getByRole('button', { name: /^Mãos à obra, bronze, 12 de 50 tarefas$/ });
    await expect(hands).toBeVisible();
    await expect(hands.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '24');
    await expect(section.getByRole('button', { name: /^Ritmo, bloqueada, 0 de 10/ })).toBeVisible();

    await section.getByRole('radio', { name: 'Conquistadas' }).click();
    await expect(section.locator('[data-achievement]')).toHaveCount(3);
    await section.getByRole('radio', { name: 'Em andamento' }).click();
    await expect(section.locator('[data-achievement="maos-a-obra"]')).toBeVisible();
    await expect(section.locator('[data-achievement="ritmo"]')).toHaveCount(0);

    // Persistência: recarregar não repete o resumo nem perde as medalhas.
    await page.reload();
    await expect(section.locator('#conquistas-title')).toContainText('3 de 13');
    await page.clock.runFor(2000);
    await expect(page.getByText(/nova medalha|novas medalhas|já conquistou/i)).toHaveCount(0);
  });

  test('destacar até 3 no perfil: o 4º pede troca; vitrine e persistência', async ({ page }) => {
    const at = '2026-11-01T12:00:00';
    await seedSnapshot(page, {
      events: [task('a', '2026-11-01', 'concluido')],
      achievements: [
        medal('primeiro-passo', [at], true),
        medal('maos-a-obra', [at], true),
        medal('dia-limpo', [at], true),
        medal('hidratado', [at]),
      ],
      onboarding: SEEDED,
    });
    await page.goto('/perfil');
    const showcase = page.getByRole('region', { name: 'Em destaque' });
    await expect(showcase.getByRole('button')).toHaveCount(3);

    await page.locator('[data-achievement="hidratado"]').click();
    const detail = page.getByRole('dialog', { name: 'Hidratado' });
    await detail.getByRole('button', { name: 'Destacar no perfil' }).click();
    await expect(detail).toContainText('Você já tem 3 medalhas em destaque');
    await detail.getByRole('button', { name: 'Trocar Mãos à obra' }).click();
    await expect(detail.getByRole('button', { name: 'Tirar do destaque' })).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(showcase.getByRole('button', { name: /^Hidratado/ })).toBeVisible();
    await expect(showcase.getByRole('button', { name: /^Mãos à obra/ })).toHaveCount(0);
    await page.reload();
    await expect(showcase.getByRole('button', { name: /^Hidratado/ })).toBeVisible();
    await expect(showcase.getByRole('button')).toHaveCount(3);
  });

  test('celular e tablet: grade de 2 e de 3 colunas; detalhe por teclado', async ({ page }) => {
    await seedSnapshot(page, { onboarding: SEEDED });
    const columns = () =>
      page
        .locator('#conquistas ul')
        .first()
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/perfil');
    await expect(page.locator('#conquistas')).toContainText(
      'Sua primeira medalha está a uma tarefa',
    );
    expect(await columns()).toBe(2);
    await page.setViewportSize({ width: 768, height: 1024 });
    expect(await columns()).toBe(3);

    await page.setViewportSize({ width: 1440, height: 900 });
    const card = page.locator('[data-achievement="primeiro-passo"]');
    await card.focus();
    await page.keyboard.press('Enter');
    const detail = page.getByRole('dialog', { name: 'Primeiro passo' });
    await expect(detail).toContainText('Conclua a sua primeira tarefa.');
    await expect(detail).toContainText('Ainda não');
    await page.keyboard.press('Escape');
    await expect(card).toBeFocused();
  });
});
