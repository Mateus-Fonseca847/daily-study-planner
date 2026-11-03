/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do projeto Supabase. Sem ela (e sem a chave), o app roda 100% local. */
  readonly VITE_SUPABASE_URL?: string;
  /** Chave pública (publishable/anon). Segura no navegador: o acesso é limitado por RLS. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
