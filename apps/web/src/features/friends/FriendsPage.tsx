import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Search, ShieldOff, TriangleAlert, UsersRound } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tabs } from '../../components/ui/Tabs';
import type { FriendRequest } from '../../lib/social/friends-repository';
import { useFriends } from '../../lib/social/friends-store';
import { EMPTY_LISTS } from '../../lib/social/friends-state';
import { useToasts } from '../../lib/toast-store';
import { friendlyError, FriendsGate, useFriendsGate } from './FriendsGate';
import { PersonRow } from './PersonRow';
import { SearchDialog } from './SearchDialog';
import { usePersonActions } from './usePersonActions';

type Tab = 'amigos' | 'solicitacoes' | 'bloqueados';

const toast = (message: string, undo?: () => void) =>
  useToasts
    .getState()
    .push(undo ? { message, actionLabel: 'Desfazer', onAction: undo } : { message });

/** Erro de uma ação em linha (a lista já voltou ao estado anterior). */
const failed = (e: unknown) => toast(friendlyError(e));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-md font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function FriendsContent({ onSearch }: { onSearch: () => void }) {
  const [tab, setTab] = useState<Tab>('amigos');
  const phase = useFriends((s) => s.phase);
  const lists = useFriends((s) => s.lists);
  const avatars = useFriends((s) => s.avatars);
  const error = useFriends((s) => s.error);
  const load = useFriends((s) => s.load);
  const accept = useFriends((s) => s.accept);
  const cancel = useFriends((s) => s.cancel);
  const send = useFriends((s) => s.send);
  const block = useFriends((s) => s.block);
  const unblock = useFriends((s) => s.unblock);
  const { menuFor, askRefuse, dialog } = usePersonActions();

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === 'idle' || (phase === 'loading' && lists === EMPTY_LISTS)) {
    return (
      <p role="status" className="inline-flex items-center gap-2 text-md text-muted">
        <Loader2 aria-hidden strokeWidth={1.5} className="size-icon motion-safe:animate-spin" />
        Carregando amigos…
      </p>
    );
  }
  if (phase === 'indisponivel') {
    return (
      <EmptyState
        icon={UsersRound}
        title="Ainda não disponível"
        description="Amigos ainda não estão disponíveis. O resto do Daily funciona normalmente."
      />
    );
  }
  if (phase === 'erro') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Não foi possível carregar"
        description={friendlyError(error)}
      >
        <Button variant="secondary" onClick={() => void load()}>
          Tentar de novo
        </Button>
      </EmptyState>
    );
  }

  const incoming = lists.incoming.length;
  const tabs = [
    { value: 'amigos' as const, label: 'Amigos' },
    {
      value: 'solicitacoes' as const,
      label: incoming > 0 ? `Solicitações (${incoming})` : 'Solicitações',
    },
    { value: 'bloqueados' as const, label: 'Bloqueados' },
  ];

  const cancelWithUndo = (request: FriendRequest) =>
    cancel(request)
      .then(() =>
        toast(`Pedido para @${request.username} cancelado`, () => {
          send(request).catch(failed);
        }),
      )
      .catch(failed);

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} aria-label="Amigos e pedidos" fillOnPhone>
        {tab === 'amigos' &&
          (lists.friends.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Nenhum amigo ainda"
              description="Busque alguém pelo @ e envie um pedido. Quando a pessoa aceitar, ela aparece aqui."
            >
              <Button onClick={onSearch}>Buscar pessoas</Button>
            </EmptyState>
          ) : (
            <>
              <p className="text-sm text-muted">
                {lists.friends.length === 1 ? '1 amigo' : `${lists.friends.length} amigos`}
              </p>
              <ul aria-label="Amigos" className="flex flex-col">
                {lists.friends.map((f) => (
                  <PersonRow
                    key={f.id}
                    displayName={f.displayName}
                    username={f.username}
                    avatarUrl={avatars[f.id] ?? null}
                    menu={menuFor(f, { friend: f })}
                  />
                ))}
              </ul>
            </>
          ))}

        {tab === 'solicitacoes' && (
          <div className="flex flex-col gap-6">
            <Section title="Recebidas">
              {lists.incoming.length === 0 ? (
                <p className="text-md text-muted">Nenhum pedido recebido.</p>
              ) : (
                <ul aria-label="Pedidos recebidos" className="flex flex-col">
                  {lists.incoming.map((r) => (
                    <PersonRow
                      key={r.requestId}
                      displayName={r.displayName}
                      username={r.username}
                      menu={menuFor(r)}
                      stackOnPhone
                    >
                      <Button
                        aria-label={`Aceitar o pedido de @${r.username}`}
                        onClick={() =>
                          accept(r)
                            .then(() => toast(`Agora você e @${r.username} são amigos`))
                            .catch(failed)
                        }
                      >
                        Aceitar
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`Recusar o pedido de @${r.username}`}
                        onClick={() => askRefuse(r)}
                      >
                        Recusar
                      </Button>
                    </PersonRow>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Enviadas">
              {lists.outgoing.length === 0 ? (
                <p className="text-md text-muted">Nenhum pedido aguardando resposta.</p>
              ) : (
                <ul aria-label="Pedidos enviados" className="flex flex-col">
                  {lists.outgoing.map((r) => (
                    <PersonRow
                      key={`${r.id}-${r.requestId}`}
                      displayName={r.displayName}
                      username={r.username}
                      detail="pendente"
                    >
                      <Button
                        variant="secondary"
                        aria-label={`Cancelar o pedido para @${r.username}`}
                        onClick={() => void cancelWithUndo(r)}
                      >
                        Cancelar
                      </Button>
                    </PersonRow>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}

        {tab === 'bloqueados' &&
          (lists.blocked.length === 0 ? (
            <EmptyState
              icon={ShieldOff}
              title="Ninguém bloqueado"
              description="Quem você bloquear não te encontra na busca nem te envia pedidos, e não fica sabendo do bloqueio."
            />
          ) : (
            <ul aria-label="Bloqueados" className="flex flex-col">
              {lists.blocked.map((b) => (
                <PersonRow key={b.id} displayName={b.displayName ?? ''} username={b.username ?? ''}>
                  <Button
                    variant="secondary"
                    aria-label={`Desbloquear @${b.username ?? 'perfil indisponível'}`}
                    onClick={() =>
                      unblock(b)
                        .then(() =>
                          toast(`@${b.username ?? 'perfil'} desbloqueado`, () => {
                            block({
                              id: b.id,
                              username: b.username ?? '',
                              displayName: b.displayName ?? '',
                            }).catch(failed);
                          }),
                        )
                        .catch(failed)
                    }
                  >
                    Desbloquear
                  </Button>
                </PersonRow>
              ))}
            </ul>
          ))}
      </Tabs>
      {dialog}
    </>
  );
}

/** Página `/amigos`: amigos, pedidos (recebidos e enviados) e bloqueados. */
export function FriendsPage() {
  const [searching, setSearching] = useState(false);
  const gate = useFriendsGate();
  return (
    <PageShell
      title="Amigos"
      description="Pessoas com quem você se conectou. Só amigos veem a sua foto."
      actions={
        gate === 'ok' ? (
          <Button variant="secondary" onClick={() => setSearching(true)} className="phone:w-full">
            <Search aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            Buscar pessoas
          </Button>
        ) : undefined
      }
    >
      <FriendsGate>
        <FriendsContent onSearch={() => setSearching(true)} />
      </FriendsGate>
      {searching && (
        <SearchDialog
          onClose={() => {
            setSearching(false);
            // Pedidos feitos na busca ganham o id do servidor (para poder cancelar).
            void useFriends.getState().load();
          }}
        />
      )}
    </PageShell>
  );
}
