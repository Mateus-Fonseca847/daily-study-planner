import { expect, test, type Page } from '@playwright/test';

/** O checkbox real é visualmente oculto (sr-only): marca-se pelo rótulo, como um usuário faria. */
async function lockOn(page: Page) {
  await page.getByText('Travar tela', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Travar tela' })).toBeChecked();
}

test.describe('Modo Foco', () => {
  test('ajusta o tempo, trava o app, bloqueia rotas e destrava segurando 3 s', async ({ page }) => {
    // O aviso do navegador ao recarregar com o app travado (beforeunload) é aceito.
    page.on('dialog', (dialog) => void dialog.accept());
    await page.goto('/foco');

    // Ajuste do tempo: teclado no anel (role="slider"), botões ±5 e atalhos.
    const ring = page.getByRole('slider', { name: 'Duração do foco' });
    await expect(ring).toHaveAttribute('aria-valuenow', '25');
    await ring.focus();
    await page.keyboard.press('ArrowRight');
    await expect(ring).toHaveAttribute('aria-valuetext', '26 minutos');
    await page.getByRole('button', { name: 'Aumentar 5 minutos' }).click();
    await expect(ring).toHaveAttribute('aria-valuenow', '31');
    await page.getByRole('button', { name: '45 min' }).click();
    await expect(ring).toHaveAttribute('aria-valuenow', '45');
    await expect(page.getByRole('timer')).toHaveText('45:00');

    // Trava + iniciar: sidebar e topo somem.
    await lockOn(page);
    await page.getByRole('button', { name: 'Iniciar' }).click();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Calendário/ })).toHaveCount(0);

    // Navegação interna bloqueada (voltar/avançar) e Esc nunca destrava.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/calendario');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/foco$/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /Segurar para destravar/ })).toBeVisible();

    // Rota digitada na URL volta para /foco, e o cronômetro e a trava foram restaurados.
    await page.goto('/calendario');
    await expect(page).toHaveURL(/\/foco$/);
    await expect(page.getByRole('timer')).toHaveText(/^4[45]:\d\d$/);
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toHaveCount(0);

    // Destravar segurando Enter por 3 s: o app volta e a sessão continua.
    const hold = page.getByRole('button', { name: /Segurar para destravar/ });
    await hold.focus();
    await page.keyboard.down('Enter');
    await page.waitForTimeout(3400);
    await page.keyboard.up('Enter');
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText(/^4[45]:\d\d$/);
  });

  test('soltar antes de 3 s não destrava', async ({ page }) => {
    page.on('dialog', (dialog) => void dialog.accept());
    await page.goto('/foco');
    await lockOn(page);
    await page.getByRole('button', { name: 'Iniciar' }).click();
    const hold = page.getByRole('button', { name: /Segurar para destravar/ });
    await hold.focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(1000);
    await page.keyboard.up('Space');
    await expect(hold).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toHaveCount(0);
  });

  test('pausa/retoma com Espaço e a sessão sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/foco');
    await page.getByRole('button', { name: 'Iniciar' }).click();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

    await page.locator('body').press('Space');
    await expect(page.getByRole('button', { name: 'Retomar' })).toBeVisible();
    const frozen = await page.getByRole('timer').innerText();
    await page.waitForTimeout(1200);
    await expect(page.getByRole('timer')).toHaveText(frozen); // pausado: não anda

    await page.reload();
    await expect(page.getByRole('button', { name: 'Retomar' })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText(frozen); // o restante foi mantido
  });

  test('ao terminar: resumo, título da aba, histórico salvo e destravamento', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-10T10:00:00') });
    await page.goto('/foco');
    await page.getByRole('slider', { name: 'Duração do foco' }).focus();
    await page.keyboard.press('Home'); // 1 minuto
    await lockOn(page);
    await page.getByRole('button', { name: 'Iniciar' }).click();
    await expect(page.getByRole('timer')).toHaveText('01:00');

    await page.clock.fastForward(61_000);
    await expect(page.getByRole('heading', { name: 'Você focou 1 min' })).toBeVisible();
    await expect(page).toHaveTitle('Sessão concluída');
    // Destravou sozinho: a navegação voltou.
    await expect(page.getByRole('button', { name: 'Criar', exact: true })).toBeVisible();

    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('daily:v2');
      return raw ? JSON.parse(raw).data.focusSessions : [];
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ status: 'concluida', plannedSec: 60, actualSec: 60 });

    await page.getByRole('button', { name: 'Nova sessão' }).click();
    await expect(page.getByRole('slider', { name: 'Duração do foco' })).toBeVisible();
  });

  test('encerrar com menos de 1 minuto descarta; depois de 1 minuto pede confirmação', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-11-10T10:00:00') });
    await page.goto('/foco');
    await page.getByRole('button', { name: 'Iniciar' }).click();
    await page.clock.fastForward(30_000);
    await page.getByRole('button', { name: 'Encerrar' }).click();
    await expect(page.getByRole('slider', { name: 'Duração do foco' })).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('daily:v2') ?? '{"data":{"focusSessions":[]}}').data
            .focusSessions,
      ),
    ).toHaveLength(0);

    await page.getByRole('button', { name: 'Iniciar' }).click();
    await page.clock.fastForward(5 * 60_000);
    await page.getByRole('button', { name: 'Encerrar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Encerrar a sessão?' });
    await expect(dialog).toContainText('interrompida');
    await dialog.getByRole('button', { name: 'Encerrar' }).click();
    await expect(page.getByRole('heading', { name: /Você focou 5 min/ })).toBeVisible();
  });
});
