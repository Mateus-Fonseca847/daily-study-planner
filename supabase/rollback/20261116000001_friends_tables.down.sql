-- Reverte 20261116000001_friends_tables.sql (a última do Prompt 16). Apaga SÓ o que é das
-- amizades: solicitações, amizades, bloqueios, DENÚNCIAS (exporte antes, se precisar guardá-las)
-- e as colunas de suspensão. O perfil social do Prompt 15, `user_data` e
-- `delete_my_account()` não são tocados.
drop trigger if exists profiles_friends_cleanup on public.profiles;
drop function if exists public.social_profiles_cleanup();
drop function if exists public.social_pendentes_enviadas(uuid);
drop function if exists public.social_total_amigos(uuid);
drop function if exists public.social_podem_conectar(uuid, uuid);
drop function if exists public.social_perfil_utilizavel(uuid);
drop function if exists public.social_estado_proprio(uuid);
drop table if exists public.reports;
drop table if exists public.blocks;
drop table if exists public.friendships;
drop table if exists public.friend_requests;
alter table if exists public.profiles drop column if exists suspended_reason;
alter table if exists public.profiles drop column if exists suspended_at;
