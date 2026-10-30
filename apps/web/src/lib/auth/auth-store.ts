import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { cloudEnabled, getSupabase } from '../cloud/client';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
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
  const meta = user.user_metadata as { full_name?: string; name?: string };
  const email = user.email ?? '';
  return {
    status: 'signed-in',
    user: { id: user.id, email, name: meta.full_name ?? meta.name ?? email.split('@')[0] ?? '' },
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
