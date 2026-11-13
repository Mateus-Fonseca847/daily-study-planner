import { Bell, Focus, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { AccountMenu } from '../../features/account/AccountMenu';
import { Button } from '../ui/Button';
import { OfflineBadge } from './OfflineBadge';
import { TypeFilter } from './TypeFilter';

export function Topbar() {
  const navigate = useNavigate();
  const onFocusPage = useLocation().pathname === '/foco';
  return (
    <header className="flex h-topbar shrink-0 items-center pt-3 justify-between border-b-hair px-page">
      <TypeFilter />
      <div className="flex items-center gap-2">
        <OfflineBadge />
        <Button variant="icon" aria-label="Buscar">
          <Search aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
        <Button variant="icon" aria-label="Notificações">
          <Bell aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
        <Button
          variant="outline"
          aria-current={onFocusPage ? 'page' : undefined}
          className={cn(onFocusPage && 'border-accent! text-accent!')}
          onClick={() => navigate('/foco')}
        >
          Modo Foco
          <Focus aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
        <AccountMenu />
      </div>
    </header>
  );
}
