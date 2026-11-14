-- Reverte 20261115000003_social_functions.sql (depois da 4).
drop function if exists public.social_delete_profile();
drop function if exists public.social_set_active(boolean, text, text);
drop function if exists public.social_change_username(text);
drop function if exists public.social_activate(date, text, text, text, text);
drop function if exists public.social_username_status(text);
drop function if exists public.social_rate_hit(text, interval, integer);
