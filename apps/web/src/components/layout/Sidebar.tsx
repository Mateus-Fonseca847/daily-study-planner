import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { NavCounts } from '../../lib/data/selectors';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { MENU_ITEMS, SETTINGS_ITEMS, type NavItem } from './nav';
import { CreateMenu } from './CreateMenu';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  counts: NavCounts;
}

interface NavGroupProps {
  label: string;
  items: readonly NavItem[];
  collapsed: boolean;
  counts: NavCounts;
}

function NavGroup({ label, items, collapsed, counts }: NavGroupProps) {
  return (
    <nav aria-label={label}>
      <h2
        className={cn(
          'mb-4 px-inset text-base font-medium tracking-label text-muted',
          collapsed && 'sr-only',
        )}
      >
        {label}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.to}>
            <SidebarItem
              item={item}
              collapsed={collapsed}
              count={item.counter ? counts[item.counter] : undefined}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle, counts }: SidebarProps) {
  const Toggle = collapsed ? ChevronsRight : ChevronsLeft;
  return (
    <aside
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col border-r-hair bg-bg transition-[width]',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      <div
        className={cn(
          'flex h-sidebar-header shrink-0 items-center border-b-hair px-inset pt-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <span className="text-logo font-bold tracking-tighter">
            Daily<span className="text-accent">.</span>
          </span>
        )}
        <Button
          variant="icon"
          size="sm"
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <Toggle aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
      </div>

      <div className="mt-4 mb-7 px-inset">
        <CreateMenu collapsed={collapsed} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto pb-4">
        <NavGroup label="Menus" items={MENU_ITEMS} collapsed={collapsed} counts={counts} />
        <NavGroup
          label="Configurações"
          items={SETTINGS_ITEMS}
          collapsed={collapsed}
          counts={counts}
        />
      </div>
    </aside>
  );
}
