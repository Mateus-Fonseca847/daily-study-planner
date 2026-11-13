import { LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/auth-store';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { MENU_ITEMS, SETTINGS_ITEMS } from './nav';
import { OfflineBadge } from './OfflineBadge';
import { TypeFilter } from './TypeFilter';

/** Título da tela, a partir do item de menu da rota atual. */
function usePageTitle(): string {
  const { pathname } = useLocation();
  const item = [...MENU_ITEMS, ...SETTINGS_ITEMS].find((i) => i.to === pathname);
  return item?.label ?? 'Daily';
}

function AccountButton() {
  const auth = useAuth();
  const navigate = useNavigate();
  if (auth.status === 'visitor') {
    return (
      <Button variant="icon" size="sm" aria-label="Entrar" onClick={() => navigate('/entrar')}>
        <LogIn aria-hidden strokeWidth={1.5} className="size-icon" />
      </Button>
    );
  }
  if (auth.status === 'signed-in') {
    const { user } = auth;
    return (
      <Button
        variant="icon"
        size="sm"
        aria-label={`Conta de ${user.email || user.name}`}
        onClick={() => navigate('/preferencias')}
      >
        <Avatar name={user.name || user.email} />
      </Button>
    );
  }
  return null;
}

/** Topbar compacta do celular: título da tela, filtro por tipo (em sheet), offline e conta. */
export function PhoneTopbar() {
  const title = usePageTitle();
  return (
    <header className="shrink-0 border-b-hair bg-bg pt-safe-top">
      <div className="flex h-topbar-compact items-center gap-2 px-4">
        <h1 className="min-w-0 flex-1 truncate text-title font-semibold tracking-tight">{title}</h1>
        <OfflineBadge />
        <TypeFilter compact />
        <AccountButton />
      </div>
    </header>
  );
}
