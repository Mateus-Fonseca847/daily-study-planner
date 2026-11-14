-- Reverte 20261116000003_friends_functions.sql (depois da 4).
drop function if exists public.social_denunciar(uuid, text, text, boolean);
drop function if exists public.social_listar_bloqueados();
drop function if exists public.social_desbloquear(uuid);
drop function if exists public.social_bloquear(uuid);
drop function if exists public.social_contar_solicitacoes_recebidas();
drop function if exists public.social_listar_solicitacoes();
drop function if exists public.social_listar_amigos();
drop function if exists public.social_desfazer_amizade(uuid);
drop function if exists public.social_cancelar_solicitacao(bigint);
drop function if exists public.social_responder_solicitacao(bigint, boolean);
drop function if exists public.social_enviar_solicitacao(uuid);
drop function if exists public.social_buscar_perfis(text);
drop function if exists public.social_aplicar_bloqueio(uuid, uuid);
