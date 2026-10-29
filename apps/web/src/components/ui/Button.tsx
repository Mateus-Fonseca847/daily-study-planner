import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'pill' | 'icon' | 'tile';
type IconSize = 'xs' | 'sm' | 'md';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
  primary:
    'h-control rounded-full bg-accent px-5 text-nav font-semibold text-accent-fg hover:brightness-95',
  secondary:
    'h-control rounded-full border-hair border-line-strong bg-transparent px-4 text-md text-fg hover:bg-hover',
  /** Igual ao secundário, em 13 px (como o botão da topbar na referência). */
  outline:
    'h-control rounded-full border-hair border-line-strong bg-transparent px-4 text-base text-fg hover:bg-hover',
  pill: 'h-create w-create-btn rounded-full bg-pill px-4 text-nav font-semibold text-pill-fg hover:brightness-95',
  icon: 'rounded-full bg-surface text-fg hover:brightness-125',
  tile: 'rounded-md bg-hover text-soft hover:text-fg',
};

const ICON_SIZES: Record<IconSize, string> = {
  xs: 'size-control-sm',
  sm: 'size-avatar-md',
  md: 'size-control',
};

type CommonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>;

type ButtonProps =
  | (CommonProps & {
      variant?: Exclude<Variant, 'icon' | 'tile'>;
      size?: never;
      'aria-label'?: string;
    })
  /** Botões só com ícone exigem rótulo acessível. */
  | (CommonProps & { variant: 'icon' | 'tile'; size?: IconSize; 'aria-label': string });

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...dom
}: ButtonProps) {
  const iconSize = variant === 'icon' || variant === 'tile' ? ICON_SIZES[size] : undefined;
  return (
    <button type={type} className={cn(BASE, VARIANTS[variant], iconSize, className)} {...dom} />
  );
}
