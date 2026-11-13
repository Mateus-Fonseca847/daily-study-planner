import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';

/** Quinta-feira, 29/10/2026. */
const NOW = new Date('2026-10-29T10:30:00');
const VIEWS = '/calendario?fixture=views';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});

/** Toque “de verdade” via CDP: o `page.touchscreen` só sabe tocar rápido. */
class Finger {
  private constructor(private readonly cdp: CDPSession) {}
  static async on(page: Page): Promise<Finger> {
    return new Finger(await page.context().newCDPSession(page));
  }
  private async send(
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: { x: number; y: number }[],
  ) {
    await this.cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i })),
    });
  }
  async down(x: number, y: number) {
    await this.send('touchStart', [{ x, y }]);
  }
  async move(x: number, y: number) {
    await this.send('touchMove', [{ x, y }]);
  }
  async up() {
    await this.send('touchEnd', []);
  }
  /** Segura no ponto por `ms` (toque longo). */
  async hold(x: number, y: number, ms: number) {
    await this.down(x, y);
    await new Promise((r) => setTimeout(r, ms));
    await this.up();
  }
  /** Arrasta de um ponto a outro em passos curtos (deslize). */
  async swipe(from: { x: number; y: number }, to: { x: number; y: number }, steps = 6) {
    await this.down(from.x, from.y);
    for (let i = 1; i <= steps; i += 1) {
      await this.move(
        from.x + ((to.x - from.x) * i) / steps,
        from.y + ((to.y - from.y) * i) / steps,
      );
      await new Promise((r) => setTimeout(r, 12));
    }
    await this.up();
  }
}

const center = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('elemento sem caixa');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
};

const title = (page: Page) => page.locator('h2[aria-live="polite"]').first();
const bottomBar = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' });

test.describe('Celular: navegação, sheets e gestos', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('barra inferior e “Mais”: navega, fecha ao navegar e o botão voltar fecha o sheet', async ({
    page,
  }) => {
    await page.goto(VIEWS);
    await expect(bottomBar(page)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Menus' })).toHaveCount(0); // sem sidebar

    await bottomBar(page)
      .getByRole('link', { name: /Hábitos/ })
      .tap();
    await expect(page).toHaveURL(/\/habitos/);
    await bottomBar(page).getByRole('link', { name: 'Foco' }).tap();
    await expect(page).toHaveURL(/\/foco/);
    await bottomBar(page).getByRole('link', { name: 'Perfil' }).tap();
    await expect(page).toHaveURL(/\/perfil/);

    // “Mais” abre o sheet; o botão voltar do aparelho fecha o sheet sem sair da página.
    await bottomBar(page).getByRole('button', { name: 'Mais' }).tap();
    const more = page.getByRole('dialog', { name: 'Mais' });
    await expect(more).toBeVisible();
    await page.goBack();
    await expect(more).toBeHidden();
    await expect(page).toHaveURL(/\/perfil/);

    // Abre de novo e navega por dentro: o sheet fecha e a página muda.
    await bottomBar(page).getByRole('button', { name: 'Mais' }).tap();
    await page
      .getByRole('dialog', { name: 'Mais' })
      .getByRole('link', { name: /Provas/ })
      .tap();
    await expect(page).toHaveURL(/\/provas/);
    await expect(page.getByRole('dialog', { name: 'Mais' })).toBeHidden();
  });

  test('o botão + abre o menu Criar como action sheet e leva ao formulário em tela cheia', async ({
    page,
  }) => {
    await page.goto(VIEWS);
    await page.getByRole('button', { name: 'Criar', exact: true }).tap();
    const sheet = page.getByRole('dialog', { name: 'Criar' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('menuitem')).toHaveText([
      'Tarefa',
      'Prova',
      'Especial',
      'Hábito',
      'Matéria',
    ]);
    await sheet.getByRole('menuitem', { name: 'Tarefa' }).tap();

    const form = page.getByRole('dialog', { name: 'Nova tarefa' });
    await expect(form).toBeVisible();
    // Tela cheia: ocupa a janela toda; o botão voltar fecha.
    const box = await form.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(389);
    expect(box?.height).toBeGreaterThanOrEqual(843);
    await page.goBack();
    await expect(form).toBeHidden();
  });

  test('Semana: toque simples não cria evento; toque longo cria com data e horário; hábito marca com um toque', async ({
    page,
  }) => {
    const finger = await Finger.on(page);
    await page.goto(`${VIEWS}&visao=semana&data=2026-10-29`);
    const column = page.getByRole('gridcell', { name: '2026-10-29' });
    await expect(column).toBeVisible();
    const box = (await column.boundingBox())!;
    // 13:10 da quinta (grade de 00h a 24h na fixture): vazio.
    const y = box.y + box.height * ((13 * 60 + 10) / (24 * 60));
    const x = box.x + 6;

    await finger.hold(x, y, 120); // toque curto: não cria nada
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await finger.hold(x, y, 700); // toque longo
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Data do prazo')).toHaveValue('2026-10-29');
    await expect(dialog.getByLabel('Hora do prazo')).toHaveValue('13:00');
    await expect(dialog.getByRole('radio', { name: 'Tarefa' })).toBeChecked();
    await page.goBack();

    const pill = page.getByRole('button', { name: /^Meditação: pendente/ });
    await expect(pill).toHaveAttribute('aria-pressed', 'false');
    await pill.tap();
    await expect(page.getByRole('button', { name: /^Meditação: feito/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('Dia: deslizar muda o dia; o painel é um resumo recolhível', async ({ page }) => {
    const finger = await Finger.on(page);
    await page.goto(`${VIEWS}&visao=dia&data=2026-10-29`);
    const summary = page.getByRole('button', { name: /Resumo do dia/ });
    await expect(summary).toContainText('hábitos pendentes · prova');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await summary.tap();
    await expect(page.getByRole('heading', { name: 'Hábitos do dia' })).toBeVisible();
    await summary.tap();

    await expect(title(page)).toContainText('29 de out');
    await finger.swipe({ x: 330, y: 560 }, { x: 80, y: 565 }); // dedo para a esquerda: avança
    await expect(page).toHaveURL(/data=2026-10-30/);
    await finger.swipe({ x: 80, y: 560 }, { x: 330, y: 566 }); // para a direita: volta
    await expect(page).toHaveURL(/data=2026-10-29/);
  });

  test('celular: sem a visão Ano (o padrão é o Mês) e a Semana é compacta e legível', async ({
    page,
  }) => {
    await page.goto(`${VIEWS}`);
    const views = page.getByRole('radiogroup', { name: 'Visualização do calendário' });
    await expect(views.getByRole('radio')).toHaveText(['Dia', 'Semana', 'Mês']);
    await expect(views.getByRole('radio', { name: 'Mês' })).toBeChecked();

    // Um link antigo com ?visao=ano cai no Mês no celular.
    await page.goto(`${VIEWS}&visao=ano&data=2026-10-29`);
    await expect(page.getByRole('radio', { name: 'Mês' })).toBeChecked();
    await expect(page.getByRole('group', { name: /Calendário de/ })).toHaveCount(0);

    await page.getByRole('radio', { name: 'Semana' }).tap();
    await expect(title(page).locator('span').first()).toHaveText('25–31 out');
    const hour = await page
      .getByRole('gridcell', { name: '2026-10-29' })
      .evaluate((el) => el.getBoundingClientRect().height / 24);
    expect(hour).toBeLessThanOrEqual(56); // horas mais baixas que as de 72 px do desktop
    // Hábitos da faixa viram ícones de 24 px e os blocos simultâneos só a faixa colorida.
    const pill = (await page
      .getByRole('button', { name: /^Meditação:/ })
      .first()
      .boundingBox())!;
    expect(pill.width).toBeLessThanOrEqual(26);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });

  test('Mês compacto: toque seleciona o dia e mostra a agenda; deslizar muda o mês', async ({
    page,
  }) => {
    const finger = await Finger.on(page);
    await page.goto(`${VIEWS}&visao=mes&data=2026-10-29`);
    await page.getByRole('gridcell', { name: /^28 de outubro/ }).tap();
    await expect(page.getByRole('region', { name: 'Agenda de 28 de outubro' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Prova:/ })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir dia' }).tap();
    await expect(page).toHaveURL(/visao=dia&data=2026-10-28/);

    await page.goto(`${VIEWS}&visao=mes&data=2026-10-29`);
    // Só desliza com o mês montado (o gesto vive no componente); sob carga o toque chegava antes.
    await expect(page.getByRole('gridcell', { name: /^29 de outubro/ })).toBeVisible();
    await finger.swipe({ x: 320, y: 300 }, { x: 70, y: 304 });
    await expect(title(page).locator('span').first()).toHaveText('Novembro 2026');
  });

  test('Hábitos: tocar numa célula abre o sheet do dia com ‹ › para trocar de dia', async ({
    page,
  }) => {
    await page.goto('/habitos?fixture=habits');
    const card = page.getByRole('region', { name: 'Musculação', exact: true });
    await card.locator('[data-date="2026-11-09"]').tap();
    const sheet = page.getByRole('dialog', { name: /Musculação, / });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[aria-live="polite"]')).toContainText('9 de nov');
    await sheet.getByRole('button', { name: 'Dia anterior' }).tap();
    await expect(sheet.locator('[aria-live="polite"]')).toContainText('8 de nov');
    await sheet.getByRole('button', { name: 'Próximo dia' }).tap();
    await sheet.getByRole('button', { name: 'Próximo dia' }).tap();
    await expect(sheet.locator('[aria-live="polite"]')).toContainText('10 de nov');
  });

  test('Modo Foco: sessão travada some com a navegação e destrava segurando 3 s', async ({
    page,
  }) => {
    const finger = await Finger.on(page);
    await page.goto('/foco?fixture=stats');
    await expect(bottomBar(page)).toBeVisible();
    await page.getByRole('button', { name: 'Travar', exact: true }).tap();
    await page.getByRole('button', { name: 'Iniciar', exact: true }).tap();

    const hold = page.getByRole('button', { name: /Segurar para destravar/ });
    await expect(hold).toBeVisible();
    await expect(bottomBar(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toHaveCount(0);
    expect(await hold.evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');

    const { x, y } = await center(hold);
    await finger.hold(x, y, 1000); // soltar antes de 3 s não destrava
    await expect(hold).toBeVisible();
    await finger.hold(x, y, 3400);
    await expect(hold).toBeHidden();
    await expect(bottomBar(page)).toBeVisible();
  });

  test('girar o aparelho mantém o estado e troca a navegação', async ({ page }) => {
    await page.goto('/preferencias?fixture=stats');
    const name = page.getByLabel('Nome');
    await name.fill('Mariana');
    await expect(bottomBar(page)).toBeVisible();

    await page.setViewportSize({ width: 844, height: 390 }); // paisagem de celular
    await expect(bottomBar(page)).toBeVisible(); // continua celular (altura baixa)
    await expect(page.getByLabel('Nome')).toHaveValue('Mariana');

    await page.setViewportSize({ width: 768, height: 1024 }); // tablet: trilho no lugar da barra
    await expect(bottomBar(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Expandir menu lateral' })).toBeVisible();
    await expect(page.getByLabel('Nome')).toHaveValue('Mariana');
  });
});

test.describe('Tablet: trilho com painel sobreposto', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('expande sobre o conteúdo e fecha ao tocar fora, com Esc e ao navegar', async ({ page }) => {
    await page.clock.install({ time: NOW });
    await page.goto(VIEWS);
    const expand = page.getByRole('button', { name: 'Expandir menu lateral' });
    await expect(expand).toBeVisible();

    await expand.tap();
    // Painel sobreposto: a segunda barra “Menus” (a primeira é o trilho, sempre presente).
    const menus = page.getByRole('navigation', { name: 'Menus' });
    const panel = menus.last();
    await expect(menus).toHaveCount(2);
    await page.mouse.click(700, 500); // fora do painel
    await expect(menus).toHaveCount(1);

    await expand.tap();
    await page.keyboard.press('Escape');
    await expect(menus).toHaveCount(1);

    await expand.tap();
    await panel.getByRole('link', { name: /Provas/ }).tap();
    await expect(page).toHaveURL(/\/provas/);
    await expect(menus).toHaveCount(1);
  });
});

test.describe('Área segura e teclado virtual', () => {
  test('topbar, barra inferior, sheet, toast e FAB respeitam os recuos de área segura', async ({
    page,
  }) => {
    await page.clock.install({ time: NOW });
    await page.goto(VIEWS);
    const read = () =>
      page.evaluate(() => {
        const top = document.querySelector('header')!;
        const bar = document.querySelector('nav[aria-label="Navegação principal"]')!;
        const fab = document.querySelector('.fab-slot')!;
        const css = (el: Element) => getComputedStyle(el);
        return {
          topPad: parseFloat(css(top).paddingTop),
          barPadBottom: parseFloat(css(bar).paddingBottom),
          barPadLeft: parseFloat(css(bar).paddingLeft),
          fabBottom: parseFloat(css(fab).bottom),
        };
      });
    const before = await read();
    expect(before.topPad).toBe(0);

    await page.evaluate(() => {
      const root = document.documentElement.style;
      root.setProperty('--ds-safe-top', '47px');
      root.setProperty('--ds-safe-bottom', '34px');
      root.setProperty('--ds-safe-left', '20px');
      root.setProperty('--ds-safe-right', '20px');
    });
    const after = await read();
    expect(after.topPad).toBe(47);
    expect(after.barPadBottom).toBe(34);
    expect(after.barPadLeft).toBe(20);
    expect(after.fabBottom - before.fabBottom).toBe(34);

    // Sheet: o respiro de baixo inclui o recuo.
    await bottomBarMore(page).tap();
    const sheetPad = await page
      .getByRole('dialog', { name: 'Mais' })
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expect(sheetPad).toBe(34);
    await page.goBack();

    // Região dos avisos: acima da barra inferior, do + e do recuo.
    const region = await page
      .locator('.toast-region')
      .evaluate((el) => parseFloat(getComputedStyle(el).bottom));
    expect(region).toBeGreaterThanOrEqual(56 + 56 + 12 * 2 + 34 - 1);
  });

  test('com o teclado aberto, o formulário em tela cheia acompanha a área visível', async ({
    page,
  }) => {
    await page.clock.install({ time: NOW });
    await page.goto(VIEWS);
    await page.getByRole('button', { name: 'Criar', exact: true }).tap();
    await page.getByRole('menuitem', { name: 'Matéria' }).tap();
    const dialog = page.getByRole('dialog', { name: 'Nova matéria' });
    await expect(dialog).toBeVisible();

    // O que `installVisualViewport` publica quando o teclado ocupa a metade de baixo da tela.
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--ds-vv-h', '420px');
    });
    const name = dialog.getByLabel('Nome');
    await name.focus();
    const box = (await dialog.boundingBox())!;
    expect(box.height).toBe(420);
    for (const locator of [name, dialog.getByRole('button', { name: 'Salvar' })]) {
      const b = (await locator.boundingBox())!;
      expect(b.y + b.height, 'campo e ação acima do teclado').toBeLessThanOrEqual(420);
      expect(b.y).toBeGreaterThanOrEqual(0);
    }
  });
});

const bottomBarMore = (page: Page) =>
  page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('button', { name: 'Mais' });
