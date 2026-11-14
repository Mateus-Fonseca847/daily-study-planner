import { create } from 'zustand';
import type { ReportReason } from '@daily/shared';
import { useAuth } from '../auth/auth-store';
import { getSupabase } from '../cloud/client';
import { SocialError, toSocialError } from './errors';
import { startCounterPolling, type CounterPolling } from './friend-counter';
import {
  createFriendsRepository,
  type BlockedPerson,
  type Friend,
  type FriendRequest,
  type FriendsLists,
  type FriendsRepository,
  type Person,
  type SearchResult,
  type SendResult,
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
} from './friends-state';
import { useSocial } from './social-store';

/**
 * Amizades em MEMÓRIA (nada de outras pessoas vai para o `localStorage` nem para o IndexedDB):
 * listas, fotos dos amigos (`blob:`) e o número de pedidos recebidos. Tudo some ao sair da conta
 * ou trocar de usuário. As ações são otimistas: a tela muda na hora e volta se o servidor recusar.
 */
export type FriendsPhase = 'idle' | 'loading' | 'ready' | 'erro' | 'indisponivel';

interface FriendsState {
  phase: FriendsPhase;
  lists: FriendsLists;
  error: SocialError | null;
  /** `blob:` da foto de cada amigo que tem foto (só amigos). */
  avatars: Record<string, string>;
  /** Pedidos recebidos, para o distintivo da navegação. */
  incomingCount: number;
  load(): Promise<void>;
  refreshCount(): Promise<void>;
  search(term: string): Promise<SearchResult[]>;
  send(to: Person): Promise<SendResult>;
  accept(request: FriendRequest): Promise<void>;
  refuse(request: FriendRequest): Promise<void>;
  cancel(request: FriendRequest): Promise<void>;
  unfriend(friend: Friend): Promise<void>;
  block(target: Person): Promise<void>;
  unblock(target: BlockedPerson): Promise<void>;
  report(
    target: Person,
    input: { reason: ReportReason; detail: string; alsoBlock: boolean },
  ): Promise<void>;
}

/** Fábrica injetável (os testes trocam o repositório). */
export let friendsRepositoryFor = (): FriendsRepository | null => {
  if (useAuth.getState().status !== 'signed-in') return null;
  const client = getSupabase();
  return client ? createFriendsRepository(client) : null;
};
export const setFriendsRepositoryFactory = (factory: typeof friendsRepositoryFor) => {
  friendsRepositoryFor = factory;
};

const repo = (): FriendsRepository => {
  const r = friendsRepositoryFor();
  if (!r) throw new SocialError('sem_login');
  return r;
};

let objectUrls: string[] = [];
const revokeAll = () => {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];
};

const INITIAL = {
  phase: 'idle' as FriendsPhase,
  lists: EMPTY_LISTS,
  error: null,
  avatars: {},
  incomingCount: 0,
};

/** O recurso não existe no banco (migração do Prompt 16 não aplicada): o contador para. */
let unavailable = false;

export const useFriends = create<FriendsState>()((set, get) => {
  /** Aplica a mudança na hora e chama o servidor; se ele recusar, volta e relança em pt-BR. */
  const optimistic = async (
    next: (lists: FriendsLists) => FriendsLists,
    run: (r: FriendsRepository) => Promise<void>,
  ) => {
    const r = repo();
    const before = get().lists;
    const after = next(before);
    set({ lists: after, incomingCount: after.incoming.length });
    try {
      await run(r);
    } catch (error) {
      set({ lists: before, incomingCount: before.incoming.length });
      throw toSocialError(error);
    }
  };

  const loadAvatars = async (r: FriendsRepository, friends: Friend[]) => {
    const ids = friends.filter((f) => f.hasAvatar).map((f) => f.id);
    const blobs = await r.friendAvatars(ids).catch(() => new Map<string, Blob>());
    revokeAll();
    const avatars: Record<string, string> = {};
    for (const [id, blob] of blobs) {
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      avatars[id] = url;
    }
    set({ avatars });
  };

  return {
    ...INITIAL,

    async load() {
      if (get().phase === 'loading') return;
      set({ phase: 'loading', error: null });
      try {
        const r = repo();
        const lists = await r.lists();
        unavailable = false;
        set({ lists, phase: 'ready', incomingCount: lists.incoming.length });
        await loadAvatars(r, lists.friends);
      } catch (error) {
        const err = toSocialError(error);
        if (err.kind === 'indisponivel') unavailable = true;
        set({ phase: err.kind === 'indisponivel' ? 'indisponivel' : 'erro', error: err });
      }
    },

    async refreshCount() {
      try {
        set({ incomingCount: await repo().countIncoming() });
      } catch (error) {
        if (toSocialError(error).kind === 'indisponivel') unavailable = true;
      }
    },

    search: (term) => repo().search(term),

    async send(to) {
      const result = await repo()
        .send(to.id)
        .catch((error: unknown) => {
          throw toSocialError(error);
        });
      const lists = afterSend(get().lists, to, result);
      set({ lists, incomingCount: lists.incoming.length });
      return result;
    },

    accept: (request) =>
      optimistic(
        (l) => afterAccept(l, request),
        (r) => r.respond(request.requestId, true),
      ),
    refuse: (request) =>
      optimistic(
        (l) => afterRefuse(l, request),
        (r) => r.respond(request.requestId, false),
      ),
    cancel: (request) =>
      optimistic(
        (l) => afterCancel(l, request),
        (r) => r.cancel(request.requestId),
      ),
    unfriend: (friend) =>
      optimistic(
        (l) => afterUnfriend(l, friend.id),
        (r) => r.unfriend(friend.id),
      ),
    block: (target) =>
      optimistic(
        (l) => afterBlock(l, target),
        (r) => r.block(target.id),
      ),
    unblock: (target) =>
      optimistic(
        (l) => afterUnblock(l, target.id),
        (r) => r.unblock(target.id),
      ),
    async report(target, input) {
      try {
        await repo().report(target.id, input);
      } catch (error) {
        throw toSocialError(error);
      }
      if (input.alsoBlock) {
        const lists = afterBlock(get().lists, target);
        set({ lists, incomingCount: lists.incoming.length });
      }
    },
  };
});

/** Esquece tudo (sair da conta, trocar de usuário): listas, fotos e contador. */
export function resetFriends(): void {
  revokeAll();
  unavailable = false;
  useFriends.setState({ ...INITIAL, lists: EMPTY_LISTS, avatars: {} });
}

/** Logado, com perfil social ativo (pelo cache deste aparelho) e o recurso disponível. */
export function friendsActive(): boolean {
  if (unavailable || useAuth.getState().status !== 'signed-in') return false;
  const cached = useSocial.getState().cached;
  return cached !== null && !cached.disabled;
}

/** Liga o contador de pedidos recebidos e a limpeza ao trocar de usuário. */
export function startFriends(): () => void {
  const currentUser = () => {
    const auth = useAuth.getState();
    return auth.status === 'signed-in' ? auth.user.id : null;
  };
  let lastUser = currentUser();
  const polling: CounterPolling = startCounterPolling({
    fetchCount: () => useFriends.getState().refreshCount(),
    isActive: friendsActive,
    doc: document,
    win: window,
  });
  const onChange = () => {
    const id = currentUser();
    if (id !== lastUser) {
      lastUser = id;
      resetFriends();
    }
    if (!friendsActive()) useFriends.setState({ incomingCount: 0 });
    polling.refresh();
  };
  const offAuth = useAuth.subscribe(onChange);
  const offSocial = useSocial.subscribe((s, prev) => {
    if (s.cached !== prev.cached) onChange();
  });
  return () => {
    offAuth();
    offSocial();
    polling.stop();
  };
}
