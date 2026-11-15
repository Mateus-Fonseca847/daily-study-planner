-- =============================================================================================
-- Sincronização — 1/3: tabela user_data (um snapshot do app por usuário), com RLS.
--
-- Já aplicada na produção (versão 20261030161655). Este arquivo existe para o repositório
-- reproduzir o banco do zero (Supabase local, CI) e para o histórico das migrações bater com o
-- projeto remoto.
-- =============================================================================================

-- Um snapshot do app (DataSnapshot) por usuário. `version` é a versão do formato dos dados do app.
-- `revision` é incrementado no servidor a cada gravação e serve de controle de concorrência
-- (compare-and-set), para um aparelho não sobrescrever em silêncio o que outro gravou.
create table public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  version    integer     not null,
  revision   bigint      not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_data is
  'Snapshot dos dados do Daily por usuário. Acesso restrito à própria linha por RLS.';

create function public.user_data_touch()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.revision   := old.revision + 1;
  return new;
end;
$$;

create trigger user_data_touch
before update on public.user_data
for each row execute function public.user_data_touch();

alter table public.user_data enable row level security;

create policy "user_data_select_own" on public.user_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_data_insert_own" on public.user_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_data_update_own" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sem política de delete de propósito: a linha some só se a conta for removida (cascade).
-- Visitantes não autenticados não têm acesso algum.
revoke all on public.user_data from anon;
