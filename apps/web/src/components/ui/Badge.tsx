import { cn } from '../../lib/cn';

interface BadgeProps {
  /** `counter`: contador rosa; `new`: selo “NEW” amarelo. */
  variant: 'counter' | 'new';
  children: React.ReactNode;
  /** Texto para leitor de tela no lugar do número (ex.: “3 solicitações recebidas”). */
  label?: string | undefined;
}

const VARIANTS = {
  counter: 'min-w-badge bg-badge px-2 text-xs font-semibold text-badge-fg',
  new: 'bg-accent-soft px-2 text-2xs font-bold uppercase text-accent-ink',
} as const;

export function Badge({ variant, children, label }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-badge items-center justify-center rounded-full',
        VARIANTS[variant],
      )}
    >
      {label ? (
        <>
          <span aria-hidden>{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}
