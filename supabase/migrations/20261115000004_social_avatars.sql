-- =============================================================================================
-- Perfil social (Prompt 15) — 4/4: bucket de fotos de perfil.
--
-- Privado (só com token), até 300 KB, só image/webp (o app recodifica toda foto em WebP 512×512,
-- sem EXIF). Um arquivo por pessoa, no caminho fixo `{user_id}/avatar.webp`. Só o dono lê,
-- envia, troca e apaga o seu, e só depois de ativar o perfil social. Ninguém mais acessa (a
-- leitura por amigos entra no Prompt 16).
-- Reversão: supabase/rollback/20261115000004_social_avatars.down.sql (esvazie o bucket antes).
-- =============================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 307200, array['image/webp'])
on conflict (id) do nothing;

create policy "avatars: o dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp');

create policy "avatars: o dono envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/avatar.webp'
    and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()))
  );

create policy "avatars: o dono troca" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp')
  with check (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/avatar.webp'
    and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()))
  );

create policy "avatars: o dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp');
