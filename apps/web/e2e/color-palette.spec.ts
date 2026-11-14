import { expect, test, type Page } from '@playwright/test';
import { manualHabit, seedSnapshot } from './helpers';

const NOW = new Date('2026-11-11T10:30:00');
const habitCard = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('daily:v6') ?? '{}').data);

/** Uma cor de cada grupo do seletor. */
const ONE_PER_GROUP = [
  ['Vermelho', 'vermelho'],
  ['Terracota', 'terracota'],
  ['Mostarda', 'mostarda'],
  ['Oliva', 'oliva'],
  ['Azul-petróleo', 'petroleo'],
  ['Anil', 'anil'],
  ['Violeta', 'violeta'],
  ['Fúcsia', 'fucsia'],
  ['Grafite', 'grafite'],
] as const;

async function newHabit(page: Page, name: string, color: string) {
  await page.getByRole('button', { name: 'Novo hábito' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Novo hábito' });
  await dialog.getByLabel('Nome', { exact: true }).fill(name);
  const picker = dialog.getByRole('radiogroup', { name: 'Cor do hábito' });
  await picker.getByRole('radio', { name: color, exact: true }).click();
  await expect(picker.getByRole('radio', { name: color, exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await dialog.getByRole('button', { name: 'Criar hábito' }).click();
  await expect(dialog).toBeHidden();
}

test.describe('paleta completa de cores', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('um hábito por grupo: a cor chega ao cartão, ao heatmap e persiste', async ({ page }) => {
    await seedSnapshot(page, {});
    await page.goto('/habitos');
    for (const [label, id] of ONE_PER_GROUP) {
      await newHabit(page, `Hábito ${label}`, label);
      const card = habitCard(page, `Hábito ${label}`);
      await expect(card).toHaveClass(new RegExp(`habit-${id}\\b`));
    }
    await page.reload();
    const data = await stored(page);
    expect(data.habits.map((h: { color: string }) => h.color)).toEqual(
      ONE_PER_GROUP.map(([, id]) => id),
    );
    await expect(habitCard(page, 'Hábito Grafite')).toHaveClass(/habit-grafite\b/);
  });

  test('matéria: escolher Vinho pelo teclado e ver a bolinha na lista', async ({ page }) => {
    await seedSnapshot(page, {});
    await page.goto('/materias');
    await page.getByRole('button', { name: 'Criar', exact: true }).first().click();
    await page.getByRole('menuitem', { name: 'Matéria' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova matéria' });
    await dialog.getByLabel('Nome').fill('Química');
    const picker = dialog.getByRole('radiogroup', { name: 'Cor da matéria' });
    // Tab entra na grade pela cor marcada (a primeira sugerida é Ciano).
    await picker.getByRole('radio', { name: 'Ciano' }).focus();
    // ↑ ↑ ↑ ↑ sobem Verdes → Amarelos → Laranjas → Vermelhos (1ª posição); → → chega ao Vinho.
    for (const key of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowRight'])
      await page.keyboard.press(key);
    await expect(picker.getByRole('radio', { name: 'Vinho' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(picker.getByRole('radio', { name: 'Vinho' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await expect(picker.getByRole('radio', { name: 'Carmim' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await picker.getByRole('radio', { name: 'Vinho' }).click();
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('main .bg-subject-vinho')).toHaveCount(1);
    await page.reload();
    expect((await stored(page)).subjects[0].color).toBe('vinho');
  });

  test('cores antigas não mudam; cor desconhecida aparece como Cinza e não se perde ao salvar', async ({
    page,
  }) => {
    const old = { ...manualHabit('antigo', 'Antigo', 0), color: 'ciano' };
    const future = { ...manualHabit('futuro', 'Futuro', 1), color: 'cor-do-futuro' };
    await seedSnapshot(page, { habits: [old, future] });
    await page.goto('/habitos');
    await expect(habitCard(page, 'Antigo')).toHaveClass(/habit-ciano\b/);
    await expect(habitCard(page, 'Futuro')).toHaveClass(/habit-cinza\b/);

    await habitCard(page, 'Antigo')
      .getByRole('button', { name: /^Ações de / })
      .click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    const edit = page.getByRole('dialog', { name: /Editar hábito/ });
    await expect(
      edit.getByRole('radiogroup', { name: 'Cor do hábito' }).getByRole('radio', { name: 'Ciano' }),
    ).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');

    await habitCard(page, 'Futuro')
      .getByRole('button', { name: /^Ações de / })
      .click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    const editFuture = page.getByRole('dialog', { name: /Editar hábito/ });
    await expect(
      editFuture
        .getByRole('radiogroup', { name: 'Cor do hábito' })
        .getByRole('radio', { checked: true }),
    ).toHaveCount(0);
    await editFuture.getByLabel('Nome', { exact: true }).fill('Futuro renomeado');
    await editFuture.getByRole('button', { name: 'Salvar' }).click();
    await expect(editFuture).toBeHidden();
    const habits = (await stored(page)).habits as { name: string; color: string }[];
    expect(habits.find((h) => h.name === 'Futuro renomeado')?.color).toBe('cor-do-futuro');
  });

  for (const view of [
    { name: 'celular', width: 390, height: 844, mobile: true },
    { name: 'tablet', width: 768, height: 1024, mobile: true },
  ] as const) {
    test.describe(view.name, () => {
      test.use({
        viewport: { width: view.width, height: view.height },
        isMobile: view.mobile,
        hasTouch: view.mobile,
      });

      test('a grade cabe sem rolagem horizontal, alvos de 44 px e “Criar hábito” visível', async ({
        page,
      }) => {
        await seedSnapshot(page, {});
        await page.goto('/habitos');
        await page.getByRole('button', { name: 'Novo hábito' }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Novo hábito' });
        const picker = dialog.getByRole('radiogroup', { name: 'Cor do hábito' });
        await picker.scrollIntoViewIfNeeded();
        const overflow = await picker.evaluate((el) => {
          const box = el.getBoundingClientRect();
          return box.right - window.innerWidth;
        });
        expect(overflow).toBeLessThanOrEqual(0);
        const swatch = await picker.getByRole('radio', { name: 'Vermelho' }).boundingBox();
        expect(swatch!.width).toBeGreaterThanOrEqual(44);
        await expect(picker.getByRole('radio')).toHaveCount(27);
        const save = await dialog.getByRole('button', { name: 'Criar hábito' }).boundingBox();
        expect(save!.y + save!.height).toBeLessThanOrEqual(view.height + 0.5);
      });
    });
  }

  test.describe('tema claro', () => {
    test.use({ colorScheme: 'light' });

    test('a seleção aparece com check no claro e a cor clara é aplicada', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('daily:theme', 'claro'));
      await seedSnapshot(page, {});
      await page.goto('/habitos');
      await newHabit(page, 'Leitura', 'Amarelo');
      const card = habitCard(page, 'Leitura');
      await expect(card).toHaveClass(/habit-amarelo\b/);
      const habitVar = await card.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--habit'),
      );
      expect(habitVar.trim().toLowerCase()).toBe('#866900');
    });
  });
});
