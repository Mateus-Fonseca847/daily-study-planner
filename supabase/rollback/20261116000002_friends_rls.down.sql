-- Reverte 20261116000002_friends_rls.sql (depois da 3). Não há políticas a remover (as tabelas
-- novas não têm nenhuma); as tabelas somem na reversão da 1.
alter table if exists public.friend_requests disable row level security;
alter table if exists public.friendships disable row level security;
alter table if exists public.blocks disable row level security;
alter table if exists public.reports disable row level security;
