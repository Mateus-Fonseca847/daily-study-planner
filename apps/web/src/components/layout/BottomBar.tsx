import { Ellipsis } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { NavCounts } from '../../lib/data/selectors';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { MENU_ITEMS, type NavItem } from './nav';

/** Os quatro destinos fixos da barra inferior; o resto fica em "Mais". */
const BAR_PATHS = ['/calendario', '/habitos', '/foco', '/estatisticas'] as const;
export const BAR_ITEMS: readonly NavItem[] = BAR_PATHS.map(
  (to) => MENU_ITEMS.find((item) => item.to === to) as NavItem,
);

const ITEM =
  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium transition-colors short:flex-row short:gap-2 short:text-xs';

interface BottomBarProps {
  counts: NavCounts;
  /** Algum destino de "Mais" é a página atual (destaca o botão). */
  moreActive: boolean;
  moreOpen: boolean;
  onMore: () => void;
}

/** Barra inferior do celular: Calendário, Hábitos, Foco, Estatísticas e "Mais". */
export function BottomBar({ counts, moreActive, moreOpen, onMore }: BottomBarProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex h-bottom-bar shrink-0 items-stretch border-t-hair bg-bg pr-safe-right pb-safe-bottom pl-safe-left box-content"
    >
      {BAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const count = item.counter ? counts[item.counter] : 0;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(ITEM, isActive ? 'text-accent' : 'text-soft')}
          >
            <span className="relative inline-flex">
              <Icon aria-hidden strokeWidth={1.5} className="size-icon" />
              {count > 0 && (
                <span className="absolute -top-2 left-full -ml-1.5">
                  <Badge variant="counter">{count}</Badge>
                </span>
              )}
            </span>
            <span className="truncate">{item.label === 'Modo Foco' ? 'Foco' : item.label}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        onClick={onMore}
        className={cn(ITEM, moreActive || moreOpen ? 'text-accent' : 'text-soft')}
      >
        <Ellipsis aria-hidden strokeWidth={1.5} className="size-icon" />
        <span className="truncate">Mais</span>
      </button>
    </nav>
  );
}
