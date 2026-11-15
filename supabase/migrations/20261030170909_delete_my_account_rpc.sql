-- =============================================================================================
-- Sincronização — 3/3: delete_my_account() (exclusão da própria conta).
-- Já aplicada na produção (versão 20261030170909); ver o cabeçalho de 20261030161655.
-- =============================================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- user_data cai em cascata (FK on delete cascade).
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
