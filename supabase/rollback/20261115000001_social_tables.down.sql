-- Reverte 20261115000001_social_tables.sql (por último). Apaga SÓ o que é do perfil social;
-- public.user_data e public.delete_my_account() não são tocados.
drop trigger if exists profiles_guard on public.profiles;
drop function if exists public.social_profiles_guard();
drop table if exists public.social_rate_limits;
drop table if exists public.username_history;
drop table if exists public.consents;
drop table if exists public.profile_private;
drop table if exists public.profiles;
drop function if exists public.social_is_minor(uuid);
drop function if exists public.social_display_name_is_valid(text);
drop function if exists public.social_username_is_valid(text);
drop table if exists public.reserved_usernames;
