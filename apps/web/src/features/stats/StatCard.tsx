import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';

interface StatCardProps {
  title: string;
  /** Destino do botão de seta (omitido = sem botão); `actionLabel` é o rótulo acessível. */
  to?: string;
  actionLabel?: string;
  /** Ação própria à direita do título (ex.: o lápis das metas). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Cartão “glass” do dashboard: título, ação opcional e conteúdo. */
export function StatCard({ title, to, actionLabel, action, className, children }: StatCardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn('surface-glass relative flex min-w-0 flex-col rounded-card p-card', className)}
    >
      <header className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-card-title font-normal">
          {title}
        </h2>
        {action}
        {to && (
          <Link
            to={to}
            aria-label={actionLabel ?? `Abrir ${title}`}
            className="inline-flex size-control shrink-0 items-center justify-center rounded-full bg-pill text-pill-fg hover:brightness-95"
          >
            <ArrowUpRight aria-hidden strokeWidth={1.5} className="size-icon" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
