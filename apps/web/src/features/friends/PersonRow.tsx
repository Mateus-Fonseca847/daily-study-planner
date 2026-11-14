import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { cn } from '../../lib/cn';
import { SocialAvatar } from '../social/SocialAvatar';

interface PersonRowProps {
  displayName: string;
  username: string;
  /** `blob:` da foto: só para amigos. Sem foto: as iniciais. */
  avatarUrl?: string | null;
  /** Texto curto depois do @ (ex.: “pedido de hoje”). */
  detail?: string;
  /** Ações visíveis (Aceitar, Recusar, Cancelar…). */
  children?: ReactNode;
  /** Menu “…” (Desfazer amizade, Bloquear, Denunciar). */
  menu?: readonly MenuItem[];
  /** No celular, as ações descem para a linha de baixo (várias ações: o nome continua legível). */
  stackOnPhone?: boolean;
}

/** Uma pessoa numa lista: foto ou iniciais, nome, @, ações e o menu “…”. */
export function PersonRow({
  displayName,
  username,
  avatarUrl,
  detail,
  children,
  menu,
  stackOnPhone = false,
}: PersonRowProps) {
  const name = displayName || username || 'Perfil indisponível';
  const handle = username ? `@${username}` : 'sem @';
  return (
    <li className="flex min-h-touch flex-wrap items-center gap-x-3 gap-y-2 border-b-hair py-3 last:border-b-0">
      <SocialAvatar url={avatarUrl ?? null} name={name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-md font-medium text-fg">{name}</p>
        <p className="truncate text-sm text-muted">
          {handle}
          {detail ? ` · ${detail}` : ''}
        </p>
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-2',
          stackOnPhone && 'phone:basis-full phone:justify-end',
        )}
      >
        {children}
        {menu && menu.length > 0 && (
          <Menu
            label={`Mais ações para ${handle}`}
            align="end"
            items={menu}
            trigger={(props) => (
              <button
                type="button"
                aria-label={`Mais ações para ${handle}`}
                className="inline-flex size-control-sm items-center justify-center rounded-full bg-surface text-soft hover:text-fg coarse:size-touch"
                {...props}
              >
                <MoreHorizontal aria-hidden strokeWidth={1.5} className="size-icon" />
              </button>
            )}
          />
        )}
      </div>
    </li>
  );
}
