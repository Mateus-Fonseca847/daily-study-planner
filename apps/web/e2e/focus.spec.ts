import { expect, test, type Page } from '@playwright/test';

const NOW = new Date('2026-11-10T10:00:00');

const timeField = (page: Page) => page.getByRole('textbox', { name: 'Duração da sessão' });
const timer = (page: Page) => page.getByRole('timer');
const play = (page: Page) => page.getByRole('button', { name: 'Iniciar', exact: true });
const lockToggle = (page: Page) => page.getByRole('button', { name: 'Travar tela ao iniciar' });
const sidebarCreate = (page: Page) => page.getByRole('button', { name: 'Criar', exact: true });
const savedSessions = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('daily:v2');
    return raw ? JSON.parse(raw).data.focusSessions : [];
  });

/** Digita uma duração e confirma com Enter. */
async function setDuration(page: Page, text: string) {
  const field = timeField(page);
  await field.click();
  await field.fill(text);
  await field.press('Enter');
}

test.describe('Modo Foco minimalista', () => {
  test('ocioso: só o tempo editável, o play e o cadeado (sem atalhos nem vínculo)', async ({
    page,
  }) => {
    await page.goto('/foco');
    await expect(timeField(page)).toHaveValue('25:00');
    await expect(play(page)).toBeVisible();
    await expect(lockToggle(page)).toHaveAttribute('aria-pressed', 'false');

    // Nada de −5/+5, atalhos de duração, seletor de vínculo, alça ou textos auxiliares.
    await expect(page.getByRole('button', { name: /min$/ })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Estudando' })).toHaveCount(0);
    await expect(page.getByRole('slider')).toHaveCount(0);
    await expect(page.getByText('Ajuste o tempo')).toHaveCount(0);
    await expect(page.getByText('Segure por 3 segundos')).toHaveCount(0);
    for (const name of ['Pausar', 'Retomar', 'Reiniciar', 'Encerrar']) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
  });

  test('edição por digitação: formatos, limites, setas, Esc e persistência', async ({ page }) => {
    await page.goto('/foco');
    const field = timeField(page);
    const notice = page.locator('div.sr-only[role="status"]'); // região viva da página (não a dos toasts)

    await setDuration(page, '90');
    await expect(field).toHaveValue('1:30:00');
    await setDuration(page, '25:30');
    await expect(field).toHaveValue('25:30');

    // Só dígitos e “:”.
    await field.click();
    await field.fill('1a2b');
    await expect(field).toHaveValue('12');
    await field.press('Enter');
    await expect(field).toHaveValue('12:00');

    // Inválida volta ao valor anterior e avisa.
    await field.click();
    await field.fill('1::2');
    await field.press('Enter');
    await expect(field).toHaveValue('12:00');
    await expect(notice).toContainText('Duração inválida');

    // Limites: mínimo 1 min, máximo 3 h.
    await setDuration(page, '0');
    await expect(field).toHaveValue('01:00');
    await expect(notice).toContainText('mínima');
    await setDuration(page, '500');
    await expect(field).toHaveValue('3:00:00');
    await expect(notice).toContainText('máxima');

    // Setas ±1 min e Shift ±5 min.
    await setDuration(page, '25');
    await field.focus();
    await page.keyboard.press('ArrowUp');
    await expect(field).toHaveValue('26:00');
    await page.keyboard.press('Shift+ArrowDown');
    await expect(field).toHaveValue('21:00');

    // Esc cancela; sair do campo confirma.
    await field.fill('45');
    await page.keyboard.press('Escape');
    await expect(field).toHaveValue('21:00');
    await field.click();
    await field.fill('50');
    await lockToggle(page).focus(); // tirar o foco confirma
    await expect(field).toHaveValue('50:00');

    // A última duração confirmada é o padrão e mantém os segundos.
    await setDuration(page, '25:30');
    await page.reload();
    await expect(timeField(page)).toHaveValue('25:30');
  });

  test('rodar, pausar, retomar e concluir (com relógio falso)', async ({ page }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/foco');
    await setDuration(page, '2');
    await play(page).click();

    // Rodando sem trava: só o pause; o cadeado some e o tempo vira somente leitura.
    await expect(timer(page)).toHaveText('02:00');
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await expect(lockToggle(page)).toHaveCount(0);
    await expect(timeField(page)).toHaveCount(0);

    await page.clock.fastForward(30_000);
    await expect(timer(page)).toHaveText('01:30');

    // Pausado: o tempo congela e aparecem retomar, reiniciar e encerrar.
    await page.getByRole('button', { name: 'Pausar' }).click();
    for (const name of ['Retomar', 'Reiniciar', 'Encerrar']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
    await page.clock.fastForward(60_000);
    await expect(timer(page)).toHaveText('01:30');

    await page.getByRole('button', { name: 'Retomar' }).click();
    await page.clock.fastForward(91_000);

    // Concluído: anel cheio, duração focada, nova sessão e link discreto; sessão salva.
    await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
    await expect(page.getByRole('timer', { name: /Duração focada: 2 min/ })).toBeVisible();
    await expect(page).toHaveTitle('Sessão concluída');
    await expect(page.getByRole('link', { name: 'Ver estatísticas' })).toBeVisible();
    expect(await savedSessions(page)).toMatchObject([
      { status: 'concluida', plannedSec: 120, actualSec: 120 },
    ]);

    await page.getByRole('button', { name: 'Nova sessão' }).click();
    await expect(timeField(page)).toHaveValue('02:00'); // a última duração segue como padrão
  });

  test('reiniciar volta ao tempo escolhido; encerrar descarta (< 1 min) ou confirma (> 1 min)', async ({
    page,
  }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/foco');
    await setDuration(page, '10');
    await play(page).click();
    await page.clock.fastForward(20_000);
    await page.getByRole('button', { name: 'Pausar' }).click();
    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await expect(timeField(page)).toHaveValue('10:00');

    await play(page).click();
    await page.clock.fastForward(30_000);
    await page.getByRole('button', { name: 'Pausar' }).click();
    await page.getByRole('button', { name: 'Encerrar' }).click(); // < 1 min: sem confirmação
    await expect(timeField(page)).toBeVisible();
    expect(await savedSessions(page)).toHaveLength(0);

    await play(page).click();
    await page.clock.fastForward(5 * 60_000);
    await page.getByRole('button', { name: 'Pausar' }).click();
    await page.getByRole('button', { name: 'Encerrar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Encerrar a sessão?' });
    await expect(dialog).toContainText('interrompida');
    await dialog.getByRole('button', { name: 'Encerrar' }).click();
    await expect(timeField(page)).toBeVisible();
    expect(await savedSessions(page)).toMatchObject([{ status: 'interrompida' }]);
  });

  test('Espaço pausa/retoma e a sessão pausada sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/foco');
    await play(page).click();
    await page.locator('body').press('Space');
    await expect(page.getByRole('button', { name: 'Retomar' })).toBeVisible();
    const frozen = await timer(page).innerText();
    await page.waitForTimeout(1200);
    await expect(timer(page)).toHaveText(frozen);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Retomar' })).toBeVisible();
    await expect(timer(page)).toHaveText(frozen);
  });
});

test.describe('Modo Foco travado', () => {
  test('só restam o anel e “Segurar para destravar”; Esc e Espaço não fazem nada; 3 s destravam sem encerrar', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => void dialog.accept()); // aviso do navegador ao recarregar travado
    await page.goto('/foco');
    await setDuration(page, '45');
    await lockToggle(page).click();
    await expect(lockToggle(page)).toHaveAttribute('aria-pressed', 'true');
    await play(page).click();

    // Navegação some; na tela, só o tempo e o botão de destravar (nenhum outro botão).
    await expect(page.getByRole('button', { name: /Segurar para destravar/ })).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(page.getByRole('link')).toHaveCount(0);
    await expect(timer(page)).toHaveText(/^4[45]:\d\d$/);

    // Esc e Espaço não fazem nada.
    await page.keyboard.press('Escape');
    await page.locator('body').press('Space');
    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Retomar' })).toHaveCount(0);

    // Rota bloqueada (voltar/avançar) e URL digitada voltam para /foco; a sessão é restaurada.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/calendario');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/foco$/);
    await page.goto('/calendario');
    await expect(page).toHaveURL(/\/foco$/);
    await expect(page.getByRole('button')).toHaveCount(1);

    // Segurar Enter por 3 s destrava: o app volta e a sessão continua.
    const hold = page.getByRole('button', { name: /Segurar para destravar/ });
    await hold.focus();
    await page.keyboard.down('Enter');
    await page.waitForTimeout(3400);
    await page.keyboard.up('Enter');
    await expect(sidebarCreate(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await expect(timer(page)).toHaveText(/^4[45]:\d\d$/);
  });

  test('soltar antes de 3 s não destrava', async ({ page }) => {
    page.on('dialog', (dialog) => void dialog.accept());
    await page.goto('/foco');
    await lockToggle(page).click();
    await play(page).click();
    const hold = page.getByRole('button', { name: /Segurar para destravar/ });
    await hold.focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(1000);
    await page.keyboard.up('Space');
    await expect(hold).toBeVisible();
    await expect(sidebarCreate(page)).toHaveCount(0);
  });

  test('ao terminar com a trava ligada, destrava sozinho e mostra “Concluído”', async ({
    page,
  }) => {
    await page.clock.install({ time: NOW });
    await page.goto('/foco');
    await setDuration(page, '1');
    await lockToggle(page).click();
    await play(page).click();
    await expect(page.getByRole('button')).toHaveCount(1);

    await page.clock.fastForward(61_000);
    await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
    await expect(sidebarCreate(page)).toBeVisible(); // destravou
  });

  test('o cadeado reflete e persiste a última escolha', async ({ page }) => {
    await page.goto('/foco');
    await lockToggle(page).click();
    await page.reload();
    await expect(lockToggle(page)).toHaveAttribute('aria-pressed', 'true');
  });
});
