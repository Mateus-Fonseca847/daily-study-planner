-- =============================================================================================
-- Sincronização — 2/3: limites de formato e tamanho de user_data.
-- Já aplicada na produção (versão 20261030163545); ver o cabeçalho de 20261030161655.
-- =============================================================================================

-- Com cadastro público, qualquer conta autenticada pode gravar na própria linha.
-- Estes limites impedem que alguém use a tabela como armazenamento ilimitado.
alter table public.user_data
  add constraint user_data_is_object check (jsonb_typeof(data) = 'object'),
  add constraint user_data_size_limit check (octet_length(data::text) <= 2000000);
