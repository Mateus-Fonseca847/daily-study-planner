-- Reverte 20261116000004_friends_avatars.sql. Rode PRIMEIRO entre as do Prompt 16 (ordem
-- inversa: 4, 3, 2, 1). As fotos continuam no bucket; volta a valer só a leitura pelo dono.
drop policy if exists "avatars: amigos leem" on storage.objects;
drop function if exists public.social_pode_ver_avatar(text);
