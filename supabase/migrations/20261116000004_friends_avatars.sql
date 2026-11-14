-- =============================================================================================
-- Amizades (Prompt 16) — 4/4: amigos leem a foto de perfil.
--
-- Política NOVA de leitura no bucket `avatars` (as 4 do Prompt 15, só do dono, continuam): a
-- foto `{dono}/avatar.webp` é legível por quem é amigo do dono, sem bloqueio em nenhum sentido,
-- com os dois perfis ativos e não suspensos e na mesma faixa de idade. Antes da amizade, depois
-- de um bloqueio ou de uma suspensão, ninguém além do dono lê. O app pede links assinados de
-- curta duração (120 s), que só são emitidos se esta política deixar ler.
-- Reversão: supabase/rollback/20261116000004_friends_avatars.down.sql (rode primeiro).
-- =============================================================================================

-- Pode a pessoa logada ler este objeto como amiga do dono? Só responde sobre auth.uid() (não dá
-- para perguntar por terceiros). EXECUTE para `authenticated` porque a política a avalia com o
-- papel de quem consulta.
create function public.social_pode_ver_avatar(objeto text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  dono uuid;
begin
  if uid is null or objeto is null
     or objeto !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.webp$' then
    return false;
  end if;
  dono := split_part(objeto, '/', 1)::uuid;
  if dono = uid then
    return false; -- a própria foto já é lida pela política do dono (Prompt 15)
  end if;
  return exists (
    select 1 from public.friendships f
    where f.user_a = least(uid, dono) and f.user_b = greatest(uid, dono)
  ) and public.social_podem_conectar(uid, dono);
end;
$$;

revoke execute on function public.social_pode_ver_avatar(text) from public, anon;
grant execute on function public.social_pode_ver_avatar(text) to authenticated;

create policy "avatars: amigos leem" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.social_pode_ver_avatar(name));
