-- Testes de segurança das amizades (pgTAP). Rodam no Supabase LOCAL (`supabase test db`), nunca
-- em produção. Pessoas (criadas direto como superusuário, para focar nas regras novas):
--   ana, bia, caio, edu, fabi, gabi, hugo, iris: adultas e descobríveis;  duda: adulta, NÃO descobrível;
--   malu, nina: 16 anos (nunca descobríveis);  zeca: conta sem perfil social.
-- Cada “sessão” troca o papel para `authenticated` (ou `anon`) com o `sub` do JWT.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

create temp table ids (nome text primary key, id uuid not null);
grant select on ids to authenticated, anon;

create function pg_temp.u(n text) returns uuid language sql stable as $$
  select id from pg_temp.ids where nome = n;
$$;
grant execute on function pg_temp.u(text) to authenticated, anon;

create function pg_temp.sessao(n text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.u(n), 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.sessao(text) to authenticated, anon;

create function pg_temp.conta(n text) returns uuid language plpgsql as $$
declare novo uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, aud, role) values (novo, n || '@t.local', 'authenticated', 'authenticated');
  insert into pg_temp.ids values (n, novo);
  return novo;
end $$;

create function pg_temp.pessoa(n text, maior boolean, descobrivel boolean) returns uuid language plpgsql as $$
declare novo uuid := pg_temp.conta(n);
begin
  insert into public.profile_private (user_id, birth_month)
    values (novo, date_trunc('month', current_date - case when maior then interval '30 years' else interval '16 years' end)::date);
  insert into public.profiles (user_id, username, display_name, discoverable)
    values (novo, n, initcap(n), descobrivel);
  return novo;
end $$;

select pg_temp.pessoa('ana', true, true);
select pg_temp.pessoa('bia', true, true);
select pg_temp.pessoa('caio', true, true);
select pg_temp.pessoa('duda', true, false);
select pg_temp.pessoa('edu', true, true);
select pg_temp.pessoa('fabi', true, true);
select pg_temp.pessoa('gabi', true, true);
select pg_temp.pessoa('hugo', true, true);
select pg_temp.pessoa('iris', true, true);
select pg_temp.pessoa('malu', false, false);
select pg_temp.pessoa('nina', false, false);
select pg_temp.conta('zeca');

-- Atalhos (rodam com o papel da sessão).
create function pg_temp.enviar(para text) returns text language sql as $$
  select public.social_enviar_solicitacao(pg_temp.u(para));
$$;
create function pg_temp.busca(termo text) returns jsonb language sql as $$
  select public.social_buscar_perfis(termo);
$$;
create function pg_temp.achados(termo text) returns text language sql as $$
  select coalesce(string_agg(i->>'username', ',' order by i->>'username'), '')
  from jsonb_array_elements(public.social_buscar_perfis(termo)->'itens') as i;
$$;
create function pg_temp.relacao(termo text) returns text language sql as $$
  select i->>'relacao' from jsonb_array_elements(public.social_buscar_perfis(termo)->'itens') as i
  where i->>'username' = termo;
$$;
create function pg_temp.recebida_de(n text) returns bigint language sql as $$
  select (i->>'id')::bigint from jsonb_array_elements(public.social_listar_solicitacoes()->'recebidas') as i
  where i->>'username' = n;
$$;
create function pg_temp.enviada_para(n text) returns bigint language sql as $$
  select (i->>'id')::bigint from jsonb_array_elements(public.social_listar_solicitacoes()->'enviadas') as i
  where i->>'username' = n;
$$;
create function pg_temp.amigos() returns text language sql as $$
  select coalesce(string_agg(i->>'username', ',' order by i->>'username'), '')
  from jsonb_array_elements(public.social_listar_amigos()->'itens') as i;
$$;
create function pg_temp.ve_foto(dono text) returns integer language sql as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = 'avatars' and o.name = pg_temp.u(dono)::text || '/avatar.webp';
$$;
grant execute on function pg_temp.enviar(text), pg_temp.busca(text), pg_temp.achados(text),
  pg_temp.relacao(text), pg_temp.recebida_de(text), pg_temp.enviada_para(text), pg_temp.amigos(),
  pg_temp.ve_foto(text) to authenticated, anon;

-- ── 1. O cliente não acessa as tabelas novas diretamente ──────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('ana');
select throws_ok($$ select count(*) from public.friend_requests $$, '42501', null, 'sem leitura direta de friend_requests');
select throws_ok($$ select count(*) from public.friendships $$, '42501', null, 'sem leitura direta de friendships');
select throws_ok($$ select count(*) from public.blocks $$, '42501', null, 'sem leitura direta de blocks');
select throws_ok($$ select count(*) from public.reports $$, '42501', null, 'denúncias ilegíveis pelo app');
select throws_ok(format($$ insert into public.friend_requests (from_user, to_user) values (%L, %L) $$, pg_temp.u('ana'), pg_temp.u('bia')),
  '42501', null, 'sem insert direto de solicitação');
select throws_ok(format($$ insert into public.friendships (user_a, user_b) values (least(%1$L::uuid, %2$L::uuid), greatest(%1$L::uuid, %2$L::uuid)) $$, pg_temp.u('ana'), pg_temp.u('bia')),
  '42501', null, 'sem insert direto de amizade');
select throws_ok(format($$ insert into public.blocks (blocker, blocked) values (%L, %L) $$, pg_temp.u('ana'), pg_temp.u('bia')),
  '42501', null, 'sem insert direto de bloqueio');
select throws_ok(format($$ insert into public.reports (reporter_id, reported_id, reason) values (%L, %L, 'outro') $$, pg_temp.u('ana'), pg_temp.u('bia')),
  '42501', null, 'sem insert direto de denúncia');
select throws_ok($$ update public.friend_requests set status = 'pendente' $$, '42501', null, 'sem update direto');
select throws_ok($$ delete from public.blocks $$, '42501', null, 'sem delete direto de bloqueio');
select throws_ok($$ delete from public.reports $$, '42501', null, 'sem delete direto de denúncia');
select throws_ok(format($$ update public.profiles set suspended_at = null where user_id = %L $$, pg_temp.u('ana')),
  '42501', null, 'a pessoa não mexe na própria suspensão');
select ok((select suspended_at is null from public.profiles), 'mas lê a própria linha (suspensão inclusa)');
select throws_ok($$ select public.social_rate_hit('x', interval '1 minute', 1) $$, '42501', null, 'limite de taxa interno');
select throws_ok(format($$ select public.social_podem_conectar(%L, %L) $$, pg_temp.u('bia'), pg_temp.u('caio')),
  '42501', null, 'auxiliar interna não é chamável');
reset role;

set local role anon;
select throws_ok($$ select public.social_buscar_perfis('bia') $$, '42501', null, 'anônimo não busca');
select throws_ok(format($$ select public.social_enviar_solicitacao(%L) $$, pg_temp.u('bia')), '42501', null, 'anônimo não envia');
select throws_ok($$ select count(*) from public.friendships $$, '42501', null, 'anônimo não lê amizades');
reset role;

-- ── 2. Busca ──────────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.busca('bi')->>'status', 'termo_invalido', 'busca: mínimo de 3 caracteres');
select is(pg_temp.busca('b%a')->>'status', 'termo_invalido', 'busca: só caracteres de @ (sem curinga)');
select is(pg_temp.achados('bia'), 'bia', 'busca exata');
select is(pg_temp.achados('@BIA'), 'bia', 'busca normaliza @ e maiúsculas');
select is(pg_temp.achados('cai'), 'caio', 'busca por prefixo');
select is(pg_temp.achados('ana'), '', 'não acha a si mesma');
select is(pg_temp.achados('duda'), '', 'não acha quem não é descobrível');
select is(pg_temp.achados('malu'), '', 'não acha 14–17 (nunca descobríveis)');
select is(pg_temp.busca('duda'), pg_temp.busca('xyzw'), 'não descobrível = inexistente (sem enumeração)');
select is((select array_agg(k order by k) from jsonb_array_elements(pg_temp.busca('bia')->'itens') as i, jsonb_object_keys(i) as k),
  array['id', 'nome', 'relacao', 'username'], 'resultado só com id, @, nome e relação (sem foto nem idade)');
select is(pg_temp.relacao('bia'), 'nenhuma', 'relação inicial: nenhuma');
select pg_temp.sessao('zeca');
select is(pg_temp.busca('bia')->>'status', 'sem_perfil', 'sem perfil social não busca');
select pg_temp.sessao('malu');
select is(pg_temp.achados('nina'), '', '14–17 não acham ninguém');
reset role;

-- ── 3. Pedido, envio cruzado e simetria ───────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.enviar('bia'), 'ok', 'ana pede bia');
select is(pg_temp.enviar('bia'), 'ok', 'repetir o pedido é idempotente');
select is(pg_temp.relacao('bia'), 'enviada', 'ana vê “enviada”');
select ok(pg_temp.enviada_para('bia') is not null, 'ana vê o pedido nas enviadas');
select pg_temp.sessao('bia');
select is(pg_temp.relacao('ana'), 'recebida', 'bia vê “recebida”');
select is((public.social_contar_solicitacoes_recebidas()->>'total')::int, 1, 'contador de recebidas');
select pg_temp.sessao('caio');
select is(public.social_responder_solicitacao(null, true), 'nao_encontrado', 'pedido nulo');
reset role;
create temp table pedido_ab as select id from public.friend_requests where from_user = pg_temp.u('ana') and to_user = pg_temp.u('bia');
grant select on pedido_ab to authenticated;
set local role authenticated;
select pg_temp.sessao('caio');
select is(public.social_responder_solicitacao((select id from pedido_ab), true), 'nao_encontrado', 'caio não aceita pedido que não é para ele');
select is((public.social_listar_solicitacoes()->'recebidas')::text, '[]', 'caio não vê pedidos de outros');
select pg_temp.sessao('ana');
select is(public.social_responder_solicitacao((select id from pedido_ab), true), 'nao_encontrado', 'quem enviou não aceita o próprio pedido');
select pg_temp.sessao('bia');
select is(pg_temp.enviar('ana'), 'aceita', 'envio cruzado vira aceite');
reset role;
select is((select count(*)::int from public.friendships where user_a = least(pg_temp.u('ana'), pg_temp.u('bia')) and user_b = greatest(pg_temp.u('ana'), pg_temp.u('bia'))),
  1, 'uma linha por par, canônica');
select is((select count(*)::int from public.friend_requests where pg_temp.u('ana') in (from_user, to_user) and pg_temp.u('bia') in (from_user, to_user)),
  0, 'aceitar apaga a solicitação');
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.amigos(), 'bia', 'amizade simétrica (ana)');
select is(pg_temp.enviar('bia'), 'ja_amigos', 'já amigos');
select is(pg_temp.relacao('bia'), 'amigos', 'busca mostra “amigos”');
select pg_temp.sessao('bia');
select is(pg_temp.amigos(), 'ana', 'amizade simétrica (bia)');
select is(public.social_desfazer_amizade(pg_temp.u('ana')), 'ok', 'bia desfaz a amizade');
select is(pg_temp.amigos(), '', 'some para bia');
select pg_temp.sessao('ana');
select is(pg_temp.amigos(), '', 'some para ana');
select is(public.social_desfazer_amizade(pg_temp.u('bia')), 'nao_encontrado', 'desfazer de novo: nada');
reset role;

-- ── 4. Aceitar pela resposta, recusa sem aviso e carência de 30 dias ──────────────────────────
set local role authenticated;
select pg_temp.sessao('caio');
select is(pg_temp.enviar('gabi'), 'ok', 'caio pede gabi');
select pg_temp.sessao('gabi');
select is(public.social_responder_solicitacao(pg_temp.recebida_de('caio'), true), 'ok', 'gabi aceita');
select is(pg_temp.amigos(), 'caio', 'aceitar cria a amizade');

select pg_temp.sessao('ana');
select is(pg_temp.enviar('caio'), 'ok', 'ana pede caio');
select pg_temp.sessao('caio');
select is(public.social_responder_solicitacao(pg_temp.recebida_de('ana'), false), 'ok', 'caio recusa');
select is(pg_temp.recebida_de('ana'), null, 'recusado some das recebidas');
select pg_temp.sessao('ana');
select ok(pg_temp.enviada_para('caio') is not null, 'quem enviou continua vendo “pendente”');
select is(pg_temp.relacao('caio'), 'enviada', 'e a busca também');
select is(pg_temp.enviar('caio'), 'ok', 'reenviar na carência responde igual a um envio (sem revelar)');
reset role;
select is((select status from public.friend_requests where from_user = pg_temp.u('ana') and to_user = pg_temp.u('caio')), 'recusada',
  'mas nenhum pedido novo chega a caio');
-- 8 dias depois da recusa: some sem explicação.
update public.friend_requests set responded_at = now() - interval '8 days', sender_visible_until = now() - interval '1 day'
  where from_user = pg_temp.u('ana') and to_user = pg_temp.u('caio');
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.enviada_para('caio'), null, 'depois de 7 dias some das enviadas');
select is(pg_temp.relacao('caio'), 'nenhuma', 'e da busca');
select is(pg_temp.enviar('caio'), 'ok', 'reenvio no dia 8: ainda na carência');
select pg_temp.sessao('caio');
select is(pg_temp.recebida_de('ana'), null, 'caio continua sem receber');
reset role;
-- 31 dias depois: pedido novo de verdade.
update public.friend_requests set responded_at = now() - interval '31 days', sender_visible_until = now() - interval '24 days'
  where from_user = pg_temp.u('ana') and to_user = pg_temp.u('caio');
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.enviar('caio'), 'ok', 'depois de 30 dias, reenvia');
select pg_temp.sessao('caio');
select ok(pg_temp.recebida_de('ana') is not null, 'caio recebe o pedido novo');
select is(public.social_cancelar_solicitacao(pg_temp.recebida_de('ana')), 'nao_encontrado', 'quem recebeu não cancela');

-- Cancelar e reenviar na hora.
select pg_temp.sessao('ana');
select is(public.social_cancelar_solicitacao(pg_temp.enviada_para('caio')), 'ok', 'ana cancela');
select is(pg_temp.enviada_para('caio'), null, 'cancelado some');
select pg_temp.sessao('caio');
select is(pg_temp.recebida_de('ana'), null, 'e some para caio');
select pg_temp.sessao('ana');
select is(pg_temp.enviar('caio'), 'ok', 'cancelar libera reenvio imediato');
select pg_temp.sessao('caio');
select ok(pg_temp.recebida_de('ana') is not null, 'caio recebe de novo');
reset role;

-- ── 5. Faixas de idade, existência e alcance: a mesma resposta ────────────────────────────────
set local role authenticated;
select pg_temp.sessao('iris');
select is(pg_temp.enviar('malu'), 'nao_encontrado', 'adulto → 14–17: não encontrado');
select is(pg_temp.enviar('zeca'), 'nao_encontrado', 'conta sem perfil: não encontrado');
select is(public.social_enviar_solicitacao(gen_random_uuid()), 'nao_encontrado', 'id inexistente: não encontrado');
select is(pg_temp.enviar('duda'), 'nao_encontrado', 'não descobrível: não encontrado');
select is(pg_temp.enviar('iris'), 'invalido', 'para si mesma: inválido');
select pg_temp.sessao('malu');
select is(pg_temp.enviar('iris'), 'nao_encontrado', '14–17 → adulto: não encontrado');
select is(pg_temp.enviar('nina'), 'nao_encontrado', '14–17 → 14–17 não descobrível: não encontrado');
reset role;
-- Mesmo com um pedido forjado entre faixas, nada se conecta.
insert into public.friend_requests (from_user, to_user) values (pg_temp.u('malu'), pg_temp.u('iris'));
set local role authenticated;
select pg_temp.sessao('iris');
select is(pg_temp.recebida_de('malu'), null, 'pedido entre faixas não aparece');
select is(pg_temp.enviar('malu'), 'nao_encontrado', 'e o envio cruzado também não conecta');
reset role;
delete from public.friend_requests where from_user = pg_temp.u('malu');

-- ── 6. Bloquear nos dois sentidos ─────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.enviar('bia'), 'ok', 'ana pede bia de novo');
select pg_temp.sessao('bia');
select is(pg_temp.enviar('ana'), 'aceita', 'amigas de novo');
select pg_temp.sessao('edu');
select is(pg_temp.enviar('ana'), 'ok', 'edu pede ana');
select pg_temp.sessao('ana');
select is(public.social_bloquear(pg_temp.u('bia')), 'ok', 'ana bloqueia bia');
select is(pg_temp.amigos(), '', 'bloquear desfaz a amizade');
select is(pg_temp.achados('bia'), '', 'bia some da busca de ana');
select is(pg_temp.enviar('bia'), 'nao_encontrado', 'ana não pede quem bloqueou');
select is((select string_agg(i->>'username', ',') from jsonb_array_elements(public.social_listar_bloqueados()->'itens') as i), 'bia', 'lista de bloqueados');
select pg_temp.sessao('bia');
select is(pg_temp.amigos(), '', 'some também para bia');
select is(pg_temp.achados('ana'), '', 'ana some da busca de bia');
select is(pg_temp.enviar('ana'), pg_temp.enviar('zeca'), 'bloqueada não distingue bloqueio de inexistência');
select is((public.social_listar_bloqueados()->'itens')::text, '[]', 'bia não vê a lista de ana');
reset role;
select is((select count(*)::int from public.friend_requests where pg_temp.u('ana') in (from_user, to_user) and pg_temp.u('bia') in (from_user, to_user)),
  0, 'bloquear apaga os pedidos entre as duas');
set local role authenticated;
select pg_temp.sessao('ana');
select is(public.social_desbloquear(pg_temp.u('bia')), 'ok', 'ana desbloqueia');
select is(pg_temp.amigos(), '', 'desbloquear não restaura a amizade');
select is(pg_temp.achados('bia'), 'bia', 'bia volta a aparecer');
select pg_temp.sessao('bia');
select is(public.social_bloquear(pg_temp.u('ana')), 'ok', 'agora bia bloqueia ana');
select pg_temp.sessao('ana');
select is(pg_temp.achados('bia'), '', 'bloqueio do outro lado também esconde');
select is(public.social_bloquear(gen_random_uuid()), 'ok', 'bloquear id inexistente responde igual');
select is(public.social_bloquear(pg_temp.u('ana')), 'invalido', 'não se bloqueia a si mesma');
select pg_temp.sessao('bia');
select is(public.social_desbloquear(pg_temp.u('ana')), 'ok', 'bia desbloqueia');
reset role;

-- ── 7. Suspensão (só pelo dono do projeto) ────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.achados('edu'), 'edu', 'edu aparece antes da suspensão');
reset role;
update public.profiles set suspended_at = now(), suspended_reason = 'teste' where user_id = pg_temp.u('edu');
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.achados('edu'), '', 'suspenso some da busca');
select is(pg_temp.recebida_de('edu'), null, 'pedido de suspenso some das recebidas');
select pg_temp.sessao('edu');
select is(pg_temp.enviar('fabi'), 'suspenso', 'suspenso não envia pedidos');
select is(pg_temp.busca('fabi')->>'status', 'suspenso', 'suspenso não busca');
reset role;
update public.profiles set suspended_at = null, suspended_reason = null where user_id = pg_temp.u('edu');

-- ── 8. Foto: só amigos, e nunca após bloqueio ou suspensão ────────────────────────────────────
insert into storage.objects (bucket_id, name, owner)
  values ('avatars', pg_temp.u('caio')::text || '/avatar.webp', pg_temp.u('caio'));
set local role authenticated;
select pg_temp.sessao('ana');
select is(pg_temp.ve_foto('caio'), 0, 'antes da amizade, ninguém além do dono lê a foto');
select pg_temp.sessao('gabi');
select is(pg_temp.ve_foto('caio'), 1, 'amiga lê a foto');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 1, 'e só a do amigo');
select is(public.social_pode_ver_avatar('../' || pg_temp.u('caio')::text || '/avatar.webp'), false, 'caminho fora do padrão: não');
select is(public.social_pode_ver_avatar(pg_temp.u('caio')::text || '/outra.webp'), false, 'outro arquivo: não');
select pg_temp.sessao('caio');
select is(pg_temp.ve_foto('caio'), 1, 'o dono continua lendo');
select is(public.social_bloquear(pg_temp.u('gabi')), 'ok', 'caio bloqueia gabi');
select pg_temp.sessao('gabi');
select is(pg_temp.ve_foto('caio'), 0, 'após o bloqueio, a ex-amiga não lê');
select pg_temp.sessao('caio');
select is(public.social_desbloquear(pg_temp.u('gabi')), 'ok', 'caio desbloqueia');
select pg_temp.sessao('gabi');
select is(pg_temp.ve_foto('caio'), 0, 'desbloquear não devolve a foto (sem amizade)');
select is(pg_temp.enviar('caio'), 'ok', 'gabi pede caio');
select pg_temp.sessao('caio');
select is(public.social_responder_solicitacao(pg_temp.recebida_de('gabi'), true), 'ok', 'caio aceita');
select pg_temp.sessao('gabi');
select is(pg_temp.ve_foto('caio'), 1, 'amigos de novo: lê');
reset role;
update public.profiles set suspended_at = now() where user_id = pg_temp.u('caio');
set local role authenticated;
select pg_temp.sessao('gabi');
select is(pg_temp.ve_foto('caio'), 0, 'dono suspenso: ninguém lê');
select is(pg_temp.amigos(), '', 'suspenso some da lista de amigos');
reset role;
update public.profiles set suspended_at = null where user_id = pg_temp.u('caio');
update public.profiles set disabled_at = now() where user_id = pg_temp.u('gabi');
set local role authenticated;
select pg_temp.sessao('gabi');
select is(pg_temp.ve_foto('caio'), 0, 'quem desativou o perfil não lê fotos');
reset role;
update public.profiles set disabled_at = null where user_id = pg_temp.u('gabi');

-- ── 9. Limites ────────────────────────────────────────────────────────────────────────────────
-- 20 pendentes enviados.
select pg_temp.pessoa('p' || lpad(i::text, 3, '0'), true, true) from generate_series(1, 21) as i;
set local role authenticated;
select pg_temp.sessao('fabi');
select is((select count(*)::int from generate_series(1, 20) as i where pg_temp.enviar('p' || lpad(i::text, 3, '0')) = 'ok'),
  20, '20 pedidos pendentes cabem');
select is(pg_temp.enviar('p021'), 'limite_pendentes', 'o 21º pendente é recusado');
-- 20 envios por dia (cancelar não devolve o envio).
select pg_temp.sessao('hugo');
select is((select count(*)::int from generate_series(1, 20) as i
  where pg_temp.enviar('p001') = 'ok' and public.social_cancelar_solicitacao(pg_temp.enviada_para('p001')) = 'ok'),
  20, '20 envios no dia');
select is(pg_temp.enviar('p002'), 'limite_diario', 'o 21º envio do dia é recusado');
reset role;
-- 200 amigos.
create temp table cem as select gen_random_uuid() as id from generate_series(1, 200);
insert into auth.users (id, email, aud, role) select id, id::text || '@t.local', 'authenticated', 'authenticated' from cem;
insert into public.friendships (user_a, user_b)
  select least(pg_temp.u('duda'), id), greatest(pg_temp.u('duda'), id) from cem;
set local role authenticated;
select pg_temp.sessao('duda');
select is(pg_temp.enviar('p003'), 'limite_amigos', 'com 200 amigos não pede mais');
select pg_temp.sessao('p003');
select is(pg_temp.enviar('duda'), 'nao_encontrado', '(duda não é descobrível)');
reset role;
insert into public.friend_requests (from_user, to_user) values (pg_temp.u('p004'), pg_temp.u('duda'));
set local role authenticated;
select pg_temp.sessao('duda');
select is(public.social_responder_solicitacao(pg_temp.recebida_de('p004'), true), 'limite_amigos', 'com 200 amigos não aceita mais');
reset role;
-- 30 buscas por minuto.
set local role authenticated;
select pg_temp.sessao('p005');
select is((select count(*)::int from generate_series(1, 30) as i where pg_temp.busca('bia')->>'status' = 'ok'), 30, '30 buscas no minuto');
select is(pg_temp.busca('bia')->>'status', 'limite', 'a 31ª busca no minuto é recusada');
reset role;

-- ── 10. Denúncias ─────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('bia');
select is(public.social_denunciar(pg_temp.u('caio'), 'spam', null, false), 'invalido', 'motivo fora da lista');
select is(public.social_denunciar(pg_temp.u('caio'), 'outro', repeat('x', 501), false), 'invalido', 'detalhe com mais de 500');
select is(public.social_denunciar(pg_temp.u('bia'), 'outro', null, false), 'invalido', 'não denuncia a si mesma');
select is(public.social_denunciar(pg_temp.u('caio'), 'assedio', 'mensagem ofensiva', true), 'ok', 'denúncia com “bloquear também”');
select is(pg_temp.achados('caio'), '', 'denunciar e bloquear: some da busca');
select is(public.social_denunciar(gen_random_uuid(), 'outro', null, false), 'ok', 'id inexistente responde igual');
select is((select count(*)::int from generate_series(1, 3) as i where public.social_denunciar(pg_temp.u('hugo'), 'outro', null, false) = 'ok'),
  3, 'até 5 denúncias no dia');
select is(public.social_denunciar(pg_temp.u('hugo'), 'outro', null, false), 'limite', 'a 6ª denúncia do dia é recusada');
select throws_ok($$ select count(*) from public.reports $$, '42501', null, 'quem denunciou não lê a denúncia');
select pg_temp.sessao('caio');
select throws_ok($$ select count(*) from public.reports $$, '42501', null, 'quem foi denunciado não lê a denúncia');
reset role;
select is((select reported_username || '|' || reported_display_name || '|' || reason from public.reports
  where reporter_id = pg_temp.u('bia') and reported_id = pg_temp.u('caio')), 'caio|Caio|assedio', 'retrato do @ e do nome');
select ok(exists (select 1 from public.blocks where blocker = pg_temp.u('bia') and blocked = pg_temp.u('caio')), 'bloqueio gravado');

-- ── 11. Exclusões ─────────────────────────────────────────────────────────────────────────────
-- Perfil social: some tudo dela, menos os bloqueios feitos contra ela.
set local role authenticated;
select pg_temp.sessao('gabi');
select is(public.social_bloquear(pg_temp.u('hugo')), 'ok', 'gabi bloqueia hugo');
select pg_temp.sessao('ana');
select is(public.social_bloquear(pg_temp.u('gabi')), 'ok', 'ana bloqueia gabi');
select pg_temp.sessao('gabi');
select lives_ok($$ select public.social_delete_profile() $$, 'gabi exclui o perfil social');
reset role;
select is((select count(*)::int from public.friendships where pg_temp.u('gabi') in (user_a, user_b)), 0, 'excluir perfil: sem amizades');
select is((select count(*)::int from public.friend_requests where pg_temp.u('gabi') in (from_user, to_user)), 0, 'excluir perfil: sem pedidos');
select is((select count(*)::int from public.blocks where blocker = pg_temp.u('gabi')), 0, 'excluir perfil: sem os bloqueios que fez');
select is((select count(*)::int from public.blocks where blocked = pg_temp.u('gabi')), 1, 'o bloqueio de ana contra gabi continua');

-- Conta: tudo em cascata; as denúncias ficam, anônimas.
insert into public.reports (reporter_id, reported_id, reported_username, reported_display_name, reason)
  values (pg_temp.u('caio'), pg_temp.u('bia'), 'bia', 'Bia', 'outro');
delete from auth.users where id = pg_temp.u('bia');
select is((select count(*)::int from public.friendships where pg_temp.u('bia') in (user_a, user_b)), 0, 'conta excluída: sem amizades');
select is((select count(*)::int from public.friend_requests where pg_temp.u('bia') in (from_user, to_user)), 0, 'conta excluída: sem pedidos');
select is((select count(*)::int from public.blocks where pg_temp.u('bia') in (blocker, blocked)), 0, 'conta excluída: sem bloqueios');
select is((select count(*)::int from public.reports where reporter_id = pg_temp.u('bia') or reported_id = pg_temp.u('bia')), 0,
  'conta excluída: denúncias sem os identificadores');
select is((select count(*)::int from public.reports where reporter_id is null and reason = 'assedio' and reported_username = 'caio'), 1,
  'a denúncia feita por ela continua, anônima');
select is((select count(*)::int from public.reports where reported_id is null and reported_username = 'bia'), 1,
  'a denúncia contra ela continua (retrato), sem o vínculo');

select * from finish();
rollback;
