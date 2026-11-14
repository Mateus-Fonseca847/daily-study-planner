import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '../auth/auth-store';
import { SOCIAL_MESSAGES, SocialError, toSocialError } from './errors';
import { COUNTER_INTERVAL_MS, startCounterPolling } from './friend-counter';
import {
  createFriendsRepository,
  type FriendRequest,
  type FriendsLists,
  type FriendsRepository,
} from './friends-repository';
import {
  afterAccept,
  afterBlock,
  afterCancel,
  afterRefuse,
  afterSend,
  afterUnblock,
  afterUnfriend,
  EMPTY_LISTS,
  relationAfterSend,
} from './friends-state';
import {
  friendsActive,
  resetFriends,
  setFriendsRepositoryFactory,
  useFriends,
} from './friends-store';
import { useSocial } from './social-store';

const bia = { id: 'b', username: 'bia', displayName: 'Bia' };
const caio = { id: 'c', username: 'caio', displayName: 'Caio' };
const reqFrom = (p: typeof bia, requestId: number): FriendRequest => ({
  ...p,
  requestId,
  createdAt: '2026-11-15T10:00:00Z',
});
const friend = (p: typeof bia) => ({ ...p, hasAvatar: false, avatarVersion: 0, since: '' });

const lists = (patch: Partial<FriendsLists> = {}): FriendsLists => ({ ...EMPTY_LISTS, ...patch });

describe('máquina de estados das amizades', () => {
  it('aceitar: sai das recebidas e entra nos amigos (uma vez só)', () => {
    const l = lists({ incoming: [reqFrom(bia, 1)] });
    const next = afterAccept(l, reqFrom(bia, 1));
    expect(next.incoming).toEqual([]);
    expect(next.friends.map((f) => f.username)).toEqual(['bia']);
    expect(afterAccept(next, reqFrom(bia, 1)).friends).toHaveLength(1);
  });

  it('recusar e cancelar só tiram o pedido', () => {
    expect(afterRefuse(lists({ incoming: [reqFrom(bia, 1)] }), reqFrom(bia, 1)).incoming).toEqual(
      [],
    );
    const sent = lists({ outgoing: [reqFrom(caio, 2)] });
    const next = afterCancel(sent, reqFrom(caio, 2));
    expect(next.outgoing).toEqual([]);
    expect(next.friends).toEqual([]);
  });

  it('enviar: pendente; envio cruzado vira amizade', () => {
    expect(afterSend(EMPTY_LISTS, bia, 'ok').outgoing.map((r) => r.id)).toEqual(['b']);
    expect(afterSend(afterSend(EMPTY_LISTS, bia, 'ok'), bia, 'ok').outgoing).toHaveLength(1);
    const cross = afterSend(lists({ incoming: [reqFrom(bia, 1)] }), bia, 'aceita');
    expect(cross.incoming).toEqual([]);
    expect(cross.friends.map((f) => f.id)).toEqual(['b']);
    expect(relationAfterSend('ok')).toBe('enviada');
    expect(relationAfterSend('aceita')).toBe('amigos');
  });

  it('desfazer amizade', () => {
    expect(afterUnfriend(lists({ friends: [friend(bia)] }), 'b').friends).toEqual([]);
  });

  it('bloquear some de tudo nos dois sentidos; desbloquear não devolve a amizade', () => {
    const l = lists({
      friends: [friend(bia)],
      incoming: [reqFrom(bia, 1)],
      outgoing: [reqFrom(bia, 2), reqFrom(caio, 3)],
    });
    const blocked = afterBlock(l, bia);
    expect(blocked.friends).toEqual([]);
    expect(blocked.incoming).toEqual([]);
    expect(blocked.outgoing.map((r) => r.id)).toEqual(['c']);
    expect(blocked.blocked.map((b) => b.username)).toEqual(['bia']);
    const unblocked = afterUnblock(blocked, 'b');
    expect(unblocked.blocked).toEqual([]);
    expect(unblocked.friends).toEqual([]);
  });
});

describe('mensagens: o que não pode vazar dá a mesma resposta', () => {
  it('não encontrado é genérico (inexistência, idade, bloqueio, suspensão)', () => {
    expect(SOCIAL_MESSAGES.nao_encontrado).toBe('Não foi possível encontrar esta pessoa.');
    expect(SOCIAL_MESSAGES.nao_encontrado).not.toMatch(/idade|bloque|menor|suspens|existe/i);
    expect(SOCIAL_MESSAGES.limite_amigos_outro).not.toMatch(/200|limite/i);
  });

  it('limites explicados em linguagem simples', () => {
    expect(SOCIAL_MESSAGES.limite_diario).toBe(
      'Você atingiu o limite de pedidos de hoje. Tente de novo amanhã.',
    );
    expect(SOCIAL_MESSAGES.limite_pendentes).toMatch(/20 pedidos/);
  });

  it('função ausente no banco (migração do Prompt 16 não aplicada) = indisponível', () => {
    expect(toSocialError({ code: 'PGRST202', message: 'Could not find the function' }).kind).toBe(
      'indisponivel',
    );
  });
});

/** Cliente Supabase falso: só `rpc` e o Storage de links assinados. */
function fakeClient(responses: Record<string, unknown>) {
  const calls: { fn: string; args: unknown }[] = [];
  const client = {
    rpc: vi.fn(async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return { data: responses[fn], error: null };
    }),
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((p) => ({ path: p, signedUrl: `https://x.test/${p}?t=1`, error: null })),
          error: null,
        }),
      }),
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('repositório das amizades', () => {
  it('busca: id, @, nome e relação; status ≠ ok vira erro em pt-BR', async () => {
    const { client, calls } = fakeClient({
      social_buscar_perfis: {
        status: 'ok',
        itens: [{ id: 'b', username: 'bia', nome: 'Bia', relacao: 'recebida' }],
      },
    });
    const repo = createFriendsRepository(client);
    expect(await repo.search('bia')).toEqual([
      { id: 'b', username: 'bia', displayName: 'Bia', relation: 'recebida' },
    ]);
    expect(calls[0]).toEqual({ fn: 'social_buscar_perfis', args: { termo: 'bia' } });

    const limited = createFriendsRepository(
      fakeClient({ social_buscar_perfis: { status: 'limite', itens: [] } }).client,
    );
    await expect(limited.search('bia')).rejects.toThrow(SOCIAL_MESSAGES.limite);
  });

  it('enviar: ok, aceita (cruzado) ou erro', async () => {
    expect(
      await createFriendsRepository(fakeClient({ social_enviar_solicitacao: 'ok' }).client).send(
        'b',
      ),
    ).toBe('ok');
    expect(
      await createFriendsRepository(
        fakeClient({ social_enviar_solicitacao: 'aceita' }).client,
      ).send('b'),
    ).toBe('aceita');
    await expect(
      createFriendsRepository(
        fakeClient({ social_enviar_solicitacao: 'nao_encontrado' }).client,
      ).send('b'),
    ).rejects.toMatchObject({ kind: 'nao_encontrado' });
  });

  it('denúncia: detalhe vazio vai como nulo', async () => {
    const { client, calls } = fakeClient({ social_denunciar: 'ok' });
    await createFriendsRepository(client).report('b', {
      reason: 'assedio',
      detail: '   ',
      alsoBlock: true,
    });
    expect(calls[0]!.args).toEqual({
      pessoa: 'b',
      motivo: 'assedio',
      detalhe: null,
      bloquear: true,
    });
  });

  it('listas: amigos, recebidas, enviadas e bloqueados (retrato)', async () => {
    const { client } = fakeClient({
      social_listar_amigos: {
        status: 'ok',
        itens: [
          { id: 'b', username: 'bia', nome: 'Bia', tem_foto: true, versao_foto: 2, desde: 'd' },
        ],
      },
      social_listar_solicitacoes: {
        status: 'ok',
        recebidas: [{ id: 7, pessoa: 'c', username: 'caio', nome: 'Caio', criada: 'x' }],
        enviadas: [],
      },
      social_listar_bloqueados: {
        status: 'ok',
        itens: [{ id: 'z', username: null, nome: null, desde: 'y' }],
      },
    });
    const l = await createFriendsRepository(client).lists();
    expect(l.friends[0]).toMatchObject({ id: 'b', hasAvatar: true, avatarVersion: 2 });
    expect(l.incoming[0]).toMatchObject({ id: 'c', requestId: 7, username: 'caio' });
    expect(l.blocked[0]).toEqual({ id: 'z', username: null, displayName: null, since: 'y' });
  });

  it('contador: sem perfil ou desativado conta 0', async () => {
    const repo = (status: string, total = 3) =>
      createFriendsRepository(
        fakeClient({ social_contar_solicitacoes_recebidas: { status, total } }).client,
      );
    expect(await repo('ok').countIncoming()).toBe(3);
    expect(await repo('sem_perfil').countIncoming()).toBe(0);
    expect(await repo('desativado').countIncoming()).toBe(0);
  });
});

describe('contador de pedidos: polling só com a aba visível', () => {
  function env(initial: DocumentVisibilityState = 'visible') {
    const listeners: Record<string, (() => void)[]> = {};
    const on = (type: string, fn: () => void) => {
      (listeners[type] ??= []).push(fn);
    };
    const off = (type: string, fn: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
    };
    const doc = { visibilityState: initial, addEventListener: on, removeEventListener: off };
    const win = {
      addEventListener: on,
      removeEventListener: off,
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms) as unknown as number,
      clearInterval: (id: number) => clearInterval(id),
    };
    const fire = (type: string) => (listeners[type] ?? []).forEach((f) => f());
    return { doc, win, fire };
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('busca ao abrir, a cada 60 s visível, e para quando a aba fica oculta', () => {
    const { doc, win, fire } = env();
    const fetchCount = vi.fn(async () => {});
    const polling = startCounterPolling({
      fetchCount,
      isActive: () => true,
      doc: doc as never,
      win: win as never,
      now: () => Date.now(),
    });
    expect(fetchCount).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(COUNTER_INTERVAL_MS);
    expect(fetchCount).toHaveBeenCalledTimes(2);

    doc.visibilityState = 'hidden';
    fire('visibilitychange');
    vi.advanceTimersByTime(COUNTER_INTERVAL_MS * 5);
    expect(fetchCount).toHaveBeenCalledTimes(2);

    doc.visibilityState = 'visible';
    fire('visibilitychange');
    fire('focus'); // foco junto com visibilidade: uma busca só
    expect(fetchCount).toHaveBeenCalledTimes(3);
    polling.stop();
    vi.advanceTimersByTime(COUNTER_INTERVAL_MS * 3);
    expect(fetchCount).toHaveBeenCalledTimes(3);
  });

  it('aba oculta ao abrir ou social inativo: nenhuma requisição', () => {
    const hidden = env('hidden');
    const fetchCount = vi.fn(async () => {});
    startCounterPolling({
      fetchCount,
      isActive: () => true,
      doc: hidden.doc as never,
      win: hidden.win as never,
    }).stop();
    const visible = env();
    const polling = startCounterPolling({
      fetchCount,
      isActive: () => false,
      doc: visible.doc as never,
      win: visible.win as never,
    });
    vi.advanceTimersByTime(COUNTER_INTERVAL_MS * 3);
    visible.fire('focus');
    expect(fetchCount).not.toHaveBeenCalled();
    polling.stop();
  });

  it('voltar o foco busca de novo (fora do intervalo mínimo)', () => {
    const { doc, win, fire } = env();
    const fetchCount = vi.fn(async () => {});
    const polling = startCounterPolling({
      fetchCount,
      isActive: () => true,
      doc: doc as never,
      win: win as never,
      now: () => Date.now(),
    });
    vi.advanceTimersByTime(10_000);
    fire('focus');
    expect(fetchCount).toHaveBeenCalledTimes(2);
    polling.stop();
  });
});

function fakeFriendsRepo(patch: Partial<FriendsRepository> = {}) {
  const base: FriendsRepository = {
    search: vi.fn(async () => []),
    send: vi.fn(async () => 'ok' as const),
    respond: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    unfriend: vi.fn(async () => {}),
    block: vi.fn(async () => {}),
    unblock: vi.fn(async () => {}),
    report: vi.fn(async () => {}),
    countIncoming: vi.fn(async () => 4),
    lists: vi.fn(async () =>
      lists({ friends: [{ ...friend(bia), hasAvatar: true }], incoming: [reqFrom(caio, 9)] }),
    ),
    friendAvatars: vi.fn(async () => new Map([['b', new Blob(['x'])]])),
  };
  return { ...base, ...patch } as FriendsRepository;
}

describe('store das amizades (memória, otimista)', () => {
  let revoked: string[];
  beforeEach(() => {
    revoked = [];
    let n = 0;
    globalThis.URL.createObjectURL = () => `blob:amigo-${++n}`;
    globalThis.URL.revokeObjectURL = (url: string) => {
      revoked.push(url);
    };
    useAuth.setState({
      status: 'signed-in',
      user: { id: 'u1', email: 'ana@x', name: 'Ana', avatarUrl: null },
    } as never);
    resetFriends();
  });

  it('carrega listas, contador e fotos (blob, só de amigos)', async () => {
    setFriendsRepositoryFactory(() => fakeFriendsRepo());
    await useFriends.getState().load();
    const s = useFriends.getState();
    expect(s.phase).toBe('ready');
    expect(s.incomingCount).toBe(1);
    expect(s.avatars).toEqual({ b: 'blob:amigo-1' });
  });

  it('aceitar é otimista; se o servidor recusa, volta e mostra a mensagem', async () => {
    const respond = vi.fn(async () => {
      throw new SocialError('limite_amigos');
    });
    setFriendsRepositoryFactory(() => fakeFriendsRepo({ respond }));
    await useFriends.getState().load();
    const request = useFriends.getState().lists.incoming[0]!;
    const pending = useFriends.getState().accept(request);
    expect(useFriends.getState().lists.incoming).toEqual([]);
    expect(useFriends.getState().incomingCount).toBe(0);
    await expect(pending).rejects.toThrow(SOCIAL_MESSAGES.limite_amigos);
    expect(useFriends.getState().lists.incoming).toEqual([request]);
    expect(useFriends.getState().incomingCount).toBe(1);
  });

  it('bloquear é otimista e, com sucesso, fica', async () => {
    setFriendsRepositoryFactory(() => fakeFriendsRepo());
    await useFriends.getState().load();
    await useFriends.getState().block(bia);
    expect(useFriends.getState().lists.friends).toEqual([]);
    expect(useFriends.getState().lists.blocked.map((b) => b.id)).toEqual(['b']);
  });

  it('denunciar com “bloquear também” bloqueia; erro de limite não muda nada', async () => {
    setFriendsRepositoryFactory(() => fakeFriendsRepo());
    await useFriends.getState().load();
    await useFriends.getState().report(bia, { reason: 'outro', detail: '', alsoBlock: true });
    expect(useFriends.getState().lists.blocked.map((b) => b.id)).toEqual(['b']);

    setFriendsRepositoryFactory(() =>
      fakeFriendsRepo({
        report: vi.fn(async () => {
          throw new SocialError('limite');
        }),
      }),
    );
    const before = useFriends.getState().lists;
    await expect(
      useFriends.getState().report(caio, { reason: 'outro', detail: '', alsoBlock: true }),
    ).rejects.toThrow(SOCIAL_MESSAGES.limite);
    expect(useFriends.getState().lists).toBe(before);
  });

  it('sair da conta: tudo some da memória e as fotos são liberadas', async () => {
    setFriendsRepositoryFactory(() => fakeFriendsRepo());
    await useFriends.getState().load();
    resetFriends();
    const s = useFriends.getState();
    expect(s.lists).toEqual(EMPTY_LISTS);
    expect(s.avatars).toEqual({});
    expect(s.incomingCount).toBe(0);
    expect(s.phase).toBe('idle');
    expect(revoked).toContain('blob:amigo-1');
  });

  it('nada de outras pessoas vai para o localStorage', async () => {
    const written: string[] = [];
    const storage = {
      getItem: () => null,
      setItem: (k: string, v: string) => written.push(`${k}=${v}`),
      removeItem: () => {},
    };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage });
    setFriendsRepositoryFactory(() => fakeFriendsRepo());
    await useFriends.getState().load();
    await useFriends.getState().refreshCount();
    await useFriends.getState().block(bia);
    expect(written.join('|')).not.toMatch(/bia|caio/);
    vi.unstubAllGlobals();
  });

  it('ativo só logado e com perfil social ativo neste aparelho', () => {
    useSocial.setState({ cached: null });
    expect(friendsActive()).toBe(false);
    const cached = {
      username: 'ana',
      displayName: 'Ana',
      avatarVersion: 0,
      hasAvatar: false,
      disabled: false,
    };
    useSocial.setState({ cached });
    expect(friendsActive()).toBe(true);
    useSocial.setState({ cached: { ...cached, disabled: true } });
    expect(friendsActive()).toBe(false);
    useSocial.setState({ cached });
    useAuth.setState({ status: 'visitor' } as never);
    expect(friendsActive()).toBe(false);
  });
});
