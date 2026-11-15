import type { ReactNode } from 'react';

/** Bloco de uma página jurídica (Termos e Política): título + parágrafos. */
export function LegalBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-2 text-md text-soft">{children}</div>
    </section>
  );
}
