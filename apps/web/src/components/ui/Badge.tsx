import { cn } from '../../lib/cn';

interface BadgeProps {
  /** `counter`: contador rosa; `new`: selo “NEW” amarelo. */
  variant: 'counter' | 'new';
  children: React.ReactNode;
}

const VARIANTS = {
  counter: 'min-w-badge bg-badge px-2 text-xs font-semibold text-badge-fg',
  new: 'bg-accent-soft px-2 text-2xs font-bold uppercase text-accent',
} as const;

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-badge items-center justify-center rounded-full',
        VARIANTS[variant],
      )}
    >
      {children}
    </span>
  );
}
