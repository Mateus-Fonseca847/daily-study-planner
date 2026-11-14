import { cn } from '../../lib/cn';
import { initialsOf } from '../profile/ProfileHeader';

const SIZES = {
  sm: 'size-avatar-sm text-2xs',
  md: 'size-avatar-md text-sm',
  lg: 'size-profile-avatar text-xl',
} as const;

interface SocialAvatarProps {
  /** `blob:` da foto (ou `null`: mostra as iniciais). */
  url: string | null;
  name: string;
  size?: keyof typeof SIZES;
}

/** Foto do perfil social do próprio usuário, ou as iniciais quando não há foto. Decorativa. */
export function SocialAvatar({ url, name, size = 'md' }: SocialAvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        data-social-avatar
        className={cn('shrink-0 rounded-full bg-surface object-cover', SIZES[size])}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-hair bg-surface font-semibold text-fg',
        SIZES[size],
      )}
    >
      {initialsOf(name || 'Daily')}
    </span>
  );
}
