import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'pill' | 'icon';
type IconSize = 'xs' | 'sm' | 'md';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 font-medium text-md transition-colors disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
  primary: 'h-control rounded-full bg-accent px-4 text-accent-fg hover:brightness-95',
  secondary:
    'h-control rounded-full border-hair border-line-strong bg-transparent px-4 text-fg hover:bg-hover',
  pill: 'h-create w-full rounded-full bg-pill px-4 text-pill-fg hover:brightness-95',
  icon: 'rounded-full border-hair border-line bg-transparent text-fg hover:bg-hover',
};

const ICON_SIZES: Record<IconSize, string> = {
  xs: 'size-control-sm',
  sm: 'size-avatar-md',
  md: 'size-control',
};

type CommonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>;

type ButtonProps =
  | (CommonProps & { variant?: Exclude<Variant, 'icon'>; size?: never; 'aria-label'?: string })
  /** Botões só com ícone exigem rótulo acessível. */
  | (CommonProps & { variant: 'icon'; size?: IconSize; 'aria-label': string });

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...dom
}: ButtonProps) {
  const iconSize = variant === 'icon' ? ICON_SIZES[size] : undefined;
  return (
    <button type={type} className={cn(BASE, VARIANTS[variant], iconSize, className)} {...dom} />
  );
}
