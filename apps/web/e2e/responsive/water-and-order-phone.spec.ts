import { expect, test, type Page } from '@playwright/test';

/** Quarta-feira, 11/11/2026. */
const NOW = new Date('2026-11-11T10:30:00');
const MIN_TOUCH = 44;

test.use({
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
  viewport: { width: 390, height: 844 },
});

const sections = (page: Page) =>
  page
    .locator('section[aria-label]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));

async function createHabit(page: Page, name: string) {
  await page.getByRole('button', { name: 'Novo hábito' }).first().tap();
  const dialog = page.getByRole('dialog', { name: 'Novo hábito' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByRole('button', { name: 'Criar hábito' }).tap();
  await expect(dialog).toHaveCount(0);
}

/** Arrasto de toque de verdade (CDP), em passos, de um ponto a outro. */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', point?: { x: number; y: number }) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: point ? [{ x: point.x, y: point.y }] : [],
    });
  await send('touchStart', from);
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    await send('touchMove', {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    });
    await page.waitForTimeout(16);
  }
  await send('touchEnd');
}

test.describe('Celular: água e reordenação', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('a água abre numa folha inferior, com alvos de toque ≥ 44 px, e salva', async ({ page }) => {
    await page.goto('/habitos');
    await page.getByRole('button', { name: 'Hidratação' }).tap();
    await page.goto('/estatisticas');
    await page.getByRole('button', { name: /^Água de hoje: .*Editar/ }).tap();

    const sheet = page.getByRole('dialog', { name: 'Água de hoje' });
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box!.y + box!.height).toBeGreaterThan(800); // encostada embaixo
    expect(box!.width).toBeGreaterThan(380);

    await sheet.getByLabel('Quantidade personalizada').fill('500 ml');
    await sheet.getByRole('button', { name: 'Adicionar' }).tap();
    await expect(sheet.getByRole('status')).toHaveText('Total hoje: 0,5 L');

    for (const target of [
      sheet.getByRole('button', { name: /^Copo/ }),
      sheet.getByRole('button', { name: 'Adicionar' }),
      sheet.getByRole('button', { name: /^Editar registro/ }).first(),
      sheet.getByRole('button', { name: /^Excluir registro/ }).first(),
    ]) {
      const b = await target.boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(MIN_TOUCH - 0.5);
      expect(b!.width).toBeGreaterThanOrEqual(MIN_TOUCH - 0.5);
    }
    // Sem rolagem horizontal dentro da folha.
    expect(await sheet.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('a alça tem ≥ 44 px, touch-action none e reordena por toque', async ({ page }) => {
    await page.goto('/habitos');
    for (const name of ['Alfa', 'Beta', 'Gama']) await createHabit(page, name);

    const handle = page.getByRole('button', { name: 'Reordenar Gama' });
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH - 0.5);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH - 0.5);
    expect(await handle.evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');

    // Gama sobe uma posição: solta sobre o cabeçalho de “Beta”, o vizinho de cima.
    const beta = (await page.getByRole('region', { name: 'Beta', exact: true }).boundingBox())!;
    await touchDrag(
      page,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      { x: box.x + box.width / 2, y: Math.max(beta.y, 0) + 40 },
    );
    expect(await sections(page)).toEqual(['Alfa', 'Gama', 'Beta']);

    await page.reload();
    expect(await sections(page)).toEqual(['Alfa', 'Gama', 'Beta']);
  });
});
