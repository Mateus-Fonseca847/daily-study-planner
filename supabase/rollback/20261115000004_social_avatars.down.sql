-- Reverte 20261115000004_social_avatars.sql. Rode PRIMEIRO (ordem inversa: 4, 3, 2, 1).
-- O Storage não deixa apagar arquivos nem um bucket com arquivos por SQL: antes, esvazie o bucket
-- `avatars` pelo painel (Storage → avatars → selecionar tudo → excluir) ou pela API.
drop policy if exists "avatars: o dono lê" on storage.objects;
drop policy if exists "avatars: o dono envia" on storage.objects;
drop policy if exists "avatars: o dono troca" on storage.objects;
drop policy if exists "avatars: o dono apaga" on storage.objects;
-- Com o bucket vazio, apague-o pelo painel (Storage → avatars → Delete bucket).
