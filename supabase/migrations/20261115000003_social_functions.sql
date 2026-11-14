-- =============================================================================================
-- Perfil social (Prompt 15) — 3/4: funções privilegiadas.
--
-- Todas: SECURITY DEFINER (donas das tabelas, ignoram a RLS), `set search_path = ''` (nomes
-- sempre qualificados, sem sequestro de search_path), recusam quem não está logado e só tocam as
-- linhas de auth.uid(). EXECUTE só para `authenticated`. Erros saem como `social:<código>` para
-- o app traduzir em pt-BR.
-- Reversão: supabase/rollback/20261115000003_social_functions.down.sql.
-- =============================================================================================

-- Limite de taxa: conta uma chamada de `action` na janela atual (`bucket`) e diz se ainda cabe.
-- Interna (sem EXECUTE para ninguém além do dono); limpa contadores com mais de 2 dias.
create function public.social_rate_hit(action text, bucket interval, max_calls integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  start_at timestamptz := to_timestamp(
    floor(extract(epoch from now()) / extract(epoch from bucket)) * extract(epoch from bucket)
  );
  used integer;
begin
  insert into public.social_rate_limits as r (user_id, action, window_start, count)
    values (uid, action, start_at, 1)
    on conflict (user_id, action, window_start) do update set count = r.count + 1
    returning r.count into used;
  delete from public.social_rate_limits
    where user_id = uid and window_start < now() - interval '2 days';
  return used <= max_calls;
end;
$$;

-- Situação de um @ para a pessoa logada: 'ok', 'invalido', 'reservado', 'em_uso' ou 'limite'.
-- Superfície: revela só se um @ está livre (nunca de quem é). Contra enumeração: exige login e
-- limita a 30 consultas por minuto e 300 por dia por usuário. O próprio @ atual conta como 'ok'.
create function public.social_username_status(candidate text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('username_status:min', interval '1 minute', 30)
     or not public.social_rate_hit('username_status:dia', interval '1 day', 300) then
    return 'limite';
  end if;
  if not public.social_username_is_valid(candidate) then
    return 'invalido';
  end if;
  if exists (select 1 from public.reserved_usernames r where r.name = candidate) then
    return 'reservado';
  end if;
  if exists (
    select 1 from public.profiles p where lower(p.username) = candidate and p.user_id <> uid
  ) or exists (
    select 1 from public.username_history h
    where h.username = candidate
      and h.released_at > now() - interval '90 days'
      and h.user_id is distinct from uid
  ) then
    return 'em_uso';
  end if;
  return 'ok';
end;
$$;

-- Ativa o perfil social numa transação: confere a idade (14 anos completos, pela data completa,
-- que NÃO é guardada), grava só o mês de nascimento, cria o perfil e registra os aceites.
-- Devolve 'ok' ou o código do problema (sem exceção, para o contador do limite de taxa ficar
-- gravado mesmo quando a tentativa falha: tentar datas de nascimento até passar não funciona).
-- Menor de 14: nada do perfil é gravado. Limite: 5 tentativas por hora.
create function public.social_activate(
  birth_date date,
  chosen_username text,
  chosen_display_name text,
  consent_version text,
  privacy_version text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  status text;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('activate', interval '1 hour', 5) then
    return 'limite';
  end if;
  if birth_date is null or birth_date > current_date or birth_date < date '1900-01-01' then
    return 'data_invalida';
  end if;
  -- age() trata 29/02: num ano comum, os 14 anos completam em 01/03.
  if extract(year from age(current_date, birth_date)) < 14 then
    return 'menor_de_14';
  end if;
  if exists (select 1 from public.profiles p where p.user_id = uid) then
    return 'ja_ativo';
  end if;
  if coalesce(consent_version, '') = '' or coalesce(privacy_version, '') = '' then
    return 'sem_consentimento';
  end if;
  if not public.social_display_name_is_valid(chosen_display_name) then
    return 'nome_invalido';
  end if;
  status := public.social_username_status(chosen_username);
  if status <> 'ok' then
    return status;
  end if;

  begin
    insert into public.profile_private (user_id, birth_month)
      values (uid, date_trunc('month', birth_date)::date);
    insert into public.profiles (user_id, username, display_name)
      values (uid, chosen_username, chosen_display_name);
    insert into public.consents (user_id, kind, text_version) values
      (uid, 'perfil_social', consent_version),
      (uid, 'politica_privacidade', privacy_version);
  exception
    when unique_violation then
      return 'em_uso';
  end;
  return 'ok';
end;
$$;

-- Troca o @: no máximo 1 vez a cada 30 dias; o antigo fica 90 dias reservado (histórico).
-- Devolve 'ok' ou o código do problema.
create function public.social_change_username(new_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_row public.profiles%rowtype;
  status text;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  select * into current_row from public.profiles p where p.user_id = uid for update;
  if not found then
    return 'sem_perfil';
  end if;
  if current_row.username = new_username then
    return 'ok';
  end if;
  if current_row.username_changed_at is not null
     and current_row.username_changed_at > now() - interval '30 days' then
    return 'troca_recente';
  end if;
  status := public.social_username_status(new_username);
  if status <> 'ok' then
    return status;
  end if;
  begin
    insert into public.username_history (user_id, username) values (uid, current_row.username);
    update public.profiles set username = new_username, username_changed_at = now()
      where user_id = uid;
  exception
    when unique_violation then
      return 'em_uso';
  end;
  return 'ok';
end;
$$;

-- Desativar (oculta, mantém os dados e revoga o aceite) ou reativar (exige um novo aceite).
create function public.social_set_active(
  active boolean,
  consent_version text default null,
  privacy_version text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = uid) then
    raise exception 'social:sem_perfil' using errcode = 'P0002';
  end if;
  if active then
    if consent_version is null or privacy_version is null then
      raise exception 'social:sem_consentimento' using errcode = '22023';
    end if;
    insert into public.consents (user_id, kind, text_version) values
      (uid, 'perfil_social', consent_version),
      (uid, 'politica_privacidade', privacy_version);
    update public.profiles set disabled_at = null where user_id = uid;
  else
    update public.profiles set disabled_at = now() where user_id = uid and disabled_at is null;
    update public.consents set revoked_at = now() where user_id = uid and revoked_at is null;
  end if;
end;
$$;

-- Exclui TUDO do perfil social (perfil, mês de nascimento, aceites, contadores). O @ atual e os
-- antigos ficam reservados por 90 dias SEM vínculo com a pessoa. Recusa enquanto a foto existir
-- no Storage: o app apaga o arquivo pela API de Storage antes (o SQL não apaga arquivos), então
-- a exclusão é sempre completa.
create function public.social_delete_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  old_name text;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if exists (
    select 1 from storage.objects o
    where o.bucket_id = 'avatars' and o.name = uid::text || '/avatar.webp'
  ) then
    raise exception 'social:foto_pendente' using errcode = '55000';
  end if;
  select p.username into old_name from public.profiles p where p.user_id = uid;
  if old_name is not null then
    insert into public.username_history (user_id, username) values (null, old_name);
  end if;
  update public.username_history set user_id = null where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from public.profile_private where user_id = uid;
  delete from public.consents where user_id = uid;
  delete from public.social_rate_limits where user_id = uid;
end;
$$;

-- Só quem está logado executa; a função interna de taxa não é chamável pelo cliente.
revoke execute on function public.social_rate_hit(text, interval, integer) from public, anon, authenticated;
revoke execute on function public.social_username_status(text) from public, anon;
revoke execute on function public.social_activate(date, text, text, text, text) from public, anon;
revoke execute on function public.social_change_username(text) from public, anon;
revoke execute on function public.social_set_active(boolean, text, text) from public, anon;
revoke execute on function public.social_delete_profile() from public, anon;

grant execute on function public.social_username_status(text) to authenticated;
grant execute on function public.social_activate(date, text, text, text, text) to authenticated;
grant execute on function public.social_change_username(text) to authenticated;
grant execute on function public.social_set_active(boolean, text, text) to authenticated;
grant execute on function public.social_delete_profile() to authenticated;
