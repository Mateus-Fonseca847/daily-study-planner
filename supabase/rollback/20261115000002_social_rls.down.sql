-- Reverte 20261115000002_social_rls.sql (depois da 3). As tabelas somem na reversão da 1; aqui
-- saem as políticas e as permissões.
drop policy if exists "profiles: o dono lê" on public.profiles;
drop policy if exists "profiles: o dono atualiza" on public.profiles;
drop policy if exists "profile_private: o dono lê" on public.profile_private;
drop policy if exists "consents: o dono lê" on public.consents;
drop policy if exists "username_history: o dono lê" on public.username_history;
revoke all on public.profiles, public.profile_private, public.consents, public.username_history,
  public.reserved_usernames, public.social_rate_limits from authenticated;
