import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type PillVariant = 'accent' | 'outline';

const BASE =
  'inline-flex h-focus-pill shrink-0 items-center justify-center gap-2 rounded-full px-focus-pill-px text-lg font-semibold whitespace-nowrap transition-colors';

const VARIANTS: Record<PillVariant, string> = {
  accent: 'bg-accent text-accent-fg hover:brightness-95',
  outline: 'border-hair border-line-strong text-fg hover:bg-hover',
};

/** Classes de uma pílula do Modo Foco (também usadas por `<Link>`). */
export const pillClass = (variant: PillVariant, className?: string): string =>
  cn(BASE, VARIANTS[variant], className);

interface FocusPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
}

/** Botão em pílula com ícone e rótulo (filhos). */
export function FocusPill({
  variant = 'outline',
  className,
  type = 'button',
  ...dom
}: FocusPillProps) {
  return <button type={type} className={pillClass(variant, className)} {...dom} />;
}
