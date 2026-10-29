import { cn } from '../../lib/cn';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
}

const SIZES = { sm: 'size-avatar-sm text-2xs', md: 'size-avatar-md text-sm' } as const;

export function Avatar({ name, size = 'sm' }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-raised font-semibold text-fg',
        SIZES[size],
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
