import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import type { NavItem } from './nav';

interface SidebarItemProps {
  item: NavItem;
  collapsed: boolean;
  /** Valor do contador rosa, quando o item tem um. */
  count?: number;
}

export function SidebarItem({ item, collapsed, count }: SidebarItemProps) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex h-item items-center gap-3 px-4 text-md font-medium transition-colors',
          collapsed && 'justify-center',
          isActive ? 'bg-surface text-accent' : 'text-muted hover:bg-hover hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden strokeWidth={1.5} className="size-icon shrink-0" />
          <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
          {!collapsed && count !== undefined && <Badge variant="counter">{count}</Badge>}
          {!collapsed && item.badgeNew && <Badge variant="new">New</Badge>}
          {isActive && <span aria-hidden className="absolute inset-y-0 right-0 w-bar bg-accent" />}
        </>
      )}
    </NavLink>
  );
}
