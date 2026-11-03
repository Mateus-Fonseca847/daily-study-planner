import { LogIn, LogOut, Settings } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { PHASE_LABEL } from '../../features/account/SyncStatusLabel';
import { useSignOut } from '../../features/account/useSignOut';
import { useAuth } from '../../lib/auth/auth-store';
import type { NavCounts } from '../../lib/data/selectors';
import { cn } from '../../lib/cn';
import { useSync } from '../../lib/sync/sync-store';
import { BottomSheet } from '../ui/BottomSheet';
import { Badge } from '../ui/Badge';
import { BAR_ITEMS } from './BottomBar';
import { InstallButton } from './InstallButton';
import { InstallHelp } from './InstallHelp';
import { MENU_ITEMS, SETTINGS_ITEMS, type NavItem } from './nav';

const ROW =
  'flex h-touch w-full items-center gap-3 rounded-md px-3 text-left text-md active:bg-hover';

/** Itens que não cabem na barra inferior (Provas, Tarefas, Matérias, Blocos) e os de configuração. */
export const MORE_ITEMS: readonly NavItem[] = MENU_ITEMS.filter(
  (item) => !BAR_ITEMS.some((bar) => bar.to === item.to),
);
const PREFERENCES = SETTINGS_ITEMS.find((item) => item.to === '/preferencias') as NavItem;
const HELP_ITEMS = SETTINGS_ITEMS.filter((item) => item !== PREFERENCES);

interface MoreSheetProps {
  counts: NavCounts;
  onClose: () => void;
}

function NavRow({ item, counts }: { item: NavItem; counts: NavCounts }) {
  const Icon = item.icon;
  const count = item.counter ? counts[item.counter] : 0;
  return (
    <NavLink
      to={item.to}
      replace
      className={({ isActive }) => cn(ROW, isActive ? 'bg-hover text-accent' : 'text-fg')}
    >
      <Icon aria-hidden strokeWidth={1.5} className="size-icon shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {count > 0 && <Badge variant="counter">{count}</Badge>}
    </NavLink>
  );
}

/** "Mais" da barra inferior: demais páginas, conta, instalar o app e ajuda. */
export function MoreSheet({ counts, onClose }: MoreSheetProps) {
  const auth = useAuth();
  const phase = useSync((s) => s.phase);
  const navigate = useNavigate();
  const { signOut, dialog } = useSignOut();

  // Navegar troca a entrada de histórico do sheet (`replace`), então ele só precisa fechar.
  const go = (to: string) => {
    onClose();
    navigate(to, { replace: true });
  };

  return (
    <BottomSheet title="Mais" onClose={onClose}>
      <nav aria-label="Mais páginas" className="flex flex-col gap-1">
        {MORE_ITEMS.map((item) => (
          <NavRow key={item.to} item={item} counts={counts} />
        ))}
        <NavRow item={PREFERENCES} counts={counts} />
      </nav>

      {(auth.status === 'visitor' || auth.status === 'signed-in') && (
        <section aria-label="Conta" className="mt-3 flex flex-col gap-1 border-t-hair pt-3">
          {auth.status === 'visitor' ? (
            <button type="button" className={cn(ROW, 'text-fg')} onClick={() => go('/entrar')}>
              <LogIn aria-hidden strokeWidth={1.5} className="size-icon" />
              Entrar para sincronizar
            </button>
          ) : (
            <>
              <p className="px-3 text-sm text-muted">
                {auth.user.email || auth.user.name} · {PHASE_LABEL[phase]}
              </p>
              <button
                type="button"
                className={cn(ROW, 'text-fg')}
                onClick={() => go('/preferencias')}
              >
                <Settings aria-hidden strokeWidth={1.5} className="size-icon" />
                Conta e sincronização
              </button>
              <button
                type="button"
                className={cn(ROW, 'text-fg')}
                onClick={() => {
                  onClose();
                  signOut();
                }}
              >
                <LogOut aria-hidden strokeWidth={1.5} className="size-icon" />
                Sair
              </button>
            </>
          )}
        </section>
      )}

      <section aria-label="Aplicativo" className="mt-3 flex flex-col gap-2 border-t-hair pt-3">
        <InstallButton className="w-full" />
        <InstallHelp />
      </section>

      <nav aria-label="Ajuda" className="mt-3 flex flex-col gap-1 border-t-hair pt-3">
        {HELP_ITEMS.map((item) => (
          <NavRow key={item.to} item={item} counts={counts} />
        ))}
      </nav>
      {dialog}
    </BottomSheet>
  );
}
