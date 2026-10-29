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
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-page py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tighter">{title}</h1>
            <p className="mt-1 text-md text-muted">{description}</p>
          </div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  );
}
