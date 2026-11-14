-- =============================================================================================
-- Amizades (Prompt 16) — 1/4: tabelas, suspensão e funções auxiliares internas.
--
-- Só ACRESCENTA: tabelas novas, duas colunas novas em public.profiles (suspensão, escrita só pelo
-- dono do projeto) e um gatilho novo. Não altera nada criado pelo Prompt 15 nem pela
-- sincronização (`user_data`, `delete_my_account()`).
-- Pré-requisito: as 4 migrações do Prompt 15 (20261115000001..4).
-- Reversão: supabase/rollback/20261116000001_friends_tables.down.sql (depois das 4, 3 e 2).
-- =============================================================================================

-- Moderação: suspensão de um perfil. O cliente lê a própria linha (já valia), mas não escreve
-- estas colunas (sem GRANT de coluna). Quem suspende é o dono do projeto, pelo SQL Editor
-- (docs/moderation.md). Efeito: some de buscas e listas, não envia nem responde pedidos e a foto
-- deixa de ser lida pelos amigos.
alter table public.profiles
  add column suspended_at timestamptz,
  add column suspended_reason text
    constraint profiles_suspended_reason check (
      suspended_reason is null or char_length(suspended_reason) <= 500
    );

-- Solicitações de amizade. Estados gravados: 'pendente' e 'recusada'. 'aceita' vira uma linha em
-- friendships (e a solicitação é apagada); 'cancelada' apaga a linha (ou, se já tinha sido
-- recusada, só a esconde de quem enviou: a carência de 30 dias continua).
-- `sender_visible_until`: até quando quem ENVIOU continua vendo “pendente” depois de uma recusa
-- (no máximo 7 dias). Quem enviou nunca sabe da recusa.
create table public.friend_requests (
  id bigint generated always as identity primary key,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pendente'
    constraint friend_requests_status check (status in ('pendente', 'recusada')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  sender_visible_until timestamptz,
  constraint friend_requests_not_self check (from_user <> to_user),
  constraint friend_requests_responded check ((status = 'recusada') = (responded_at is not null))
);
-- No máximo uma linha por sentido (de A para B) e uma pendente por par (nos dois sentidos).
create unique index friend_requests_direction on public.friend_requests (from_user, to_user);
create unique index friend_requests_one_pending on public.friend_requests (
  least(from_user, to_user), greatest(from_user, to_user)
) where status = 'pendente';
create index friend_requests_to on public.friend_requests (to_user, status);

-- Amizades: par canônico (user_a < user_b), uma linha por par, simétrica por construção.
create table public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint friendships_canonical check (user_a < user_b)
);
create index friendships_b on public.friendships (user_b);

-- Bloqueios. O retrato (@ e nome no momento do bloqueio) serve só à lista “Bloqueados” de quem
-- bloqueou, sem consultar o perfil atual da outra pessoa (nada sobre ela vaza depois).
create table public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  blocked_username text,
  blocked_display_name text,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  constraint blocks_not_self check (blocker <> blocked)
);
create index blocks_blocked on public.blocks (blocked);

-- Denúncias. Ninguém lê pelo app (nem quem denunciou): só o dono do projeto, pelo painel.
-- Retrato do @ e do nome no momento da denúncia. Ao excluir a conta, os identificadores viram
-- nulos e o conteúdo fica (a moderação não é burlada apagando a conta). Retenção sugerida em
-- docs/moderation.md.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references auth.users (id) on delete set null,
  reported_id uuid references auth.users (id) on delete set null,
  reported_username text,
  reported_display_name text,
  reason text not null constraint reports_reason check (
    reason in ('perfil_improprio', 'foto_impropria', 'assedio', 'perfil_falso', 'outro')
  ),
  detail text constraint reports_detail check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  status text not null default 'pendente'
    constraint reports_status check (status in ('pendente', 'resolvida', 'descartada')),
  resolved_at timestamptz,
  resolution_note text
    constraint reports_resolution_note check (
      resolution_note is null or char_length(resolution_note) <= 1000
    ),
  constraint reports_not_self check (reporter_id is null or reporter_id <> reported_id)
);
create index reports_pending on public.reports (status, created_at);
create index reports_reported on public.reports (reported_id);
create index reports_reporter on public.reports (reporter_id);

-- ── Auxiliares internas (sem EXECUTE para o cliente; usadas pelas funções da migração 3) ───────

-- Situação do próprio perfil: 'ok', 'sem_perfil', 'desativado' ou 'suspenso'.
create function public.social_estado_proprio(uid uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p.user_id is null then 'sem_perfil'
    when p.suspended_at is not null then 'suspenso'
    when p.disabled_at is not null then 'desativado'
    else 'ok'
  end
  from (select 1) as x
  left join public.profiles p on p.user_id = uid;
$$;

-- O perfil existe, está ativo e não está suspenso.
create function public.social_perfil_utilizavel(uid uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid and p.disabled_at is null and p.suspended_at is null
  );
$$;

-- A e B podem se ver e se conectar: pessoas diferentes, os dois perfis utilizáveis, a MESMA
-- faixa de idade (14–17 com 14–17; 18+ com 18+) e nenhum bloqueio em nenhum dos sentidos.
-- Toda resposta “não encontrado” do app nasce daqui, então existência, idade e bloqueio são
-- indistinguíveis.
create function public.social_podem_conectar(a uuid, b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select a is not null and b is not null and a <> b
    and public.social_perfil_utilizavel(a)
    and public.social_perfil_utilizavel(b)
    and public.social_is_minor(a) = public.social_is_minor(b)
    and not exists (
      select 1 from public.blocks k
      where (k.blocker = a and k.blocked = b) or (k.blocker = b and k.blocked = a)
    );
$$;

-- Amigos de uma pessoa (para o limite de 200).
create function public.social_total_amigos(uid uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.friendships f where f.user_a = uid or f.user_b = uid;
$$;

-- Pedidos que a pessoa vê como “pendentes” enviados (inclui os recusados ainda visíveis, para o
-- limite de 20 não revelar a recusa).
create function public.social_pendentes_enviadas(uid uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.friend_requests r
  where r.from_user = uid
    and (r.status = 'pendente' or r.sender_visible_until > now());
$$;

-- Excluir o perfil social (social_delete_profile, do Prompt 15) também apaga as amizades, as
-- solicitações nos dois sentidos e os bloqueios FEITOS pela pessoa. Os bloqueios feitos CONTRA
-- ela ficam (são de quem bloqueou; senão bastaria recriar o perfil para escapar). Denúncias
-- continuam vinculadas enquanto a conta existir. Excluir a CONTA apaga tudo em cascata.
create function public.social_profiles_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.friendships where user_a = old.user_id or user_b = old.user_id;
  delete from public.friend_requests where from_user = old.user_id or to_user = old.user_id;
  delete from public.blocks where blocker = old.user_id;
  return old;
end;
$$;

create trigger profiles_friends_cleanup
  after delete on public.profiles
  for each row execute function public.social_profiles_cleanup();

-- O Supabase dá EXECUTE padrão em funções novas: tudo revogado (só as funções privilegiadas da
-- migração 3, donas das tabelas, chamam estas).
revoke execute on function public.social_estado_proprio(uuid) from public, anon, authenticated;
revoke execute on function public.social_perfil_utilizavel(uuid) from public, anon, authenticated;
revoke execute on function public.social_podem_conectar(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.social_total_amigos(uuid) from public, anon, authenticated;
revoke execute on function public.social_pendentes_enviadas(uuid) from public, anon, authenticated;
revoke execute on function public.social_profiles_cleanup() from public, anon, authenticated;
