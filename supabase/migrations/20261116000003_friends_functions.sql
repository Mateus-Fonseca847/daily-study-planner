-- =============================================================================================
-- Amizades (Prompt 16) — 3/4: funções privilegiadas (a única porta de escrita e leitura).
--
-- Todas: SECURITY DEFINER, `set search_path = ''`, recusam quem não está logado, só agem em nome
-- de auth.uid(), têm limite de taxa (social_rate_hit, do Prompt 15) e devolvem um CÓDIGO em vez de
-- lançar erro (o contador do limite fica gravado mesmo quando a tentativa falha).
--
-- Sem vazamento: não existe, outra faixa de idade, bloqueio em qualquer sentido, perfil
-- desativado ou suspenso → sempre o mesmo 'nao_encontrado'. Uma recusa nunca é revelada: quem
-- enviou continua vendo “pendente” (no máximo 7 dias) e um reenvio na carência responde 'ok'.
-- EXECUTE só para `authenticated`.
-- Reversão: supabase/rollback/20261116000003_friends_functions.down.sql.
-- =============================================================================================

-- Interna: bloqueia (idempotente) e desfaz tudo entre os dois. Usada por bloquear e denunciar.
create function public.social_aplicar_bloqueio(uid uuid, alvo uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.blocks (blocker, blocked, blocked_username, blocked_display_name)
    select uid, alvo, p.username, p.display_name
    from (select 1) as x
    left join public.profiles p on p.user_id = alvo
    on conflict (blocker, blocked) do nothing;
  delete from public.friendships where user_a = least(uid, alvo) and user_b = greatest(uid, alvo);
  delete from public.friend_requests
    where (from_user = uid and to_user = alvo) or (from_user = alvo and to_user = uid);
end;
$$;
revoke execute on function public.social_aplicar_bloqueio(uuid, uuid) from public, anon, authenticated;

-- ── Busca ─────────────────────────────────────────────────────────────────────────────────────
-- Só por @ (prefixo ou exato), 3 a 20 caracteres, até 10 resultados. Só perfis descobríveis,
-- utilizáveis, da mesma faixa, sem bloqueio e diferentes de quem busca. Sem foto: só @, nome e
-- a relação ('nenhuma', 'enviada', 'recebida', 'amigos'). 30 buscas por minuto e 500 por dia.
-- Devolve {status, itens}; status: 'ok', 'termo_invalido', 'limite' ou a situação do próprio
-- perfil ('sem_perfil', 'desativado', 'suspenso').
create function public.social_buscar_perfis(termo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  proprio text;
  t text := lower(btrim(coalesce(termo, '')));
  itens jsonb;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('busca:min', interval '1 minute', 30)
     or not public.social_rate_hit('busca:dia', interval '1 day', 500) then
    return jsonb_build_object('status', 'limite', 'itens', '[]'::jsonb);
  end if;
  proprio := public.social_estado_proprio(uid);
  if proprio <> 'ok' then
    return jsonb_build_object('status', proprio, 'itens', '[]'::jsonb);
  end if;
  if left(t, 1) = '@' then
    t := substr(t, 2);
  end if;
  if char_length(t) < 3 or char_length(t) > 20 or t !~ '^[a-z0-9._]+$' then
    return jsonb_build_object('status', 'termo_invalido', 'itens', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.user_id, 'username', r.username, 'nome', r.display_name, 'relacao', r.relacao
    ) order by r.exato desc, r.username), '[]'::jsonb)
    into itens
  from (
    select p.user_id, p.username, p.display_name, p.username = t as exato,
      case
        when exists (
          select 1 from public.friendships f
          where f.user_a = least(uid, p.user_id) and f.user_b = greatest(uid, p.user_id)
        ) then 'amigos'
        when exists (
          select 1 from public.friend_requests q
          where q.from_user = p.user_id and q.to_user = uid and q.status = 'pendente'
        ) then 'recebida'
        when exists (
          select 1 from public.friend_requests q
          where q.from_user = uid and q.to_user = p.user_id
            and (q.status = 'pendente' or q.sender_visible_until > now())
        ) then 'enviada'
        else 'nenhuma'
      end as relacao
    from public.profiles p
    where starts_with(p.username, t)
      and p.discoverable
      and public.social_podem_conectar(uid, p.user_id)
    order by (p.username = t) desc, p.username
    limit 10
  ) as r;

  return jsonb_build_object('status', 'ok', 'itens', itens);
end;
$$;

-- ── Solicitações ──────────────────────────────────────────────────────────────────────────────
-- Envia um pedido para `para`. Códigos: 'ok' (enviado, ou já estava pendente, ou reenvio na
-- carência de uma recusa — indistinguíveis), 'aceita' (havia um pedido dela para você: virou
-- amizade), 'ja_amigos', 'nao_encontrado', 'invalido', 'limite_pendentes' (20), 'limite_diario'
-- (20 envios por dia), 'limite_amigos' (você tem 200), 'limite_amigos_outro', ou a situação do
-- próprio perfil.
create function public.social_enviar_solicitacao(para uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  proprio text;
  existente public.friend_requests%rowtype;
  recebida bigint;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  proprio := public.social_estado_proprio(uid);
  if proprio <> 'ok' then
    return proprio;
  end if;
  if para is null or para = uid then
    return 'invalido';
  end if;
  if public.social_pendentes_enviadas(uid) >= 20 then
    return 'limite_pendentes';
  end if;
  if not public.social_rate_hit('pedido:dia', interval '1 day', 20) then
    return 'limite_diario';
  end if;
  if public.social_total_amigos(uid) >= 200 then
    return 'limite_amigos';
  end if;
  if not public.social_podem_conectar(uid, para) then
    return 'nao_encontrado';
  end if;
  if exists (
    select 1 from public.friendships f
    where f.user_a = least(uid, para) and f.user_b = greatest(uid, para)
  ) then
    return 'ja_amigos';
  end if;

  -- Envio cruzado: a outra pessoa já pediu → o pedido aceita o dela.
  select q.id into recebida from public.friend_requests q
    where q.from_user = para and q.to_user = uid and q.status = 'pendente'
    for update;
  if found then
    if public.social_total_amigos(para) >= 200 then
      return 'limite_amigos_outro';
    end if;
    insert into public.friendships (user_a, user_b)
      values (least(uid, para), greatest(uid, para))
      on conflict do nothing;
    delete from public.friend_requests
      where (from_user = uid and to_user = para) or (from_user = para and to_user = uid);
    return 'aceita';
  end if;

  -- Pedido novo só para quem é descobrível (a única forma de achar alguém nesta etapa).
  if not exists (select 1 from public.profiles p where p.user_id = para and p.discoverable) then
    return 'nao_encontrado';
  end if;

  -- Uma recusa antiga MINHA para ela (eu recusei) não importa mais: eu mudei de ideia.
  delete from public.friend_requests
    where from_user = para and to_user = uid and status = 'recusada';

  select * into existente from public.friend_requests q
    where q.from_user = uid and q.to_user = para
    for update;
  if found then
    if existente.status = 'pendente' then
      return 'ok';
    end if;
    -- Recusada há menos de 30 dias: parece enviado (volta a “pendente” por até 7 dias), mas a
    -- outra pessoa não recebe nada. Depois da carência, um pedido novo de verdade.
    if existente.responded_at > now() - interval '30 days' then
      update public.friend_requests
        set sender_visible_until = now() + interval '7 days'
        where id = existente.id;
      return 'ok';
    end if;
    delete from public.friend_requests where id = existente.id;
  end if;

  begin
    insert into public.friend_requests (from_user, to_user) values (uid, para);
  exception
    when unique_violation then
      return 'ok';
  end;
  return 'ok';
end;
$$;

-- Aceita ou recusa um pedido RECEBIDO. Códigos: 'ok', 'nao_encontrado' (não existe, não é para
-- você, ou a pessoa não está mais alcançável), 'limite_amigos', 'limite_amigos_outro', 'limite'
-- ou a situação do próprio perfil. A recusa nunca é avisada a quem enviou.
create function public.social_responder_solicitacao(pedido bigint, aceitar boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  proprio text;
  req public.friend_requests%rowtype;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('responder:h', interval '1 hour', 120) then
    return 'limite';
  end if;
  proprio := public.social_estado_proprio(uid);
  if proprio <> 'ok' then
    return proprio;
  end if;
  select * into req from public.friend_requests q
    where q.id = pedido and q.to_user = uid and q.status = 'pendente'
    for update;
  if not found or not public.social_podem_conectar(uid, req.from_user) then
    return 'nao_encontrado';
  end if;

  if coalesce(aceitar, false) then
    if public.social_total_amigos(uid) >= 200 then
      return 'limite_amigos';
    end if;
    if public.social_total_amigos(req.from_user) >= 200 then
      return 'limite_amigos_outro';
    end if;
    insert into public.friendships (user_a, user_b)
      values (least(uid, req.from_user), greatest(uid, req.from_user))
      on conflict do nothing;
    delete from public.friend_requests
      where (from_user = uid and to_user = req.from_user)
         or (from_user = req.from_user and to_user = uid);
  else
    update public.friend_requests
      set status = 'recusada', responded_at = now(), sender_visible_until = now() + interval '7 days'
      where id = req.id;
  end if;
  return 'ok';
end;
$$;

-- Cancela um pedido ENVIADO. Pendente: apaga (pode reenviar na hora). Já recusado (e ainda
-- visível como pendente): só some da lista; a carência de 30 dias continua. 'ok', 'nao_encontrado'
-- ou 'limite'.
create function public.social_cancelar_solicitacao(pedido bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  req public.friend_requests%rowtype;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('cancelar:h', interval '1 hour', 120) then
    return 'limite';
  end if;
  select * into req from public.friend_requests q
    where q.id = pedido and q.from_user = uid
    for update;
  if not found then
    return 'nao_encontrado';
  end if;
  if req.status = 'pendente' then
    delete from public.friend_requests where id = req.id;
  else
    update public.friend_requests set sender_visible_until = now() where id = req.id;
  end if;
  return 'ok';
end;
$$;

-- Desfaz a amizade (os dois lados de uma vez: é uma linha só). 'ok', 'nao_encontrado' ou 'limite'.
create function public.social_desfazer_amizade(amigo uuid)
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
  if not public.social_rate_hit('desfazer:h', interval '1 hour', 60) then
    return 'limite';
  end if;
  delete from public.friendships
    where user_a = least(uid, amigo) and user_b = greatest(uid, amigo);
  if not found then
    return 'nao_encontrado';
  end if;
  return 'ok';
end;
$$;

-- ── Listas ────────────────────────────────────────────────────────────────────────────────────
-- Amigos alcançáveis (perfil ativo, não suspenso, mesma faixa, sem bloqueio). A foto, se houver,
-- é lida à parte pelo Storage (política só para amigos). {status, itens}.
create function public.social_listar_amigos()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  proprio text;
  itens jsonb;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('listar_amigos:h', interval '1 hour', 240) then
    return jsonb_build_object('status', 'limite', 'itens', '[]'::jsonb);
  end if;
  proprio := public.social_estado_proprio(uid);
  if proprio = 'sem_perfil' or proprio = 'desativado' then
    return jsonb_build_object('status', proprio, 'itens', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.user_id, 'username', p.username, 'nome', p.display_name,
      'tem_foto', p.avatar_path is not null, 'versao_foto', p.avatar_version,
      'desde', f.created_at
    ) order by lower(p.display_name), p.username), '[]'::jsonb)
    into itens
  from public.friendships f
  join public.profiles p
    on p.user_id = case when f.user_a = uid then f.user_b else f.user_a end
  where (f.user_a = uid or f.user_b = uid)
    and public.social_is_minor(uid) = public.social_is_minor(p.user_id)
    and p.disabled_at is null and p.suspended_at is null
    and not exists (
      select 1 from public.blocks k
      where (k.blocker = uid and k.blocked = p.user_id) or (k.blocker = p.user_id and k.blocked = uid)
    );
  return jsonb_build_object('status', proprio, 'itens', itens);
end;
$$;

-- Pedidos recebidos (pendentes, de quem ainda é alcançável) e enviados (pendentes ou recusados
-- ainda visíveis — sempre mostrados como pendentes). {status, recebidas, enviadas}.
create function public.social_listar_solicitacoes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  proprio text;
  recebidas jsonb;
  enviadas jsonb;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('listar_pedidos:h', interval '1 hour', 240) then
    return jsonb_build_object('status', 'limite', 'recebidas', '[]'::jsonb, 'enviadas', '[]'::jsonb);
  end if;
  proprio := public.social_estado_proprio(uid);
  if proprio <> 'ok' then
    return jsonb_build_object('status', proprio, 'recebidas', '[]'::jsonb, 'enviadas', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'pessoa', p.user_id, 'username', p.username, 'nome', p.display_name,
      'criada', q.created_at
    ) order by q.created_at desc), '[]'::jsonb)
    into recebidas
  from public.friend_requests q
  join public.profiles p on p.user_id = q.from_user
  where q.to_user = uid and q.status = 'pendente'
    and public.social_podem_conectar(uid, q.from_user);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'pessoa', p.user_id, 'username', p.username, 'nome', p.display_name,
      'criada', q.created_at
    ) order by q.created_at desc), '[]'::jsonb)
    into enviadas
  from public.friend_requests q
  join public.profiles p on p.user_id = q.to_user
  where q.from_user = uid
    and (q.status = 'pendente' or q.sender_visible_until > now())
    and public.social_podem_conectar(uid, q.to_user);

  return jsonb_build_object('status', 'ok', 'recebidas', recebidas, 'enviadas', enviadas);
end;
$$;

-- Só o número de pedidos recebidos (para o distintivo). {status, total}. 240 por hora.
create function public.social_contar_solicitacoes_recebidas()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  proprio text;
  total integer;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('contar:h', interval '1 hour', 240) then
    return jsonb_build_object('status', 'limite', 'total', 0);
  end if;
  proprio := public.social_estado_proprio(uid);
  if proprio <> 'ok' then
    return jsonb_build_object('status', proprio, 'total', 0);
  end if;
  select count(*)::integer into total
  from public.friend_requests q
  where q.to_user = uid and q.status = 'pendente'
    and public.social_podem_conectar(uid, q.from_user);
  return jsonb_build_object('status', 'ok', 'total', total);
end;
$$;

-- ── Bloquear ──────────────────────────────────────────────────────────────────────────────────
-- Efeito imediato e nos dois sentidos: desfaz a amizade e apaga os pedidos entre os dois. A
-- outra pessoa não é avisada. Responde 'ok' mesmo para um id que não existe (sem enumeração).
-- 'ok', 'invalido', 'sem_perfil' ou 'limite' (50 por dia).
create function public.social_bloquear(pessoa uuid)
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
  if not exists (select 1 from public.profiles p where p.user_id = uid) then
    return 'sem_perfil';
  end if;
  if pessoa is null or pessoa = uid then
    return 'invalido';
  end if;
  if not public.social_rate_hit('bloquear:dia', interval '1 day', 50) then
    return 'limite';
  end if;
  if exists (select 1 from auth.users u where u.id = pessoa) then
    perform public.social_aplicar_bloqueio(uid, pessoa);
  end if;
  return 'ok';
end;
$$;

-- Desbloquear não restaura amizade nem pedidos. 'ok' ou 'limite'.
create function public.social_desbloquear(pessoa uuid)
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
  if not public.social_rate_hit('desbloquear:h', interval '1 hour', 60) then
    return 'limite';
  end if;
  delete from public.blocks where blocker = uid and blocked = pessoa;
  return 'ok';
end;
$$;

-- Quem EU bloqueei, pelo retrato guardado no bloqueio (nada do perfil atual). {status, itens}.
create function public.social_listar_bloqueados()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  itens jsonb;
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not public.social_rate_hit('listar_bloqueados:h', interval '1 hour', 240) then
    return jsonb_build_object('status', 'limite', 'itens', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.blocked, 'username', k.blocked_username, 'nome', k.blocked_display_name,
      'desde', k.created_at
    ) order by k.created_at desc), '[]'::jsonb)
    into itens
  from public.blocks k
  where k.blocker = uid;
  return jsonb_build_object('status', 'ok', 'itens', itens);
end;
$$;

-- ── Denunciar ─────────────────────────────────────────────────────────────────────────────────
-- Guarda o motivo, o detalhe opcional (até 500) e o retrato do @ e do nome. Ninguém lê pelo app.
-- `bloquear` (padrão no app: sim) também bloqueia. 5 por dia. 'ok', 'invalido', 'sem_perfil' ou
-- 'limite'. Um id que não existe responde 'ok' sem gravar (sem enumeração).
create function public.social_denunciar(
  pessoa uuid,
  motivo text,
  detalhe text default null,
  bloquear boolean default true
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  texto text := nullif(btrim(coalesce(detalhe, '')), '');
begin
  if uid is null then
    raise exception 'social:sem_login' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = uid) then
    return 'sem_perfil';
  end if;
  if pessoa is null or pessoa = uid
     or motivo is null
     or motivo not in ('perfil_improprio', 'foto_impropria', 'assedio', 'perfil_falso', 'outro')
     or char_length(coalesce(texto, '')) > 500 then
    return 'invalido';
  end if;
  if not public.social_rate_hit('denunciar:dia', interval '1 day', 5) then
    return 'limite';
  end if;
  if exists (select 1 from auth.users u where u.id = pessoa) then
    insert into public.reports
      (reporter_id, reported_id, reported_username, reported_display_name, reason, detail)
      select uid, pessoa, p.username, p.display_name, motivo, texto
      from (select 1) as x
      left join public.profiles p on p.user_id = pessoa;
    if coalesce(bloquear, false) then
      perform public.social_aplicar_bloqueio(uid, pessoa);
    end if;
  end if;
  return 'ok';
end;
$$;

-- Só quem está logado executa.
revoke execute on function public.social_buscar_perfis(text) from public, anon;
revoke execute on function public.social_enviar_solicitacao(uuid) from public, anon;
revoke execute on function public.social_responder_solicitacao(bigint, boolean) from public, anon;
revoke execute on function public.social_cancelar_solicitacao(bigint) from public, anon;
revoke execute on function public.social_desfazer_amizade(uuid) from public, anon;
revoke execute on function public.social_listar_amigos() from public, anon;
revoke execute on function public.social_listar_solicitacoes() from public, anon;
revoke execute on function public.social_contar_solicitacoes_recebidas() from public, anon;
revoke execute on function public.social_bloquear(uuid) from public, anon;
revoke execute on function public.social_desbloquear(uuid) from public, anon;
revoke execute on function public.social_listar_bloqueados() from public, anon;
revoke execute on function public.social_denunciar(uuid, text, text, boolean) from public, anon;

grant execute on function public.social_buscar_perfis(text) to authenticated;
grant execute on function public.social_enviar_solicitacao(uuid) to authenticated;
grant execute on function public.social_responder_solicitacao(bigint, boolean) to authenticated;
grant execute on function public.social_cancelar_solicitacao(bigint) to authenticated;
grant execute on function public.social_desfazer_amizade(uuid) to authenticated;
grant execute on function public.social_listar_amigos() to authenticated;
grant execute on function public.social_listar_solicitacoes() to authenticated;
grant execute on function public.social_contar_solicitacoes_recebidas() to authenticated;
grant execute on function public.social_bloquear(uuid) to authenticated;
grant execute on function public.social_desbloquear(uuid) to authenticated;
grant execute on function public.social_listar_bloqueados() to authenticated;
grant execute on function public.social_denunciar(uuid, text, text, boolean) to authenticated;
