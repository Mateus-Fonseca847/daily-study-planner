import { expect, test, type Page } from '@playwright/test';
import {
  fakeSupabase,
  initialState,
  profileRow,
  signIn,
  socialRequests,
  USER_ID,
} from './fake-supabase';

/** 15/11/2026, 10h. */
const NOW = new Date('2026-11-15T10:00:00');
const section = (page: Page) => page.locator('#perfil-social');
const wizard = (page: Page) => page.getByRole('dialog', { name: 'Ativar perfil social' });

/** Uma imagem PNG real (64×48) gerada no próprio navegador, para o seletor de foto. */
async function pngFile(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(40, 120, 200)';
    ctx.fillRect(0, 0, 64, 48);
    return c.toDataURL('image/png');
  });
  return Buffer.from(dataUrl.split(',')[1]!, 'base64');
}

async function fillBirth(page: Page, date: string) {
  await wizard(page).getByLabel('Data de nascimento').fill(date);
  await wizard(page).getByRole('button', { name: 'Continuar' }).click();
}

test.describe('Perfil social', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('ativação completa: nascimento, termo, @, nome, foto e revisão; recarregar mantém', async ({
    page,
  }) => {
    await signIn(page);
    const state = await fakeSupabase(page);
    await page.goto('/preferencias');
    await section(page).getByRole('button', { name: 'Ativar perfil social' }).click();

    await fillBirth(page, '2000-05-10');
    // Termo: o aceite é obrigatório e não vem marcado.
    const accept = wizard(page).getByRole('checkbox', { name: /Li e concordo/ });
    await expect(accept).not.toBeChecked();
    await expect(wizard(page).getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await accept.check({ force: true });
    await wizard(page).getByRole('button', { name: 'Continuar' }).click();

    // @: inválido, reservado, em uso e livre.
    const at = wizard(page).getByLabel('Seu @');
    await at.fill('a..b');
    await expect(wizard(page)).toContainText('Não use dois sinais seguidos');
    await at.fill('admin');
    await expect(wizard(page)).toContainText('Este @ é reservado');
    await at.fill('bia');
    await page.clock.runFor(600);
    await expect(wizard(page)).toContainText('Este @ já está em uso');
    await at.fill('@Ana.Lima');
    await page.clock.runFor(600);
    await expect(wizard(page)).toContainText('Disponível');
    await wizard(page).getByRole('button', { name: 'Continuar' }).click();

    // Nome: padrão da conta Google, editável.
    await expect(wizard(page).getByLabel('Nome de exibição')).toHaveValue('Ana Lima');
    await wizard(page).getByRole('button', { name: 'Continuar' }).click();

    // Foto (opcional): escolhe, ajusta e usa.
    await wizard(page)
      .getByLabel('Escolher foto')
      .setInputFiles({
        name: 'foto.png',
        mimeType: 'image/png',
        buffer: await pngFile(page),
      });
    const crop = page.getByRole('dialog', { name: 'Ajustar foto' });
    await crop.getByRole('img', { name: /Prévia da foto/ }).focus();
    await page.keyboard.press('ArrowRight');
    await crop.getByRole('button', { name: 'Usar esta foto' }).click();
    await expect(crop).toBeHidden();
    await wizard(page).getByRole('button', { name: 'Continuar' }).click();

    // Revisão.
    await expect(wizard(page)).toContainText('Só amigos que você aceitar veem sua foto.');
    await expect(wizard(page)).toContainText('@ana.lima');
    await wizard(page).getByRole('button', { name: 'Ativar perfil' }).click();
    await expect(wizard(page)).toBeHidden();

    expect(state.activateCalls).toEqual([
      expect.objectContaining({
        birth_date: '2000-05-10',
        chosen_username: 'ana.lima',
        chosen_display_name: 'Ana Lima',
        consent_version: 'perfil-social-2026-11b',
      }),
    ]);
    // A foto enviada é WebP (nunca o PNG original) e cabe no limite do servidor.
    expect(state.avatar?.subarray(8, 12).toString('ascii')).toBe('WEBP');
    expect(state.avatar!.length).toBeLessThanOrEqual(307_200);
    await expect(section(page)).toContainText('@ana.lima');
    await expect(section(page).locator('img[data-social-avatar]')).toBeVisible();

    await page.reload();
    await expect(section(page)).toContainText('@ana.lima');
    // Topbar e Perfil mostram a foto, do cache local.
    await page.goto('/perfil');
    await expect(page.getByText('@ana.lima')).toBeVisible();
    await expect(page.locator('header img[data-social-avatar]').first()).toBeVisible();
    expect(USER_ID).toBeTruthy();
  });

  test('menor de 14: mensagem gentil, assistente termina e nada é enviado', async ({ page }) => {
    await signIn(page);
    const state = await fakeSupabase(page);
    await page.goto('/preferencias');
    await section(page).getByRole('button', { name: 'Ativar perfil social' }).click();
    await fillBirth(page, '2012-11-16'); // 13 anos e 364 dias
    const blocked = page.getByRole('dialog', { name: 'Perfil social' });
    await expect(blocked).toContainText('disponível a partir dos 14 anos');
    await expect(blocked).toContainText('Nenhuma informação foi guardada');
    await blocked.getByRole('button', { name: 'Entendi' }).click();
    expect(state.activateCalls).toEqual([]);
    expect(socialRequests(state).filter((r) => r.includes('rpc/'))).toEqual([]);
  });

  test('sem login: convite para entrar, sem nenhuma requisição social', async ({ page }) => {
    const state = await fakeSupabase(page);
    await page.goto('/preferencias');
    await expect(section(page).getByRole('button', { name: 'Entrar com Google' })).toBeVisible();
    expect(socialRequests(state)).toEqual([]);
  });

  test('quem não abre a seção não faz nenhuma requisição social', async ({ page }) => {
    await signIn(page);
    const state = await fakeSupabase(page);
    for (const route of ['/calendario', '/tarefas', '/habitos', '/perfil']) {
      await page.goto(route);
      await page.waitForTimeout(400);
    }
    expect(socialRequests(state)).toEqual([]);
    await expect(page.getByRole('link', { name: 'Ativar perfil social' })).toBeVisible();
  });

  test('banco sem as tabelas: “ainda não disponível”, e o resto segue normal', async ({ page }) => {
    await signIn(page);
    await fakeSupabase(page, initialState({ migrated: false }));
    await page.goto('/preferencias');
    await expect(section(page)).toContainText('O perfil social ainda não está disponível');
    await expect(page.getByRole('heading', { name: 'Backup' })).toBeVisible();
  });

  test('falha de rede: mensagem clara e “Tentar de novo” carrega', async ({ page }) => {
    await signIn(page);
    // O cliente já tenta de novo sozinho algumas vezes: a rede fica fora até a mensagem aparecer.
    const state = await fakeSupabase(
      page,
      initialState({ failNextLoads: 99, profile: profileRow() }),
    );
    await page.goto('/preferencias');
    await expect(section(page)).toContainText('Não foi possível falar com o servidor', {
      timeout: 20_000,
    });
    state.failNextLoads = 0;
    await section(page).getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(section(page)).toContainText('@ana.lima');
  });

  test('gerenciar: nome, @ (troca limitada), foto, desativar e excluir com confirmação', async ({
    page,
  }) => {
    await signIn(page);
    const state = await fakeSupabase(
      page,
      initialState({ profile: profileRow(), birthMonth: '2000-05-01' }),
    );
    await page.goto('/preferencias');
    const s = section(page);
    await expect(s).toContainText('@ana.lima');

    await s.getByLabel('Nome de exibição').fill('Ana L.');
    await s.getByRole('button', { name: 'Salvar nome' }).click();
    await expect(s).toContainText('Ana L.');
    expect(state.profile?.display_name).toBe('Ana L.');

    await s.getByLabel('@', { exact: true }).fill('ana.nova');
    await page.clock.runFor(600);
    await expect(s).toContainText('Disponível');
    await s.getByRole('button', { name: 'Trocar @' }).click();
    await expect(s).toContainText('@ana.nova');
    await expect(s).toContainText('Próxima troca a partir de');
    await expect(s.getByRole('button', { name: 'Trocar @' })).toBeDisabled();

    // Foto: envia e remove (o arquivo some do Storage).
    await s.getByLabel('Escolher foto').setInputFiles({
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: await pngFile(page),
    });
    await page
      .getByRole('dialog', { name: 'Ajustar foto' })
      .getByRole('button', { name: 'Usar esta foto' })
      .click();
    await expect(s.locator('img[data-social-avatar]')).toBeVisible();
    expect(state.avatar).not.toBeNull();
    await s.getByRole('button', { name: 'Remover foto' }).click();
    await expect(s.locator('img[data-social-avatar]')).toHaveCount(0);
    expect(state.avatar).toBeNull();

    // Desativar e reativar (com novo aceite).
    await s.getByRole('button', { name: 'Desativar perfil social' }).click();
    await expect(s).toContainText('Desativado');
    await s.getByRole('button', { name: 'Reativar perfil social' }).click();
    const again = page.getByRole('dialog', { name: 'Reativar perfil social' });
    await expect(again.getByRole('button', { name: 'Reativar' })).toBeDisabled();
    await again.getByRole('checkbox', { name: /Li e concordo/ }).check({ force: true });
    await again.getByRole('button', { name: 'Reativar' }).click();
    await expect(s).toContainText('Só amigos que você aceitar veem sua foto.');

    // Excluir: só com o @ digitado.
    await s.getByRole('button', { name: 'Excluir perfil social' }).click();
    const del = page.getByRole('dialog', { name: 'Excluir perfil social?' });
    const confirm = del.getByRole('button', { name: 'Excluir para sempre' });
    await expect(confirm).toBeDisabled();
    await del.getByLabel('Digite @ana.nova para confirmar').fill('ana.nova');
    await confirm.click();
    await expect(s.getByRole('button', { name: 'Ativar perfil social' })).toBeVisible();
    await expect.poll(() => state.profile).toBeNull();
    await page.goto('/perfil');
    await expect(page.getByRole('link', { name: 'Ativar perfil social' })).toBeVisible();
  });

  test('celular: o assistente ocupa a tela; tema claro com o mesmo fluxo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light' });
    await signIn(page);
    await fakeSupabase(page);
    await page.goto('/preferencias');
    await section(page).getByRole('button', { name: 'Ativar perfil social' }).click();
    const box = await wizard(page).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(380);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  });
});
