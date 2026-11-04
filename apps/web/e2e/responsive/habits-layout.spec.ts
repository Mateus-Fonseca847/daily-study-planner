import { expect, test, type Page } from '@playwright/test';

/** Terça-feira, 10/11/2026. */
const NOW = new Date('2026-11-10T10:30:00');
const HABITS = '/habitos?fixture=habits';
const WIDTHS = [320, 340, 360, 375, 390, 412, 480, 600, 768, 844, 900, 1023];

test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

/** Larguras que a página ocupa a mais que a janela, e o que passa da borda direita. */
async function overflow(page: Page) {
  return page.evaluate(() => {
    const width = window.innerWidth;
    const scroller = document.querySelector<HTMLElement>('main .overflow-y-auto')!;
    const beyond: string[] = [];
    for (const el of scroller.querySelectorAll('*')) {
      if (el.closest('[data-scroll-x], .sr-only')) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 1 && r.right > width + 1) {
        beyond.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 20)}" r=${Math.round(r.right)}`,
        );
      }
    }
    return {
      document: document.documentElement.scrollWidth - width,
      page: scroller.scrollWidth - scroller.clientWidth,
      beyond: beyond.slice(0, 5),
    };
  });
}

test.describe('/habitos em celular e tablet', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  for (const width of WIDTHS) {
    test(`sem rolagem horizontal em ${width} px (e com texto 150 %)`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
      await page.goto(HABITS);
      await expect(page.getByRole('region', { name: 'Musculação', exact: true })).toBeVisible();

      expect(await overflow(page), `${width} px`).toEqual({ document: 0, page: 0, beyond: [] });

      // Android com fonte grande: a página não pode passar da largura nem assim.
      await page.addStyleTag({ content: 'html{font-size:150%}' });
      await page.waitForTimeout(150);
      expect(await overflow(page), `${width} px, fonte 150 %`).toEqual({
        document: 0,
        page: 0,
        beyond: [],
      });
    });
  }

  test('cabeçalho: select "12 meses" e "Novo hábito" dividem a linha sem estourar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 340, height: 740 });
    await page.goto(HABITS);
    const select = page.getByRole('combobox', { name: 'Período' });
    const button = page.getByRole('button', { name: 'Novo hábito' }).first();
    await expect(select.locator('option').first()).toHaveText('12 meses');
    const a = (await select.boundingBox())!;
    const b = (await button.boundingBox())!;
    expect(a.x + a.width).toBeLessThanOrEqual(b.x);
    expect(b.x + b.width).toBeLessThanOrEqual(340 - 16);
    expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(2); // dividem a largura
    expect(a.height).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
  });

  test('cartão em duas linhas: nome, repetição, check e menu de 44 px sem encostar no texto; 3 colunas iguais', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 340, height: 740 });
    await page.goto(HABITS);
    const card = page.getByRole('region', { name: 'Luta', exact: true });
    const title = (await card.getByRole('heading', { name: 'Luta' }).boundingBox())!;
    const menu = (await card.getByRole('button', { name: 'Ações de Luta' }).boundingBox())!;
    const check = (await card.getByRole('checkbox', { name: 'Luta: feito hoje' }).boundingBox())!;
    expect(menu.width).toBeGreaterThanOrEqual(44);
    expect(menu.height).toBeGreaterThanOrEqual(44);
    expect(check.width).toBeGreaterThanOrEqual(44);
    expect(check.x + check.width).toBeLessThanOrEqual(menu.x); // check à esquerda do menu
    expect(menu.x - (check.x + check.width)).toBeGreaterThanOrEqual(4); // com espaço entre eles
    expect(title.x + title.width).toBeLessThanOrEqual(check.x); // o texto não encosta nos botões

    const columns = await card
      .locator('dl > div')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
    expect(columns).toHaveLength(3);
    expect(Math.max(...columns) - Math.min(...columns)).toBeLessThanOrEqual(2);
  });

  test('heatmap compacto: células de ~13 px, rótulos fora das células e começa na semana mais recente', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(HABITS);
    const card = page.getByRole('region', { name: 'Musculação', exact: true });
    const cells = card.locator('[role="gridcell"][data-date]');
    const size = (await cells.first().boundingBox())!;
    expect(size.width).toBeGreaterThanOrEqual(12);
    expect(size.width).toBeLessThanOrEqual(13.5);
    expect(size.height).toBeLessThanOrEqual(13.5);

    // Rolagem horizontal começa no fim (semana mais recente) e a barra é fina.
    const scroller = card.locator('[data-scroll-x]').first();
    const state = await scroller.evaluate((el) => ({
      atEnd: Math.abs(el.scrollWidth - el.clientWidth - el.scrollLeft) <= 1,
      wide: el.scrollWidth > el.clientWidth,
      thin: getComputedStyle(el).scrollbarWidth,
    }));
    expect(state).toEqual({ atEnd: true, wide: true, thin: 'thin' });

    // A coluna de rótulos (Seg, Qua, Sex) fica à esquerda da rolagem: nada sobre as células.
    const labels = card.locator('div.compact\\:block span').filter({ hasText: /^(Seg|Qua|Sex)$/ });
    await expect(labels).toHaveCount(3);
    const scrollBox = (await scroller.boundingBox())!;
    for (const i of [0, 1, 2]) {
      const label = (await labels.nth(i).boundingBox())!;
      expect(label.x + label.width).toBeLessThanOrEqual(scrollBox.x + 1);
    }
    // E cabem muito mais semanas do que antes (células de 24 px davam ~11).
    const visibleWeeks = Math.floor(scrollBox.width / 16);
    expect(visibleWeeks).toBeGreaterThanOrEqual(14);
  });

  test('o + e a barra inferior não cobrem o último cartão', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HABITS);
    await page.locator('main .overflow-y-auto').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(150);
    const cards = page.locator('main section[aria-label]');
    const last = (await cards.last().boundingBox())!;
    const fab = (await page.getByRole('button', { name: 'Criar', exact: true }).boundingBox())!;
    const bar = (await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(fab.y); // o + fica abaixo do fim do último cartão
    expect(last.y + last.height).toBeLessThanOrEqual(bar.y);
  });

  test('tablet: uma coluna, cabeçalho do cartão em duas linhas e mais semanas sem esticar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(HABITS);
    const cards = page.locator('main section[aria-label]');
    const a = (await cards.nth(0).boundingBox())!;
    const b = (await cards.nth(1).boundingBox())!;
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(1); // empilhados
    expect(b.y).toBeGreaterThan(a.y + a.height - 1);
    const cell = (await cards
      .first()
      .locator('[role="gridcell"][data-date]')
      .first()
      .boundingBox())!;
    expect(cell.width).toBeLessThanOrEqual(13.5); // não estica
    const title = (await cards.first().getByRole('heading').boundingBox())!;
    expect(title.width).toBeGreaterThan(120); // o nome não é truncado
  });
});
