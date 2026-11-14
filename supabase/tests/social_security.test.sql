-- Testes de segurança do perfil social (pgTAP). Rodam no Supabase LOCAL (`supabase test db`),
-- nunca em produção. Usuários de teste: A e B (adultos), C (sem perfil), D (14 anos hoje).
-- Cada “sessão” troca o papel para `authenticated` (ou `anon`) com o `sub` do JWT do usuário.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

-- Usuários de teste.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'c@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 'd@teste.local', 'authenticated', 'authenticated');

create function pg_temp.sessao(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.sessao(text) to authenticated, anon;

-- ── Ativação ──────────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000a');
select is(public.social_activate((current_date - interval '20 years')::date, 'a_user', 'Ana', 'perfil-social-2026-11', 'privacidade-2026-11'),
  'ok', 'A ativa o perfil');
select is(public.social_activate((current_date - interval '20 years')::date, 'a_user2', 'Ana', 'v', 'v'),
  'ja_ativo', 'A não ativa duas vezes');

select pg_temp.sessao('00000000-0000-0000-0000-00000000000b');
select is(public.social_activate((current_date - interval '30 years')::date, 'b.user', 'Bia', 'perfil-social-2026-11', 'privacidade-2026-11'),
  'ok', 'B ativa o perfil');
select is(public.social_activate((current_date - interval '30 years')::date, 'b.user', 'Bia', 'v', 'v'),
  'ja_ativo', 'B já ativo');

-- D faz 14 anos hoje: pode.
select pg_temp.sessao('00000000-0000-0000-0000-00000000000d');
select is(public.social_activate((current_date - interval '14 years')::date, 'dora', 'Dora', 'v', 'v'),
  'ok', '14 anos completos no dia do aniversário');

-- C tem 13 anos e 364 dias: recusado, e nada do perfil é gravado.
select pg_temp.sessao('00000000-0000-0000-0000-00000000000c');
select is(public.social_activate((current_date - interval '14 years' + interval '1 day')::date, 'caio', 'Caio', 'v', 'v'),
  'menor_de_14', 'menor de 14 é recusado');
select is(public.social_activate(null, 'caio', 'Caio', 'v', 'v'), 'data_invalida', 'data nula recusada');
select is(public.social_activate((current_date + 1)::date, 'caio', 'Caio', 'v', 'v'), 'data_invalida', 'data futura recusada');
select is(public.social_activate((current_date - interval '20 years')::date, 'caio', 'Caio', '', 'v'), 'sem_consentimento', 'sem aceite recusado');
select is(public.social_activate((current_date - interval '20 years')::date, 'caio', '   ', 'v', 'v'), 'nome_invalido', 'nome só com espaços recusado');
reset role;
select is((select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-00000000000c'), 0, 'menor: nenhum perfil');
select is((select count(*)::int from public.profile_private where user_id = '00000000-0000-0000-0000-00000000000c'), 0, 'menor: nenhum dado de idade');
select is((select count(*)::int from public.consents where user_id = '00000000-0000-0000-0000-00000000000c'), 0, 'menor: nenhum aceite');

-- Minimização: só o primeiro dia do mês de nascimento.
select is((select extract(day from birth_month)::int from public.profile_private where user_id = '00000000-0000-0000-0000-00000000000a'), 1, 'guarda só ano e mês');

-- 29/02 (regra de age(), a mesma do app): 14 anos completos em 01/03 num ano comum.
select is(extract(year from age(date '2026-02-28', date '2012-02-29'))::int, 13, '29/02: ainda 13 em 28/02');
select is(extract(year from age(date '2026-03-01', date '2012-02-29'))::int, 14, '29/02: 14 em 01/03');

-- ── Isolamento entre usuários ─────────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.profiles), 1, 'A só vê o próprio perfil');
select is((select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'), 0, 'A não lê B');
select is((select count(*)::int from public.profile_private), 1, 'A só vê a própria idade');
select is((select count(*)::int from public.consents), 2, 'A só vê os próprios aceites');
select is((select count(*)::int from public.consents where user_id <> '00000000-0000-0000-0000-00000000000a'), 0, 'A não lê aceites de outros');

-- A tenta escrever em B: nenhuma linha muda.
update public.profiles set display_name = 'Invasora' where user_id = '00000000-0000-0000-0000-00000000000b';
select throws_ok($$ update public.profiles set username = 'roubado' where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'o @ não muda por UPDATE direto (só pela função)');
select throws_ok($$ insert into public.profiles (user_id, username, display_name) values ('00000000-0000-0000-0000-00000000000c', 'xyz', 'X') $$,
  '42501', null, 'ninguém insere perfil direto');
select throws_ok($$ delete from public.profiles $$, '42501', null, 'ninguém apaga perfil direto');
select throws_ok($$ insert into public.consents (user_id, kind, text_version) values ('00000000-0000-0000-0000-00000000000a', 'perfil_social', 'falso') $$,
  '42501', null, 'aceite só pela função');
select throws_ok($$ select * from public.reserved_usernames $$, '42501', null, 'lista de reservados não é lida direto');
select throws_ok($$ select * from public.social_rate_limits $$, '42501', null, 'contadores não são lidos direto');
select throws_ok($$ select public.social_rate_hit('x', interval '1 minute', 1) $$, '42501', null, 'função interna de taxa não é chamável');
select lives_ok($$ update public.profiles set show_stats = true, display_name = 'Ana B.' where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'A (adulta) edita o próprio perfil');
select throws_ok($$ update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000b/avatar.webp' $$,
  '23514', null, 'a foto só pode estar no caminho do próprio usuário');
reset role;
select is((select display_name from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'), 'Bia', 'B continua intacta');

-- Adolescente (14–17): interruptores além do básico ficam travados.
set local role authenticated;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000d');
select throws_ok($$ update public.profiles set discoverable = true $$, '23514', 'social:menor_restrito', '14–17 não fica descobrível');
select throws_ok($$ update public.profiles set show_stats = true $$, '23514', 'social:menor_restrito', '14–17 não mostra estatísticas');

-- ── Anônimo ───────────────────────────────────────────────────────────────────────────────────
reset role;
set local role anon;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anônimo não lê perfis');
select throws_ok($$ select * from public.profile_private $$, '42501', null, 'anônimo não lê idade');
select throws_ok($$ select * from public.consents $$, '42501', null, 'anônimo não lê aceites');
select throws_ok($$ select public.social_username_status('livre') $$, '42501', null, 'anônimo não consulta @');
select throws_ok($$ select public.social_activate(current_date, 'x_y', 'X', 'v', 'v') $$, '42501', null, 'anônimo não ativa');
reset role;

-- ── Regras do @ ───────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000c');
select is(public.social_username_status('ab'), 'invalido', 'curto demais (2)');
select is(public.social_username_status('abc'), 'ok', '3 caracteres');
select is(public.social_username_status('abcdefghijklmnopqrst'), 'ok', '20 caracteres');
select is(public.social_username_status('abcdefghijklmnopqrstu'), 'invalido', 'longo demais (21)');
select is(public.social_username_status('Maiuscula'), 'invalido', 'maiúscula é inválida');
select is(public.social_username_status('_abc'), 'invalido', 'não começa com _');
select is(public.social_username_status('abc.'), 'invalido', 'não termina com .');
select is(public.social_username_status('a..b'), 'invalido', 'sem ..');
select is(public.social_username_status('a._b'), 'invalido', 'sem ._');
select is(public.social_username_status('ana maria'), 'invalido', 'sem espaço');
select is(public.social_username_status('joão'), 'invalido', 'sem acento');
select is(public.social_username_status('a.b_c1'), 'ok', 'ponto e sublinhado no meio');
select is(public.social_username_status('admin'), 'reservado', 'reservado');
select is(public.social_username_status('calendario'), 'reservado', 'rota do app é reservada');
select is(public.social_username_status('a_user'), 'em_uso', '@ de A está em uso');
select is(public.social_username_status('dora'), 'em_uso', '@ de D está em uso');
reset role;
-- Mesmo @ com caixa diferente: o CHECK recusa maiúscula, e o índice lower() é a garantia final.
select throws_ok($$ insert into public.profiles (user_id, username, display_name) values ('00000000-0000-0000-0000-00000000000c', 'A_USER', 'X') $$,
  '23514', null, 'maiúscula recusada pelo CHECK');
select throws_ok($$ insert into public.profiles (user_id, username, display_name) values ('00000000-0000-0000-0000-00000000000c', 'a_user', 'X') $$,
  '23505', null, '@ duplicado recusado pelo índice único');
select throws_ok($$ insert into public.profiles (user_id, username, display_name) values ('00000000-0000-0000-0000-00000000000c', 'suporte', 'X') $$,
  '23514', 'social:reservado', 'reservado recusado também no INSERT direto');

-- Limite de taxa: a 31ª consulta no mesmo minuto é recusada.
set local role authenticated;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000c');
select is((select (array_agg(public.social_username_status('livre_' || g)))[31] from generate_series(1, 31) g),
  'limite', '31ª consulta no minuto: limite');

-- ── Troca de @ ────────────────────────────────────────────────────────────────────────────────
select pg_temp.sessao('00000000-0000-0000-0000-00000000000a');
select is(public.social_change_username('ana.nova'), 'ok', 'A troca o @');
select is(public.social_change_username('ana.outra'), 'troca_recente', 'segunda troca em 30 dias é recusada');
select pg_temp.sessao('00000000-0000-0000-0000-00000000000b');
select is(public.social_username_status('a_user'), 'em_uso', '@ antigo de A fica reservado (90 dias)');
select is(public.social_change_username('admin'), 'reservado', 'troca para reservado recusada');
select pg_temp.sessao('00000000-0000-0000-0000-00000000000a');
select is(public.social_username_status('a_user'), 'ok', 'A pode voltar ao próprio @ antigo');
reset role;

-- ── Foto (Storage) ────────────────────────────────────────────────────────────────────────────
insert into storage.objects (bucket_id, name, owner)
  values ('avatars', '00000000-0000-0000-0000-00000000000b/avatar.webp', '00000000-0000-0000-0000-00000000000b');
set local role authenticated;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 0, 'A não vê a foto de B');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-0000-0000-00000000000b/avatar.webp', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'A não grava no caminho de B');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-0000-0000-00000000000a/outra.webp', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'só o caminho fixo avatar.webp');
update storage.objects set name = name where bucket_id = 'avatars';
select pg_temp.sessao('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 1, 'B vê a própria foto');
select pg_temp.sessao('00000000-0000-0000-0000-00000000000c');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-0000-0000-00000000000c/avatar.webp', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'sem perfil social não envia foto');
reset role;
select is((select count(*)::int from storage.buckets where id = 'avatars' and not public and file_size_limit = 307200 and allowed_mime_types = array['image/webp']),
  1, 'bucket privado, 300 KB, só WebP');

-- ── Desativar, excluir e cascata ──────────────────────────────────────────────────────────────
set local role authenticated;
select pg_temp.sessao('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.social_delete_profile() $$, '55000', 'social:foto_pendente', 'não exclui com a foto ainda no Storage');
select lives_ok($$ select public.social_set_active(false) $$, 'B desativa');
select ok((select disabled_at is not null from public.profiles), 'desativado fica oculto, com os dados');
select is((select count(*)::int from public.consents where revoked_at is null), 0, 'desativar revoga o aceite');
select lives_ok($$ select public.social_set_active(true, 'perfil-social-2026-11', 'privacidade-2026-11') $$, 'B reativa com novo aceite');

select pg_temp.sessao('00000000-0000-0000-0000-00000000000d');
select lives_ok($$ select public.social_delete_profile() $$, 'D exclui o perfil social');
reset role;
select is((select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-00000000000d'), 0, 'excluir: sem perfil');
select is((select count(*)::int from public.profile_private where user_id = '00000000-0000-0000-0000-00000000000d'), 0, 'excluir: sem idade');
select is((select count(*)::int from public.consents where user_id = '00000000-0000-0000-0000-00000000000d'), 0, 'excluir: sem aceites');
select is((select count(*)::int from public.username_history where username = 'dora' and user_id is null), 1, 'excluir: @ reservado sem vínculo');

-- Excluir a conta (auth.users) apaga tudo em cascata; o histórico perde o vínculo.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*)::int from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a'), 0, 'conta excluída: sem perfil');
select is((select count(*)::int from public.profile_private where user_id = '00000000-0000-0000-0000-00000000000a'), 0, 'conta excluída: sem idade');
select is((select count(*)::int from public.consents where user_id = '00000000-0000-0000-0000-00000000000a'), 0, 'conta excluída: sem aceites');
select is((select count(*)::int from public.social_rate_limits where user_id = '00000000-0000-0000-0000-00000000000a'), 0, 'conta excluída: sem contadores');
select is((select count(*)::int from public.username_history where username = 'a_user' and user_id is null), 1, 'conta excluída: @ antigo reservado sem vínculo');

select * from finish();
rollback;
