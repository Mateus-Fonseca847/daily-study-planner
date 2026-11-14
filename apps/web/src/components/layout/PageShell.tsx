import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  /** Botões à direita do título. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Moldura das páginas de lista: título, ações e conteúdo rolável (sem subtítulo descritivo). */
export function PageShell({ title, actions, children }: PageShellProps) {
  return (
    <div className="readable min-h-0 flex-1 overflow-y-auto max-lg:overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-content flex-col gap-6 min-w-0 px-page py-8 phone:gap-4 phone:py-4 phone:fab-clearance">
        <header className="flex items-center justify-between gap-4 max-lg:flex-wrap phone:flex-col phone:items-stretch phone:gap-3">
          <h1 className="text-xl font-semibold tracking-tighter phone:sr-only">{title}</h1>
          {actions && <div className="contents phone:block phone:w-full">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
