import { expect, test, type Page } from '@playwright/test';
import {
  BIA,
  CAIO,
  DUDA,
  fakeSupabase,
  friendsCalls,
  friendsState,
  initialState,
  profileRow,
  rememberProfile,
  signIn,
  socialRequests,
  type FakeState,
} from './fake-supabase';

/** 15/11/2026, 10h. */
const NOW = new Date('2026-11-15T10:00:00');
const searchDialog = (page: Page) => page.getByRole('dialog', { name: 'Buscar pessoas' });

/** Uma imagem WebP mínima válida (1×1), como a foto de um amigo. */
const WEBP = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');

/** Logado, com perfil social ativo (e já aberto antes neste aparelho, se `remembered`). */
async function setup(page: Page, patch: Partial<FakeState> = {}, remembered = true) {
  await signIn(page);
  if (remembered) await rememberProfile(page);
  return fakeSupabase(
    page,
    initialState({
      profile: profileRow({ discoverable: true }),
      birthMonth: '2000-05-01',
      ...patch,
    }),
  );
}

async function openSearch(page: Page) {
  await page.getByRole('button', { name: 'Buscar pessoas' }).first().click();
  await expect(searchDialog(page)).toBeVisible();
}

async function typeSearch(page: Page, text: string) {
  await searchDialog(page).getByLabel('Buscar pelo @').fill(text);
  await page.clock.runFor(500);
}

test.describe('Amizades', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('busca: menos de 3 caracteres não consulta; buscar, adicionar e ver pendente', async ({
    page,
  }) => {
    const state = await setup(page);
    await page.goto('/calendario');
    await openSearch(page);

    await typeSearch(page, 'bi');
    await expect(searchDialog(page)).toContainText('Digite pelo menos 3 caracteres do @.');
    expect(friendsCalls(state).filter((r) => r.includes('buscar'))).toEqual([]);

    await typeSearch(page, '@Bia');
    const results = searchDialog(page).getByRole('list', { name: 'Resultados da busca' });
    await expect(results).toContainText('Bia Souza');
    await expect(results).toContainText('@bia');
    // Sem foto antes da amizade: só as iniciais.
    await expect(results.locator('img')).toHaveCount(0);

    await results.getByRole('button', { name: 'Adicionar @bia' }).click();
    await expect(results).toContainText('Pendente');
    expect(state.friends.outgoing.map((r) => r.to)).toEqual([BIA.id]);

    await page.keyboard.press('Escape');
    await page.goto('/amigos');
    await page.getByRole('tab', { name: /Solicitações/ }).click();
    await expect(page.getByRole('list', { name: 'Pedidos enviados' })).toContainText('@bia');
  });

  test('aceitar um pedido recebido: vira amizade, com a foto do amigo', async ({ page }) => {
    const state = await setup(page, {
      friends: friendsState({
        people: [{ ...BIA, avatar: WEBP }, CAIO, DUDA],
        incoming: [{ id: 7, from: BIA.id }],
      }),
    });
    await page.goto('/amigos');
    await page.getByRole('tab', { name: 'Solicitações (1)' }).click();
    await page.getByRole('button', { name: 'Aceitar o pedido de @bia' }).click();
    await expect(page.getByText('Agora você e @bia são amigos')).toBeVisible();
    expect(state.friends.friends).toEqual([BIA.id]);

    await page.getByRole('tab', { name: 'Amigos (1)' }).click();
    const friends = page.getByRole('list', { name: 'Amigos' });
    await expect(friends).toContainText('Bia Souza');
    // A foto chega por link assinado e aparece por blob:.
    await page.reload();
    await expect(page.getByRole('list', { name: 'Amigos' }).locator('img')).toHaveAttribute(
      'src',
      /^blob:/,
    );
  });

  test('recusar pede confirmação e a pessoa não é avisada', async ({ page }) => {
    const state = await setup(page, {
      friends: friendsState({ incoming: [{ id: 8, from: CAIO.id }] }),
    });
    await page.goto('/amigos');
    await page.getByRole('tab', { name: /Solicitações/ }).click();
    await page.getByRole('button', { name: 'Recusar o pedido de @caio' }).click();
    const confirm = page.getByRole('dialog', { name: 'Recusar o pedido de @caio?' });
    await expect(confirm).toContainText('não é avisada');
    await confirm.getByRole('button', { name: 'Recusar' }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText('Nenhum pedido recebido.')).toBeVisible();
    expect(state.friends.incoming).toEqual([]);
    expect(state.friends.friends).toEqual([]);
  });

  test('cancelar com “Desfazer” e reenviar', async ({ page }) => {
    const state = await setup(page, {
      friends: friendsState({ outgoing: [{ id: 9, to: DUDA.id }] }),
    });
    await page.goto('/amigos');
    await page.getByRole('tab', { name: /Solicitações/ }).click();
    await page.getByRole('button', { name: 'Cancelar o pedido para @duda' }).click();
    await expect(page.getByText('Nenhum pedido aguardando resposta.')).toBeVisible();
    expect(state.friends.outgoing).toEqual([]);
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(() => state.friends.outgoing.map((r) => r.to)).toEqual([DUDA.id]);
    await expect(page.getByRole('list', { name: 'Pedidos enviados' })).toContainText('@duda');
  });

  test('desfazer amizade com confirmação', async ({ page }) => {
    const state = await setup(page, { friends: friendsState({ friends: [BIA.id] }) });
    await page.goto('/amigos');
    await page.getByRole('button', { name: 'Mais ações para @bia' }).click();
    await page.getByRole('menuitem', { name: 'Desfazer amizade' }).click();
    await page
      .getByRole('dialog', { name: 'Desfazer amizade com @bia?' })
      .getByRole('button', { name: 'Desfazer amizade' })
      .click();
    await expect(page.getByText('Nenhum amigo ainda')).toBeVisible();
    expect(state.friends.friends).toEqual([]);
  });

  test('bloquear some de tudo; desbloquear não devolve a amizade', async ({ page }) => {
    const state = await setup(page, {
      friends: friendsState({ friends: [BIA.id], incoming: [{ id: 3, from: BIA.id }] }),
    });
    await page.goto('/amigos');
    await page.getByRole('button', { name: 'Mais ações para @bia' }).click();
    await page.getByRole('menuitem', { name: 'Bloquear' }).click();
    const confirm = page.getByRole('dialog', { name: 'Bloquear @bia?' });
    await expect(confirm).toContainText('não é avisada');
    await confirm.getByRole('button', { name: 'Bloquear' }).click();
    await expect(page.getByText('Nenhum amigo ainda')).toBeVisible();
    expect(state.friends.blocked.map((b) => b.id)).toEqual([BIA.id]);

    // Some da busca.
    await openSearch(page);
    await typeSearch(page, 'bia');
    await expect(searchDialog(page)).toContainText('Ninguém encontrado com “bia”.');
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: 'Bloqueados' }).click();
    await page.getByRole('button', { name: 'Desbloquear @bia' }).click();
    await expect(page.getByText('Ninguém bloqueado')).toBeVisible();
    expect(state.friends.blocked).toEqual([]);
    await page.getByRole('tab', { name: /Amigos/ }).click();
    await expect(page.getByText('Nenhum amigo ainda')).toBeVisible();
  });

  test('denunciar pela busca com “Bloquear também” e o limite de denúncias', async ({ page }) => {
    const state = await setup(page);
    await page.goto('/amigos');
    await openSearch(page);
    await typeSearch(page, 'caio');
    await searchDialog(page).getByRole('button', { name: 'Mais ações para @caio' }).click();
    await page.getByRole('menuitem', { name: 'Denunciar' }).click();

    const form = page.getByRole('dialog', { name: 'Denunciar @caio' });
    const send = form.getByRole('button', { name: 'Enviar denúncia' });
    await expect(send).toBeDisabled();
    await form.getByLabel('Assédio ou ameaça').check();
    await form.getByLabel('Detalhes (opcional)').fill('Mensagens ofensivas');
    await expect(form.getByRole('checkbox', { name: 'Bloquear também' })).toBeChecked();
    await send.click();
    await expect(page.getByText('Denúncia enviada.', { exact: false })).toBeVisible();
    expect(state.friends.reports).toEqual([
      { pessoa: CAIO.id, motivo: 'assedio', detalhe: 'Mensagens ofensivas', bloquear: true },
    ]);
    // Bloqueada junto: some dos resultados.
    await expect(searchDialog(page).getByRole('list', { name: 'Resultados da busca' })).toHaveCount(
      0,
    );

    // Limite do dia: mensagem clara.
    state.friends.reportsLeft = 0;
    await typeSearch(page, 'duda');
    await searchDialog(page).getByRole('button', { name: 'Mais ações para @duda' }).click();
    await page.getByRole('menuitem', { name: 'Denunciar' }).click();
    const again = page.getByRole('dialog', { name: 'Denunciar @duda' });
    await again.getByLabel('Outro').check();
    await again.getByRole('button', { name: 'Enviar denúncia' }).click();
    await expect(again).toContainText('Você atingiu o limite de 5 denúncias por dia.');
  });

  test('limite de pedidos do dia: mensagem clara e volta a “Adicionar”', async ({ page }) => {
    const state = await setup(page, { friends: friendsState({ sendsLeft: 0 }) });
    await page.goto('/calendario');
    await openSearch(page);
    await typeSearch(page, 'bia');
    await searchDialog(page).getByRole('button', { name: 'Adicionar @bia' }).click();
    await expect(searchDialog(page)).toContainText(
      'Você atingiu o limite de pedidos de hoje. Tente de novo amanhã.',
    );
    await expect(searchDialog(page).getByRole('button', { name: 'Adicionar @bia' })).toBeVisible();
    expect(state.friends.outgoing).toEqual([]);
  });

  test('contador de pedidos recebidos: distintivo na navegação e atualização a cada 60 s', async ({
    page,
  }) => {
    const state = await setup(page, {
      friends: friendsState({ incoming: [{ id: 1, from: BIA.id }] }),
    });
    await page.goto('/calendario');
    const amigos = page.getByRole('link', { name: /Amigos/ });
    await expect(amigos).toContainText('1');
    await expect(amigos.getByText('1 solicitação recebida')).toBeAttached();

    state.friends.incoming.push({ id: 2, from: CAIO.id });
    await page.clock.runFor(61_000);
    await expect(amigos.getByText('2 solicitações recebidas')).toBeAttached();
  });

  test('sem perfil social: convite para ativar e nenhuma chamada de amizades', async ({ page }) => {
    await signIn(page);
    const state = await fakeSupabase(page);
    for (const route of ['/calendario', '/tarefas', '/perfil']) {
      await page.goto(route);
    }
    await page.clock.runFor(120_000);
    expect(socialRequests(state)).toEqual([]);

    await openSearch(page);
    await expect(searchDialog(page)).toContainText('Ative seu perfil social');
    await page.keyboard.press('Escape');
    await page.goto('/amigos');
    await expect(page.getByRole('button', { name: 'Ativar perfil social' })).toBeVisible();
    expect(friendsCalls(state)).toEqual([]);
  });

  test('migração das amizades não aplicada: “ainda não disponível”', async ({ page }) => {
    await setup(page, { friends: friendsState({ migrated: false }) });
    await page.goto('/amigos');
    await expect(page.getByText('Ainda não disponível')).toBeVisible();
    // O resto do app segue normal.
    await page.getByRole('link', { name: 'Calendário' }).click();
    await expect(page).toHaveURL(/calendario/);
  });

  test('offline: aviso claro', async ({ page, context }) => {
    await setup(page, { friends: friendsState({ friends: [BIA.id] }) });
    await page.goto('/amigos');
    await expect(page.getByRole('list', { name: 'Amigos' })).toContainText('Bia Souza');
    await context.setOffline(true);
    await expect(
      page.getByText('Sem conexão: amigos exigem internet.', { exact: false }),
    ).toBeVisible();
    await context.setOffline(false);
  });

  test('sair da conta: listas, contador e fotos somem', async ({ page }) => {
    await setup(page, {
      friends: friendsState({ friends: [BIA.id], incoming: [{ id: 4, from: CAIO.id }] }),
    });
    await page.goto('/amigos');
    await expect(page.getByRole('list', { name: 'Amigos' })).toContainText('Bia Souza');
    await page.getByRole('button', { name: /^Conta de / }).click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();
    await expect(page.getByText('Você saiu da conta')).toBeVisible();
    await expect(page.getByText('Bia Souza')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Amigos/ })).not.toContainText('1');
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).not.toMatch(/bia|caio/i);
  });

  test('celular: “Mais” com o distintivo, página e busca em tela cheia (tema claro)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light' });
    await setup(page, { friends: friendsState({ incoming: [{ id: 5, from: BIA.id }] }) });
    await page.goto('/calendario');
    const more = page.getByRole('button', { name: /Mais/ });
    await expect(more.getByText('1 solicitação recebida')).toBeAttached();
    await more.click();
    await page.getByRole('link', { name: /Amigos/ }).click();
    await expect(page.getByRole('tab', { name: 'Solicitações (1)' })).toBeVisible();
    await page.getByRole('button', { name: 'Buscar pessoas' }).first().click();
    const box = await searchDialog(page).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(380);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  });

  test('tablet: página de amigos com as abas', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await setup(page, { friends: friendsState({ friends: [BIA.id] }) });
    await page.goto('/amigos');
    await expect(page.getByRole('tablist', { name: 'Amigos e pedidos' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Amigos' })).toContainText('Bia Souza');
  });
});
