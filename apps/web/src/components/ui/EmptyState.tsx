import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Botões de ação. */
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-hair px-6 py-10 text-center">
      <Icon aria-hidden strokeWidth={1.5} className="size-avatar-md text-muted" />
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="max-w-modal text-md text-muted">{description}</p>
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
