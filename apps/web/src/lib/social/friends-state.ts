import type { Relation } from '@daily/shared';
import type {
  BlockedPerson,
  Friend,
  FriendRequest,
  FriendsLists,
  Person,
  SendResult,
} from './friends-repository';

/**
 * Máquina de estados das amizades, pura: como as listas e a relação com alguém mudam a cada ação.
 * O store aplica isto ANTES de o servidor responder (otimista) e volta ao estado anterior se o
 * servidor recusar. As regras de verdade estão no banco.
 */

export const EMPTY_LISTS: FriendsLists = { friends: [], incoming: [], outgoing: [], blocked: [] };

const byName = (a: Person, b: Person) =>
  a.displayName.localeCompare(b.displayName, 'pt-BR') || a.username.localeCompare(b.username);

const asFriend = (p: Person): Friend => ({
  id: p.id,
  username: p.username,
  displayName: p.displayName,
  hasAvatar: false,
  avatarVersion: 0,
  since: new Date().toISOString(),
});

/** Aceitar um pedido recebido: sai das recebidas e entra nos amigos. */
export function afterAccept(lists: FriendsLists, request: FriendRequest): FriendsLists {
  return {
    ...lists,
    incoming: lists.incoming.filter((r) => r.requestId !== request.requestId),
    outgoing: lists.outgoing.filter((r) => r.id !== request.id),
    friends: lists.friends.some((f) => f.id === request.id)
      ? lists.friends
      : [...lists.friends, asFriend(request)].sort(byName),
  };
}

/** Recusar: some das recebidas (quem enviou não fica sabendo). */
export function afterRefuse(lists: FriendsLists, request: FriendRequest): FriendsLists {
  return { ...lists, incoming: lists.incoming.filter((r) => r.requestId !== request.requestId) };
}

/** Cancelar um pedido enviado. */
export function afterCancel(lists: FriendsLists, request: FriendRequest): FriendsLists {
  return { ...lists, outgoing: lists.outgoing.filter((r) => r.requestId !== request.requestId) };
}

/** Desfazer a amizade (some para os dois lados). */
export function afterUnfriend(lists: FriendsLists, friendId: string): FriendsLists {
  return { ...lists, friends: lists.friends.filter((f) => f.id !== friendId) };
}

/** Enviar: pedido novo nas enviadas, ou amizade (envio cruzado aceita o pedido dela). */
export function afterSend(lists: FriendsLists, to: Person, result: SendResult): FriendsLists {
  if (result === 'aceita') {
    const incoming = lists.incoming.find((r) => r.id === to.id);
    return afterAccept(lists, incoming ?? { ...to, requestId: -1, createdAt: '' });
  }
  if (lists.outgoing.some((r) => r.id === to.id)) return lists;
  return {
    ...lists,
    outgoing: [{ ...to, requestId: -1, createdAt: new Date().toISOString() }, ...lists.outgoing],
  };
}

/** Bloquear: some de amigos e pedidos (nos dois sentidos) e entra nos bloqueados. */
export function afterBlock(lists: FriendsLists, target: Person): FriendsLists {
  const blocked: BlockedPerson = {
    id: target.id,
    username: target.username || null,
    displayName: target.displayName || null,
    since: new Date().toISOString(),
  };
  return {
    friends: lists.friends.filter((f) => f.id !== target.id),
    incoming: lists.incoming.filter((r) => r.id !== target.id),
    outgoing: lists.outgoing.filter((r) => r.id !== target.id),
    blocked: lists.blocked.some((b) => b.id === target.id)
      ? lists.blocked
      : [blocked, ...lists.blocked],
  };
}

/** Desbloquear não restaura amizade nem pedidos. */
export function afterUnblock(lists: FriendsLists, personId: string): FriendsLists {
  return { ...lists, blocked: lists.blocked.filter((b) => b.id !== personId) };
}

/** A relação mostrada na busca depois de enviar. */
export const relationAfterSend = (result: SendResult): Relation =>
  result === 'aceita' ? 'amigos' : 'enviada';

/** Rótulo da ação na busca para cada relação. */
export const RELATION_ACTION: Record<Relation, string> = {
  nenhuma: 'Adicionar',
  enviada: 'Pendente',
  recebida: 'Aceitar',
  amigos: 'Amigos',
};
