import { useAuth } from '../../lib/auth/auth-store';
import { useData } from '../../lib/data/app-store';

/** Iniciais (até duas letras) para quando não há foto. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]!, parts.at(-1)!] : parts;
  return letters.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

/** Cabeçalho do Perfil: foto da conta Google (ou iniciais) e o nome (da conta ou das Preferências). */
export function ProfileHeader() {
  const auth = useAuth();
  const prefName = useData((s) => s.preferences.name);
  const user = auth.status === 'signed-in' ? auth.user : null;
  const name = prefName || user?.name || '';
  const avatar = user?.avatarUrl ?? null;
  return (
    <header className="flex items-center gap-4">
      {avatar ? (
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          className="size-profile-avatar shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex size-profile-avatar shrink-0 items-center justify-center rounded-full bg-surface text-xl font-semibold"
        >
          {initialsOf(name || 'Daily')}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-display font-normal tracking-tighter max-md:text-xl">
          {name || 'Seu perfil'}
        </h1>
        {!name && <p className="text-md text-muted">Defina seu nome em Preferências.</p>}
      </div>
    </header>
  );
}
