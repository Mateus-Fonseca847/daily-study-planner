import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description: string;
  /** Botões à direita do título. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Moldura das páginas de lista: título, descrição, ações e conteúdo rolável. */
export function PageShell({ title, description, actions, children }: PageShellProps) {
  return (
    <div className="readable min-h-0 flex-1 overflow-y-auto max-lg:overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-content flex-col gap-6 min-w-0 px-page py-8 phone:gap-4 phone:py-4 phone:fab-clearance">
        <header className="flex items-start justify-between gap-4 max-lg:flex-wrap phone:flex-col phone:items-stretch phone:gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tighter phone:sr-only">{title}</h1>
            <p className="mt-1 text-md text-muted phone:mt-0 phone:line-clamp-2 phone:text-sm">
              {description}
            </p>
          </div>
          {actions && <div className="contents phone:block phone:w-full">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
