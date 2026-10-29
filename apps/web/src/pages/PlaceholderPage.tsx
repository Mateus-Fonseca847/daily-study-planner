import type { NavItem } from '../components/layout/nav';

export function PlaceholderPage({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <Icon aria-hidden strokeWidth={1.5} className="size-avatar-md text-muted" />
      <h1 className="text-xl font-semibold tracking-tighter">{item.label}</h1>
      <p className="text-md text-muted">Esta página ainda está em construção.</p>
    </div>
  );
}
