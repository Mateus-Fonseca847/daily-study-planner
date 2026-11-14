-- =============================================================================================
-- Amizades (Prompt 16) — 2/4: RLS e permissões.
--
-- Escritas e leituras SÓ pelas funções da migração 3 (SECURITY DEFINER). O cliente não tem
-- nenhum privilégio direto nas tabelas novas: RLS ligada e nenhuma política = nada passa, e o
-- REVOKE ainda tira o privilégio de tabela (a tentativa falha com “permission denied”).
-- `reports` não é legível por ninguém pelo app, nem por quem denunciou.
-- Reversão: supabase/rollback/20261116000002_friends_rls.down.sql.
-- =============================================================================================

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

revoke all on public.friend_requests, public.friendships, public.blocks, public.reports
  from public, anon, authenticated;

-- As colunas de suspensão em public.profiles não entram no GRANT UPDATE de coluna do Prompt 15,
-- então o cliente não as altera; a leitura da própria linha (inclusive estas colunas) continua.
