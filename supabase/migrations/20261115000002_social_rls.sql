-- =============================================================================================
-- Perfil social (Prompt 15) — 2/4: RLS e permissões. Nesta etapa só o dono acessa o que é seu.
--
-- O Supabase dá privilégios padrão a anon/authenticated em tabelas novas do schema public, então
-- tudo é revogado primeiro e só o necessário volta. Escrita fora das colunas liberadas acontece
-- só pelas funções da migração 3 (SECURITY DEFINER, donas das tabelas).
-- Reversão: supabase/rollback/20261115000002_social_rls.down.sql.
-- =============================================================================================

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.consents enable row level security;
alter table public.username_history enable row level security;
alter table public.reserved_usernames enable row level security;
alter table public.social_rate_limits enable row level security;

revoke all on public.profiles, public.profile_private, public.consents, public.username_history,
  public.reserved_usernames, public.social_rate_limits from public, anon, authenticated;

-- Leitura: só as próprias linhas.
grant select on public.profiles, public.profile_private, public.consents, public.username_history
  to authenticated;

create policy "profiles: o dono lê" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profile_private: o dono lê" on public.profile_private
  for select to authenticated using (user_id = (select auth.uid()));
create policy "consents: o dono lê" on public.consents
  for select to authenticated using (user_id = (select auth.uid()));
create policy "username_history: o dono lê" on public.username_history
  for select to authenticated using (user_id = (select auth.uid()));

-- Atualização direta: só a própria linha e só estas colunas. O @ (troca limitada), a ativação,
-- desativar e excluir passam pelas funções.
grant update (display_name, avatar_path, avatar_version, discoverable, show_achievements,
  show_streaks, show_stats) on public.profiles to authenticated;

create policy "profiles: o dono atualiza" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- reserved_usernames e social_rate_limits: nenhum acesso direto (sem política = nada passa).
