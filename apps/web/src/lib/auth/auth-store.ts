import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { cloudEnabled, getSupabase } from '../cloud/client';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  /** Foto da conta Google (só `https://lh3.googleusercontent.com`, liberado na CSP); senão null. */
  avatarUrl: string | null;
}

/** Aceita só a foto servida pelo Google (o mesmo host liberado em `img-src`). */
export function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'lh3.googleusercontent.com'
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export type AuthState =
  /** Nuvem desligada (sem variáveis de ambiente): o app é só local. */
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'visitor' }
  | { status: 'signed-in'; user: AccountUser };

interface AuthActions {
  signInWithGoogle(): Promise<string | null>;
  signOut(): Promise<void>;
}

const fromSession = (session: Session | null): AuthState => {
  if (!session) return { status: 'visitor' };
  const { user } = session;
  const meta = user.user_metadata as {
    full_name?: string;
    name?: string;
    avatar_url?: unknown;
    picture?: unknown;
  };
  const email = user.email ?? '';
  return {
    status: 'signed-in',
    user: {
      id: user.id,
      email,
      name: meta.full_name ?? meta.name ?? email.split('@')[0] ?? '',
      avatarUrl: safeAvatarUrl(meta.avatar_url ?? meta.picture),
    },
  };
};

export const useAuth = create<AuthState & AuthActions>()((set) => ({
  status: cloudEnabled ? 'loading' : 'disabled',
  async signInWithGoogle() {
    const client = getSupabase();
    if (!client) return 'A conta na nuvem não está configurada neste ambiente.';
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/calendario` },
    });
    return error ? error.message : null;
  },
  async signOut() {
    await getSupabase()?.auth.signOut();
    set({ status: 'visitor' } as AuthState);
  },
}));

let started = false;

/** Lê a sessão salva e acompanha logins/logouts. Chamar uma vez, no início do app. */
export function startAuth(): void {
  const client = getSupabase();
  if (!client || started) return;
  started = true;
  const apply = (session: Session | null) => useAuth.setState(fromSession(session) as AuthState);
  void client.auth.getSession().then(({ data }) => apply(data.session));
  // Nunca chamar outras funções do Supabase dentro deste callback (risco de deadlock).
  client.auth.onAuthStateChange((_event, session) => apply(session));
}
