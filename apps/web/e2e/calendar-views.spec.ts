import { expect, test, type Page } from '@playwright/test';

/** Quinta-feira, 29/10/2026. */
const NOW = new Date('2026-10-29T10:30:00');
const BASE = '/calendario?fixture=views';

const view = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });
const title = (page: Page) => page.locator('h2[aria-live="polite"]');

test.describe('Visões do calendário', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('troca entre Dia, Semana, Mês e Ano pelo segmentado e pela URL', async ({ page }) => {
    await page.goto(BASE);
    await expect(view(page, 'Mês')).toBeChecked();
    await expect(page.getByRole('grid', { name: 'Calendário mensal' })).toBeVisible();

    await view(page, 'Semana').click();
    await expect(page).toHaveURL(/visao=semana&data=2026-10-29/);
    await expect(page.getByRole('grid', { name: 'Calendário semanal' })).toBeVisible();

    await view(page, 'Dia').click();
    await expect(page).toHaveURL(/visao=dia/);
    await expect(page.getByRole('grid', { name: 'Calendário do dia' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Hoje, quinta-feira, 29 de outubro' }),
    ).toBeVisible();

    await view(page, 'Ano').click();
    await expect(page.getByRole('group', { name: 'Calendário de 2026' })).toBeVisible();

    // Pela URL (e o botão voltar do navegador).
    await page.goto('/calendario?visao=ano&data=2027-03-10&fixture=views');
    await expect(view(page, 'Ano')).toBeChecked();
    await expect(page.getByRole('group', { name: 'Calendário de 2027' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('group', { name: 'Calendário de 2026' })).toBeVisible();

    // Valores inválidos caem em Mês + hoje.
    await page.goto('/calendario?visao=hora&data=2026-02-30&fixture=views');
    await expect(view(page, 'Mês')).toBeChecked();
    await expect(title(page)).toHaveText('Outubro 2026');
  });

  test('→ avança a semana e “Hoje” volta ao período atual na mesma visão', async ({ page }) => {
    await page.goto(`${BASE}&visao=semana&data=2026-10-29`);
    await expect(title(page)).toHaveText('25 – 31 out 2026');
    await page.keyboard.press('ArrowRight');
    await expect(title(page)).toHaveText('1 – 7 nov 2026');
    await expect(page).toHaveURL(/data=2026-11-05/);
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Hoje', exact: true }).click();
    await expect(title(page)).toHaveText('25 – 31 out 2026');
    await expect(view(page, 'Semana')).toBeChecked(); // continua na Semana

    // Atalhos de visão e “T”.
    await page.keyboard.press('a');
    await expect(view(page, 'Ano')).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(title(page)).toHaveText('2025');
    await page.keyboard.press('t');
    await expect(title(page)).toHaveText('2026');
    await page.keyboard.press('d');
    await expect(view(page, 'Dia')).toBeChecked();
  });

  test('os atalhos não roubam as teclas de um campo de texto nem com modal aberto', async ({
    page,
  }) => {
    await page.goto(`${BASE}&visao=semana&data=2026-10-29`);
    await page.getByRole('button', { name: 'Nova Prova' }).click();
    await page.getByLabel('Título').fill('sdm');
    await expect(page.getByLabel('Título')).toHaveValue('sdm');
    await expect(view(page, 'Semana')).toBeChecked();
    await page.keyboard.press('Escape');
    await page.keyboard.press('m');
    await expect(view(page, 'Mês')).toBeChecked();
  });

  test('clicar num horário vazio da Semana cria o evento com data e hora corretas', async ({
    page,
  }) => {
    await page.goto(`${BASE}&visao=semana&data=2026-10-29`);
    const friday = page.getByRole('gridcell', { name: '2026-10-30' });
    // 20:00: o evento que cruza a meia-noite expande a grade para 00h–24h (72 px por hora).
    await friday.click({ position: { x: 20, y: 20 * 72 + 10 } });

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Data')).toHaveValue('2026-10-30');
    await expect(dialog.getByLabel('Início')).toHaveValue('20:00');
    await dialog.getByLabel('Título').fill('Estudo noturno');
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    const block = page.getByRole('button', { name: /Estudo noturno, 20:00 – 21:00/ });
    await expect(block).toBeVisible();
  });

  test('no Ano, clicar num dia abre a visão Dia daquela data; o nome do mês abre o Mês', async ({
    page,
  }) => {
    await page.goto(`${BASE}&visao=ano&data=2026-10-29`);
    await page.getByRole('button', { name: /^qui\., 29 de out\./ }).click();
    await expect(page).toHaveURL(/visao=dia&data=2026-10-29/);
    await expect(
      page.getByRole('heading', { name: 'Hoje, quinta-feira, 29 de outubro' }),
    ).toBeVisible();

    await page.goto(`${BASE}&visao=ano&data=2026-10-29`);
    await page.getByRole('button', { name: 'Abrir Março na visão Mês' }).click();
    await expect(page).toHaveURL(/visao=mes&data=2026-03-01/);
    await expect(title(page)).toHaveText('Março 2026');
  });

  test('a faixa de hábitos da Semana marca um hábito manual e muda o estado', async ({ page }) => {
    await page.goto(`${BASE}&visao=semana&data=2026-10-29`);
    const pill = page.getByRole('button', { name: /^Meditação: pendente/ }); // só hoje está pendente
    await expect(pill).toHaveAttribute('aria-pressed', 'false');
    await pill.click();
    await expect(page.getByRole('button', { name: /^Meditação: feito/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^Meditação: feito/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Hábito automático (água) é somente leitura.
    await expect(page.getByRole('button', { name: /^Hidratação/ })).toHaveCount(0);
  });

  test('eventos simultâneos aparecem todos, lado a lado e sem sobreposição', async ({ page }) => {
    await page.goto(`${BASE}&visao=semana&data=2026-10-29`);
    const names = ['Grupo de estudos', 'Revisão de História', 'Simulado'];
    const boxes = [];
    for (const name of names) {
      const block = page.getByRole('button', { name: new RegExp(`: ${name},`) });
      await expect(block).toBeVisible();
      const box = await block.boundingBox();
      expect(box).not.toBeNull();
      boxes.push(box!);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap =
          a.x < b.x + b.width - 1 &&
          b.x < a.x + a.width - 1 &&
          a.y < b.y + b.height - 1 &&
          b.y < a.y + a.height - 1;
        expect(overlap, `${names[i]} × ${names[j]}`).toBe(false);
      }
    }
  });
});
