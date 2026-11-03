import type { SubjectColor } from '@daily/shared';
import { ListFilter, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/auth-store';
import { useData } from '../../lib/data/app-store';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { SubjectDot } from '../ui/SubjectDot';
import { MENU_ITEMS, SETTINGS_ITEMS } from './nav';
import { OfflineBadge } from './OfflineBadge';

interface FilterOption {
  id: string;
  name: string;
  color?: SubjectColor;
}

const ALL: FilterOption = { id: 'all', name: 'Todas as matérias' };

interface PhoneTopbarProps {
  subjectId: string;
  onSubjectChange: (id: string) => void;
}

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

/** Topbar compacta do celular: título da tela, filtro por matéria (em sheet), offline e conta. */
export function PhoneTopbar({ subjectId, onSubjectChange }: PhoneTopbarProps) {
  const title = usePageTitle();
  const subjects = useData((s) => s.subjects);
  const [open, setOpen] = useState(false);
  const options: FilterOption[] = [ALL, ...subjects];
  const filtered = subjectId !== 'all';

  return (
    <header className="shrink-0 border-b-hair bg-bg pt-safe-top">
      <div className="flex h-topbar-compact items-center gap-2 px-4">
        <h1 className="min-w-0 flex-1 truncate text-title font-semibold tracking-tight">{title}</h1>
        <OfflineBadge />
        <span className="relative inline-flex">
          <Button
            variant="icon"
            size="sm"
            aria-label={filtered ? 'Filtrar por matéria (filtro ativo)' : 'Filtrar por matéria'}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <ListFilter aria-hidden strokeWidth={1.5} className="size-icon" />
          </Button>
          {filtered && (
            <span aria-hidden className="absolute top-1 right-1 size-dot rounded-full bg-accent" />
          )}
        </span>
        <AccountButton />
      </div>
      {open && (
        <BottomSheet title="Filtrar por matéria" onClose={() => setOpen(false)}>
          <ul role="radiogroup" aria-label="Matéria" className="flex flex-col gap-1">
            {options.map((option) => {
              const checked = option.id === subjectId;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => {
                      onSubjectChange(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex h-touch w-full items-center gap-3 rounded-md px-3 text-left text-md active:bg-hover',
                      checked ? 'bg-hover text-accent' : 'text-fg',
                    )}
                  >
                    {option.color ? (
                      <SubjectDot color={option.color} />
                    ) : (
                      <span aria-hidden className="size-dot" />
                    )}
                    {option.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </BottomSheet>
      )}
    </header>
  );
}
