import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Nuvem só existe quando as duas variáveis estão definidas; senão o app é 100% local. */
export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  client ??= createClient(url as string, key as string, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true },
  });
  return client;
}
