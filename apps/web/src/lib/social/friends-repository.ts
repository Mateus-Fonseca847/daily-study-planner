import type { SupabaseClient } from '@supabase/supabase-js';
import type { Relation, ReportReason } from '@daily/shared';
import { ensureOk, SocialError } from './errors';
import { AVATAR_BUCKET, avatarPathOf, call } from './repository';

/**
 * Amizades sobre o Supabase. Tudo passa pelas funções `social_*` (o cliente não lê nem escreve
 * as tabelas): elas checam `auth.uid()`, os limites e as regras de idade e bloqueio. Os dados de
 * outras pessoas ficam só em memória (nunca no `localStorage` nem no IndexedDB).
 */

/** Alguém visto pelo app: id, @ e nome (sem foto nem idade). */
export interface Person {
  id: string;
  username: string;
  displayName: string;
}

export interface SearchResult extends Person {
  relation: Relation;
}

export interface Friend extends Person {
  hasAvatar: boolean;
  avatarVersion: number;
  since: string;
}

export interface FriendRequest extends Person {
  /** Id do pedido (para aceitar, recusar ou cancelar). */
  requestId: number;
  createdAt: string;
}

export interface BlockedPerson {
  id: string;
  /** Retrato do momento do bloqueio (`null` se a pessoa não tinha perfil). */
  username: string | null;
  displayName: string | null;
  since: string;
}

export interface FriendsLists {
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  blocked: BlockedPerson[];
}

/** Resultado de enviar: `ok` (pedido pendente) ou `aceita` (havia um pedido dela: amizade). */
export type SendResult = 'ok' | 'aceita';

type Row = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const person = (r: Row): Person => ({
  id: text(r.pessoa) || text(r.id),
  username: text(r.username),
  displayName: text(r.nome),
});

const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

/** Listas devolvem `{status, ...}`: status diferente de `ok` vira erro (`suspenso` só onde vale). */
function body(value: unknown, allowSuspended = false): Row {
  const data = (value ?? {}) as Row;
  if (data.status === 'ok' || (allowSuspended && data.status === 'suspenso')) return data;
  ensureOk(data.status);
  return data;
}

const toRequest = (r: Row): FriendRequest => ({
  ...person(r),
  requestId: Number(r.id),
  createdAt: text(r.criada),
});

/** Validade dos links assinados das fotos de amigos. */
export const SIGNED_URL_SECONDS = 120;

export function createFriendsRepository(client: SupabaseClient) {
  const rpc = (fn: string, args: Row = {}) => call(() => client.rpc(fn, args));

  return {
    async search(term: string): Promise<SearchResult[]> {
      const data = body(await rpc('social_buscar_perfis', { termo: term }));
      return rows(data.itens).map((r) => ({
        ...person(r),
        relation: (text(r.relacao) || 'nenhuma') as Relation,
      }));
    },

    async send(to: string): Promise<SendResult> {
      const status = await rpc('social_enviar_solicitacao', { para: to });
      if (status === 'aceita') return 'aceita';
      ensureOk(status);
      return 'ok';
    },

    async respond(requestId: number, accept: boolean): Promise<void> {
      ensureOk(await rpc('social_responder_solicitacao', { pedido: requestId, aceitar: accept }));
    },

    async cancel(requestId: number): Promise<void> {
      ensureOk(await rpc('social_cancelar_solicitacao', { pedido: requestId }));
    },

    async unfriend(friendId: string): Promise<void> {
      ensureOk(await rpc('social_desfazer_amizade', { amigo: friendId }));
    },

    async block(personId: string): Promise<void> {
      ensureOk(await rpc('social_bloquear', { pessoa: personId }));
    },

    async unblock(personId: string): Promise<void> {
      ensureOk(await rpc('social_desbloquear', { pessoa: personId }));
    },

    async report(
      personId: string,
      input: { reason: ReportReason; detail: string; alsoBlock: boolean },
    ): Promise<void> {
      ensureOk(
        await rpc('social_denunciar', {
          pessoa: personId,
          motivo: input.reason,
          detalhe: input.detail.trim() || null,
          bloquear: input.alsoBlock,
        }),
      );
    },

    /** Pedidos recebidos. Sem perfil, desativado ou suspenso: 0 (não é erro para o distintivo). */
    async countIncoming(): Promise<number> {
      const data = ((await rpc('social_contar_solicitacoes_recebidas')) ?? {}) as Row;
      if (data.status === 'ok') return Number(data.total) || 0;
      if (data.status === 'limite') throw new SocialError('limite');
      return 0;
    },

    async lists(): Promise<FriendsLists> {
      const [friendsBody, requestsBody, blockedBody] = await Promise.all([
        rpc('social_listar_amigos'),
        rpc('social_listar_solicitacoes'),
        rpc('social_listar_bloqueados'),
      ]);
      const friends = rows(body(friendsBody, true).itens).map((r) => ({
        ...person(r),
        hasAvatar: r.tem_foto === true,
        avatarVersion: Number(r.versao_foto) || 0,
        since: text(r.desde),
      }));
      const requests = body(requestsBody, true);
      const blocked = rows(body(blockedBody).itens).map((r) => ({
        id: text(r.id),
        username: text(r.username) || null,
        displayName: text(r.nome) || null,
        since: text(r.desde),
      }));
      return {
        friends,
        incoming: rows(requests.recebidas).map(toRequest),
        outgoing: rows(requests.enviadas).map(toRequest),
        blocked,
      };
    },

    /**
     * Fotos dos amigos: links assinados de curta duração (a política do Storage só os emite para
     * amigos), baixados sem cache HTTP e mostrados por `blob:`. Nada vai para o disco.
     */
    async friendAvatars(friendIds: string[]): Promise<Map<string, Blob>> {
      const result = new Map<string, Blob>();
      if (friendIds.length === 0) return result;
      const signed = await call(() =>
        client.storage
          .from(AVATAR_BUCKET)
          .createSignedUrls(friendIds.map(avatarPathOf), SIGNED_URL_SECONDS),
      );
      await Promise.all(
        (signed ?? []).map(async (item, index) => {
          const id = friendIds[index];
          if (!id || item.error || !item.signedUrl) return;
          try {
            const res = await fetch(item.signedUrl, {
              cache: 'no-store',
              credentials: 'omit',
              referrerPolicy: 'no-referrer',
            });
            if (res.ok) result.set(id, await res.blob());
          } catch {
            /* sem a foto: as iniciais aparecem */
          }
        }),
      );
      return result;
    },
  };
}

export type FriendsRepository = ReturnType<typeof createFriendsRepository>;
