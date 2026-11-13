import { expect, test, type Page } from '@playwright/test';
import { manualHabit, seedSnapshot } from './helpers';

/** Quarta-feira, 11/11/2026. */
const NOW = new Date('2026-11-11T10:30:00');

const habitCard = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const cell = (page: Page, name: string, date: string) =>
  habitCard(page, name).locator(`[data-date="${date}"]`);

/** Abre o painel de água pelo valor no cartão do Perfil. */
async function openWaterPanel(page: Page) {
  await page.goto('/perfil');
  await page.getByRole('button', { name: /^Água de hoje: .*Editar/ }).click();
  const panel = page.getByRole('dialog', { name: 'Água de hoje' });
  await expect(panel).toBeVisible();
  return panel;
}

async function addCustom(panel: ReturnType<Page['getByRole']>, text: string) {
  await panel.getByLabel('Quantidade personalizada').fill(text);
  await panel.getByRole('button', { name: 'Adicionar' }).click();
}

test.describe('Água editável', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
    // O hábito “Água” (criado sozinho) lê a água do dia: o heatmap muda junto com os registros.
    await page.goto('/habitos');
    await expect(habitCard(page, 'Água')).toBeVisible();
  });

  test('quantidade personalizada: total e heatmap mudam; erro em pt-BR sem alterar nada', async ({
    page,
  }) => {
    const panel = await openWaterPanel(page);
    await expect(panel.getByLabel('Quantidade personalizada')).toBeFocused();

    await addCustom(panel, 'abc');
    await expect(panel.getByRole('alert')).toContainText('Não entendi “abc”');
    await expect(panel.getByText('Nenhum registro.')).toBeVisible();

    await addCustom(panel, '300 ml');
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 0,3 L');
    await expect(panel.getByText('300 ml', { exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Água de hoje: .*Editar/ })).toBeFocused();

    await page.goto('/habitos');
    await expect(cell(page, 'Água', '2026-11-11')).toHaveAttribute(
      'aria-label',
      /300 ml de 2000 ml/,
    );
  });

  test('editar um registro, excluir outro e desfazer', async ({ page }) => {
    const panel = await openWaterPanel(page);
    await addCustom(panel, '250');
    await addCustom(panel, '300');

    await panel.getByRole('button', { name: /^Editar registro de 250 ml/ }).click();
    await panel.getByLabel('Quantidade', { exact: true }).fill('400');
    await panel.getByRole('button', { name: 'Salvar' }).click();
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 0,7 L');

    await panel.getByRole('button', { name: /^Excluir registro de 300 ml/ }).click();
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 0,4 L');
    await page.getByRole('button', { name: 'Desfazer' }).last().click();
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 0,7 L');
    await expect(panel.getByText('300 ml', { exact: true })).toBeVisible();
    await expect(panel.getByText('400 ml', { exact: true })).toBeVisible();
  });

  test('definir o total do dia: pede confirmação ao diminuir e desfaz', async ({ page }) => {
    const panel = await openWaterPanel(page);
    await panel.getByRole('button', { name: /^Copo/ }).click();
    await panel.getByRole('button', { name: /^Copo/ }).click();
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 0,5 L');

    await panel.getByLabel('Definir o total do dia').fill('1,2 l');
    await panel.getByRole('button', { name: 'Definir', exact: true }).click();
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 1,2 L');

    await panel.getByLabel('Definir o total do dia').fill('0,3 l');
    await panel.getByRole('button', { name: 'Definir', exact: true }).click();
    await expect(panel.getByRole('alert')).toContainText('Isso removerá');
    await panel.getByRole('button', { name: 'Confirmar' }).click();
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 0,3 L');

    await page.getByRole('button', { name: 'Desfazer' }).last().click();
    await expect(panel.getByRole('status')).toHaveText('Total hoje: 1,2 L');
  });

  test('corrigir um dia passado pelo heatmap e recarregar: tudo persiste', async ({ page }) => {
    await page.goto('/habitos');
    await cell(page, 'Água', '2026-11-09').click();
    const panel = page.getByRole('dialog', { name: /^Água de (?!hoje)/ });
    await expect(panel.getByText('Nenhum registro.')).toBeVisible();
    await addCustom(panel, '1,5 l');
    // Registro retroativo: horário padrão 12:00.
    await expect(panel.getByText('12:00', { exact: true })).toBeVisible();
    await expect(panel.getByRole('status')).toHaveText('Total do dia: 1,5 L');
    await page.keyboard.press('Escape');

    await page.reload();
    await cell(page, 'Água', '2026-11-09').click();
    const again = page.getByRole('dialog', { name: /^Água de (?!hoje)/ });
    await expect(again.getByText('1500 ml', { exact: true })).toBeVisible();
    // Dia futuro não existe no heatmap.
    await expect(cell(page, 'Água', '2026-11-12')).toHaveCount(0);
  });
});

test.describe('Hábitos reordenáveis', () => {
  const NAMES = ['Alfa', 'Beta', 'Gama'];

  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
    // Hábitos semeados (criar pelo formulário já é coberto em habits.spec): o tempo do teste vai
    // para o que ele verifica — reordenar e conferir a ordem em várias telas.
    await seedSnapshot(page, {
      habits: NAMES.map((name, order) => manualHabit(name.toLowerCase(), name, order)),
    });
    await page.goto('/habitos');
  });

  /** Nomes na ordem em que aparecem no texto da página (DOM). */
  const orderIn = async (page: Page) => {
    const text = await page.locator('main').innerText();
    return NAMES.map((name) => ({ name, at: text.indexOf(name) }))
      .filter((x) => x.at >= 0)
      .sort((a, b) => a.at - b.at)
      .map((x) => x.name);
  };

  const habitsPageOrder = async (page: Page) => {
    await expect(page.locator('section[aria-label]')).toHaveCount(NAMES.length);
    return page
      .locator('section[aria-label]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  };

  /**
   * A ordem é a mesma em Hábitos, Perfil, Semana e Dia. Cada `goto` é um carregamento completo a
   * partir do armazenamento, então isto também verifica que a ordem persistiu.
   */
  async function expectSameOrderEverywhere(page: Page, expected: string[]) {
    await page.goto('/habitos');
    expect(await habitsPageOrder(page)).toEqual(expected);
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Hábitos de hoje' })).toBeVisible();
    expect(await orderIn(page)).toEqual(expected);
    await page.goto('/calendario?visao=semana&data=2026-11-11');
    await expect(page.getByText(expected[0] as string).first()).toBeVisible();
    expect(await orderIn(page)).toEqual(expected);
    await page.goto('/calendario?visao=dia&data=2026-11-11');
    await expect(page.getByText(expected[0] as string).first()).toBeVisible();
    expect(await orderIn(page)).toEqual(expected);
  }

  test('teclado: espaço pega, setas movem, espaço solta; Esc cancela; ordem igual nas telas', async ({
    page,
  }) => {
    const handle = page.getByRole('button', { name: 'Reordenar Alfa' });
    await handle.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByText('Alfa movido para a posição 2 de 3')).toBeAttached();
    await page.keyboard.press('Space');
    expect(await habitsPageOrder(page)).toEqual(['Beta', 'Alfa', 'Gama']);

    // Esc cancela: nada muda.
    await page.getByRole('button', { name: 'Reordenar Gama' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    expect(await habitsPageOrder(page)).toEqual(['Beta', 'Alfa', 'Gama']);

    await expectSameOrderEverywhere(page, ['Beta', 'Alfa', 'Gama']);
  });

  test('mouse: arrastar pela alça muda a ordem e ela persiste após recarregar', async ({
    page,
  }) => {
    const from = await page.getByRole('button', { name: 'Reordenar Gama' }).boundingBox();
    const to = await habitCard(page, 'Alfa').boundingBox();
    expect(from && to).toBeTruthy();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + 4, from!.y - 40, { steps: 5 });
    await page.mouse.move(from!.x + 4, to!.y + 10, { steps: 15 });
    await page.mouse.up();
    expect(await habitsPageOrder(page)).toEqual(['Gama', 'Alfa', 'Beta']);

    await page.reload();
    expect(await habitsPageOrder(page)).toEqual(['Gama', 'Alfa', 'Beta']);
    await expectSameOrderEverywhere(page, ['Gama', 'Alfa', 'Beta']);
  });

  test('menu “...”: mover para cima e para baixo', async ({ page }) => {
    await page.getByRole('button', { name: 'Ações de Gama' }).click();
    await page.getByRole('menuitem', { name: 'Mover para cima' }).click();
    expect(await habitsPageOrder(page)).toEqual(['Alfa', 'Gama', 'Beta']);

    await page.getByRole('button', { name: 'Ações de Alfa' }).click();
    await expect(page.getByRole('menuitem', { name: 'Mover para cima' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Mover para baixo' }).click();
    expect(await habitsPageOrder(page)).toEqual(['Gama', 'Alfa', 'Beta']);
    await expectSameOrderEverywhere(page, ['Gama', 'Alfa', 'Beta']);
  });
});
