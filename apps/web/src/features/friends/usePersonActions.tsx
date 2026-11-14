import { useState, type ReactNode } from 'react';
import { Ban, Flag, UserMinus } from 'lucide-react';
import type { MenuItem } from '../../components/ui/Menu';
import type { Friend, FriendRequest, Person } from '../../lib/social/friends-repository';
import { useFriends } from '../../lib/social/friends-store';
import { ConfirmDialog } from './ConfirmDialog';
import { ReportDialog } from './ReportDialog';

type Pending =
  | { kind: 'unfriend'; friend: Friend }
  | { kind: 'block'; person: Person; after?: () => void }
  | { kind: 'refuse'; request: FriendRequest }
  | { kind: 'report'; person: Person; after?: () => void };

/**
 * Ações com confirmação sobre uma pessoa (desfazer amizade, bloquear, recusar e denunciar) e o menu
 * “…” das listas e da busca. `after` avisa quem chamou (a busca tira a pessoa dos resultados).
 */
export function usePersonActions() {
  const [pending, setPending] = useState<Pending | null>(null);
  const unfriend = useFriends((s) => s.unfriend);
  const block = useFriends((s) => s.block);
  const refuse = useFriends((s) => s.refuse);
  const close = () => setPending(null);

  const menuFor = (
    person: Person,
    options: { friend?: Friend; after?: () => void } = {},
  ): MenuItem[] => {
    const items: MenuItem[] = [];
    const { friend, after } = options;
    if (friend) {
      items.push({
        label: 'Desfazer amizade',
        icon: UserMinus,
        onSelect: () => setPending({ kind: 'unfriend', friend }),
      });
    }
    items.push(
      {
        label: 'Bloquear',
        icon: Ban,
        onSelect: () => setPending({ kind: 'block', person, ...(after ? { after } : {}) }),
      },
      {
        label: 'Denunciar',
        icon: Flag,
        onSelect: () => setPending({ kind: 'report', person, ...(after ? { after } : {}) }),
      },
    );
    return items;
  };

  const askRefuse = (request: FriendRequest) => setPending({ kind: 'refuse', request });

  let dialog: ReactNode = null;
  if (pending?.kind === 'unfriend') {
    const { friend } = pending;
    dialog = (
      <ConfirmDialog
        title={`Desfazer amizade com @${friend.username}?`}
        description="Vocês deixam de ser amigos e de ver a foto um do outro. A outra pessoa não é avisada. Para voltar, é preciso um novo pedido."
        confirmLabel="Desfazer amizade"
        busyLabel="Desfazendo…"
        onClose={close}
        onConfirm={() => unfriend(friend)}
      />
    );
  } else if (pending?.kind === 'block') {
    const { person, after } = pending;
    dialog = (
      <ConfirmDialog
        title={`Bloquear @${person.username}?`}
        description="A pessoa não é avisada. Vocês somem um para o outro da busca e das listas, e a amizade e os pedidos entre vocês são desfeitos. Desbloquear depois não restaura a amizade."
        confirmLabel="Bloquear"
        busyLabel="Bloqueando…"
        onClose={close}
        onConfirm={async () => {
          await block(person);
          after?.();
        }}
      />
    );
  } else if (pending?.kind === 'refuse') {
    const { request } = pending;
    dialog = (
      <ConfirmDialog
        title={`Recusar o pedido de @${request.username}?`}
        description="A pessoa não é avisada. Ela só poderá pedir de novo daqui a 30 dias."
        confirmLabel="Recusar"
        busyLabel="Recusando…"
        onClose={close}
        onConfirm={() => refuse(request)}
      />
    );
  } else if (pending?.kind === 'report') {
    const { person, after } = pending;
    dialog = (
      <ReportDialog
        target={person}
        onClose={() => {
          close();
          // A pessoa pode ter sido bloqueada junto: quem chamou atualiza a sua lista.
          if (useFriends.getState().lists.blocked.some((b) => b.id === person.id)) after?.();
        }}
      />
    );
  }

  return { menuFor, askRefuse, dialog };
}
