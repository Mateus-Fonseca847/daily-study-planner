-- =============================================================================================
-- Perfil social (Prompt 15) — 1/4: tabelas, regras do @ e gatilhos.
--
-- Só ACRESCENTA objetos novos: não toca em public.user_data nem em public.delete_my_account().
-- O app atual continua funcionando com esta migração aplicada antes do deploy do front.
-- Reversão: supabase/rollback/20261115000001_social_tables.down.sql (depois das 2, 3 e 4).
-- =============================================================================================

-- Nomes que ninguém pode usar como @ (a mesma lista de packages/shared/src/social.ts; um teste
-- unitário compara as duas). Rotas do app entram aqui para um @ nunca parecer uma página.
create table public.reserved_usernames (
  name text primary key check (name = lower(name))
);

insert into public.reserved_usernames (name) values
  ('about'), ('adm'), ('admin'), ('administracao'), ('administrador'), ('ajuda'), ('amigos'),
  ('anonimo'), ('anonymous'), ('api'), ('app'), ('atalhos'), ('auth'), ('blocos'), ('blog'),
  ('busca'), ('buscar'), ('cadastro'), ('calendario'), ('config'), ('configuracoes'), ('conta'),
  ('contato'), ('convidar'), ('daily'), ('dailyapp'), ('dev'), ('email'), ('entrar'), ('equipe'),
  ('estatisticas'), ('everyone'), ('explorar'), ('faq'), ('foco'), ('habitos'), ('help'),
  ('login'), ('logout'), ('mail'), ('materias'), ('mod'), ('moderacao'), ('moderador'),
  ('notificacoes'), ('null'), ('official'), ('oficial'), ('perfil'), ('perfis'), ('preferencias'),
  ('privacidade'), ('provas'), ('root'), ('sair'), ('security'), ('seguranca'), ('signin'),
  ('signup'), ('sistema'), ('sobre'), ('social'), ('staff'), ('status'), ('suporte'), ('system'),
  ('tarefas'), ('termos'), ('test'), ('teste'), ('todos'), ('undefined'), ('user'), ('users'),
  ('usuario'), ('usuarios'), ('www');

-- Formato do @: 3 a 20 caracteres, só a-z, 0-9, “.” e “_”, minúsculo; começa e termina com letra
-- ou número; “.” e “_” nunca aparecem dois seguidos (sem “..”, “__”, “._”, “_.”).
create function public.social_username_is_valid(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select name is not null
    and char_length(name) between 3 and 20
    and name ~ '^[a-z0-9]+([._][a-z0-9]+)*$';
$$;

-- Nome de exibição: 1 a 40 caracteres, sem caracteres de controle e não só espaços.
create function public.social_display_name_is_valid(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select name is not null
    and char_length(name) between 1 and 40
    and btrim(name) <> ''
    and name !~ '[[:cntrl:]]';
$$;

-- Perfil social. Nesta etapa só o dono lê (RLS na migração 2).
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (public.social_username_is_valid(username)),
  display_name text not null check (public.social_display_name_is_valid(display_name)),
  avatar_path text,
  avatar_version integer not null default 0 check (avatar_version >= 0),
  -- Interruptores de privacidade com padrões seguros.
  discoverable boolean not null default false,
  show_achievements boolean not null default true,
  show_streaks boolean not null default false,
  show_stats boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  social_enabled_at timestamptz not null default now(),
  disabled_at timestamptz,
  username_changed_at timestamptz,
  -- A foto só pode estar no caminho fixo do próprio usuário.
  constraint profiles_avatar_path check (
    avatar_path is null or avatar_path = user_id::text || '/avatar.webp'
  )
);

-- @ único sem diferenciar maiúsculas (o CHECK já exige minúsculo; o índice é a garantia final).
create unique index profiles_username_lower on public.profiles (lower(username));

-- Idade, minimizada: só o primeiro dia do mês de nascimento (o dia nunca é guardado).
create table public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_month date not null check (extract(day from birth_month) = 1),
  created_at timestamptz not null default now()
);

-- Aceites auditáveis, com a versão do texto. Só a exclusão do perfil social os apaga.
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('perfil_social', 'politica_privacidade')),
  text_version text not null check (char_length(text_version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index consents_user on public.consents (user_id);

-- @ liberados (troca ou exclusão): ficam indisponíveis para OUTRAS pessoas por 90 dias. Ao excluir
-- o perfil (ou a conta), o vínculo com a pessoa some (user_id nulo) e a reserva continua.
create table public.username_history (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  username text not null,
  released_at timestamptz not null default now()
);
create index username_history_name on public.username_history (username, released_at);
create index username_history_user on public.username_history (user_id);

-- Contadores do limite de taxa (só as funções da migração 3 usam).
create table public.social_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, action, window_start)
);

-- Menor de 18? Conservador com só o mês: maior só a partir do mês seguinte ao do 18º aniversário.
create function public.social_is_minor(uid uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select current_date < (p.birth_month + interval '18 years 1 month')::date
       from public.profile_private p where p.user_id = uid),
    true
  );
$$;

-- Gatilho: @ reservado é recusado; adolescente (14–17) não abre os interruptores; updated_at.
-- SECURITY DEFINER: lê reserved_usernames e profile_private, que o usuário não lê diretamente;
-- só devolve erro ou a linha, nunca dados de outra pessoa.
create function public.social_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.reserved_usernames r where r.name = lower(new.username)) then
    raise exception 'social:reservado' using errcode = '23514';
  end if;
  if (new.discoverable or new.show_streaks or new.show_stats)
     and public.social_is_minor(new.user_id) then
    raise exception 'social:menor_restrito' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.social_profiles_guard() from public, anon, authenticated;
revoke execute on function public.social_is_minor(uuid) from public, anon, authenticated;

create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function public.social_profiles_guard();
