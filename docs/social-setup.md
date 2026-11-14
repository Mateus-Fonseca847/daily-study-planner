# Perfil social e amigos: aplicar no Supabase (guia do dono do projeto)

Este guia é para quem administra o projeto Supabase de produção. **Nada do perfil social é aplicado automaticamente**: o repositório só traz as migrações, as reversões e os testes. Você revisa e aplica.

São dois conjuntos, **sempre nesta ordem**: as 4 migrações do **Prompt 15** (perfil social, `20261115…`) e depois as 4 do **Prompt 16** (amizades, busca, bloqueio e denúncia, `20261116…`). As do 16 dependem das do 15.

O front é seguro em qualquer ordem: sem as tabelas do 15, Preferências → Perfil social mostra “ainda não disponível”; sem as do 16, Amigos e a busca mostram “ainda não disponível”; o resto do app segue igual. Mesmo assim, a ordem recomendada é **migrações antes do deploy**.

## O que vem no repositório

| Caminho                                                    | O que é                                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase/migrations/20261115000001_social_tables.sql`     | Tabelas (`profiles`, `profile_private`, `consents`, `username_history`, `reserved_usernames`, `social_rate_limits`), regras do @ e gatilho       |
| `supabase/migrations/20261115000002_social_rls.sql`        | RLS e permissões (só o dono acessa o que é seu)                                                                                                  |
| `supabase/migrations/20261115000003_social_functions.sql`  | Funções `social_*` (SECURITY DEFINER, `search_path` vazio, limite de taxa)                                                                       |
| `supabase/migrations/20261115000004_social_avatars.sql`    | Bucket privado `avatars` (300 KB, só WebP) e políticas do Storage                                                                                |
| `supabase/migrations/20261116000001_friends_tables.sql`    | Prompt 16: `friend_requests`, `friendships`, `blocks`, `reports`, colunas de suspensão em `profiles`, auxiliares internas e o gatilho de limpeza |
| `supabase/migrations/20261116000002_friends_rls.sql`       | RLS ligada e nenhum acesso direto às tabelas novas                                                                                               |
| `supabase/migrations/20261116000003_friends_functions.sql` | Funções `social_*` de busca, pedidos, amizades, bloqueios e denúncias (limite de taxa, sem vazamento)                                            |
| `supabase/migrations/20261116000004_friends_avatars.sql`   | Política “amigos leem” a foto no bucket `avatars`                                                                                                |
| `supabase/rollback/*.down.sql`                             | Reversão de cada migração (aplicar em ordem inversa)                                                                                             |
| `supabase/tests/social_security.test.sql`                  | 84 testes de segurança do perfil (pgTAP), rodados no CI num Supabase local                                                                       |
| `supabase/tests/friends_security.test.sql`                 | 159 testes de segurança das amizades (isolamento, limites, bloqueio, idade, foto, denúncias, exclusões)                                          |

As migrações **só acrescentam**: não mexem em `public.user_data` nem em `public.delete_my_account()`, e as do 16 não alteram nada criado pelas do 15 (só acrescentam duas colunas em `profiles`, um gatilho e uma política nova no Storage).

## 1. Antes de aplicar (confira no painel)

1. **SQL Editor:** rode as consultas abaixo e confirme que nada disso já existe (para não colidir):

   ```sql
   select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in ('profiles','profile_private','consents','username_history',
                         'reserved_usernames','social_rate_limits',
                         'friend_requests','friendships','blocks','reports');
   select proname from pg_proc where proname like 'social_%';
   select id from storage.buckets where id = 'avatars';
   ```

2. Anote a definição de `delete_my_account()` (Database → Functions) e confira que ela apaga o usuário de `auth.users`: as tabelas novas somem em cascata com ele. A foto não tem cascata no Storage; o app a apaga antes de chamar essa função.
3. Faça um backup (Database → Backups) ou, no plano gratuito, exporte o esquema.

## 2. Aplicar

**Opção A: SQL Editor (recomendada).** Abra cada arquivo de `supabase/migrations/`, **na ordem do número** (os quatro `20261115…` e depois os quatro `20261116…`), cole no SQL Editor e execute. Cada arquivo roda numa transação: se algo falhar, nada daquele arquivo fica aplicado. Já aplicou as do 15 antes? Aplique só as do 16.

**Opção B: Supabase CLI.** No seu computador, com o projeto vinculado:

```bash
npx supabase@2.122.1 link --project-ref <ref-do-projeto>
npx supabase@2.122.1 db push
```

O `db push` aplica só as migrações que ainda não estão no histórico do projeto, na ordem certa (as oito na primeira vez; só as do 16 se as do 15 já estiverem lá).

## 3. Conferir

```sql
-- RLS ligada nas tabelas novas (todas com rowsecurity = true)
select tablename, rowsecurity from pg_tables
 where schemaname = 'public'
   and tablename in ('profiles','profile_private','consents','username_history',
                     'reserved_usernames','social_rate_limits',
                     'friend_requests','friendships','blocks','reports');
-- Prompt 16: nenhum privilégio direto do app nas tabelas de amizade (as 4 linhas com false)
select t, has_table_privilege('authenticated', 'public.' || t, 'select') as le,
          has_table_privilege('authenticated', 'public.' || t, 'insert') as grava
  from unnest(array['friend_requests','friendships','blocks','reports']) as t;
-- Prompt 16: políticas do bucket avatars (as 4 do dono + “avatars: amigos leem”)
select policyname from pg_policies where schemaname = 'storage' and policyname like 'avatars:%';
-- Funções só para authenticated (anon sem EXECUTE)
select proname, has_function_privilege('anon', oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', oid, 'EXECUTE') as autenticado
  from pg_proc where proname like 'social_%';
-- Bucket privado, 300 KB, só WebP
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
```

Esperado: `rowsecurity = true` em todas; `anon = false` em todas as funções; `autenticado = true` em `social_username_status`, `social_activate`, `social_change_username`, `social_set_active`, `social_delete_profile` e, do Prompt 16, `social_buscar_perfis`, `social_enviar_solicitacao`, `social_responder_solicitacao`, `social_cancelar_solicitacao`, `social_desfazer_amizade`, `social_listar_amigos`, `social_listar_solicitacoes`, `social_contar_solicitacoes_recebidas`, `social_bloquear`, `social_desbloquear`, `social_listar_bloqueados`, `social_denunciar` e `social_pode_ver_avatar` (usada pela política do Storage); `false` nas internas (`social_rate_hit`, `social_is_minor`, `social_profiles_guard`, `social_estado_proprio`, `social_perfil_utilizavel`, `social_podem_conectar`, `social_total_amigos`, `social_pendentes_enviadas`, `social_aplicar_bloqueio`, `social_profiles_cleanup`); `le` e `grava` = `false` nas 4 tabelas de amizade; 5 políticas `avatars:`; bucket `public = false`, `307200`, `{image/webp}`.

Depois, no app publicado, com a sua conta: Preferências → Perfil social → ativar, escolher @, enviar uma foto, trocar o nome, desativar, reativar e excluir. Para as amizades, com **duas contas adultas** (ex.: dois navegadores), ligue “Aparecer na busca por @” numa delas, busque pela outra na lupa, envie o pedido, aceite, confira a foto do amigo, bloqueie e desbloqueie, e denuncie (a denúncia aparece em `public.reports`, veja `docs/moderation.md`).

## 4. Deploy do front

Mescle o PR e espere a Vercel publicar. A CSP **não muda**: a foto vem do Supabase com o token (`connect-src` já permite o domínio) e aparece por `blob:` (já permitido em `img-src`).

## 5. Reverter

**Só as amizades (Prompt 16):** rode, nesta ordem, `supabase/rollback/20261116000004_friends_avatars.down.sql`, `…003_friends_functions.down.sql`, `…002_friends_rls.down.sql` e `…001_friends_tables.down.sql`. Isso apaga pedidos, amizades, bloqueios, **denúncias** (exporte `public.reports` antes, se precisar) e as colunas de suspensão; o perfil social do 15 continua. O app volta a mostrar “ainda não disponível” em Amigos.

**Tudo (16 e depois 15):** primeiro as quatro do 16 (acima), depois as do 15, na ordem **inversa** (4, 3, 2, 1), pelo SQL Editor:

1. Esvazie o bucket `avatars` pelo painel (Storage → avatars → selecionar tudo → excluir). O Storage não deixa apagar arquivos por SQL.
2. Rode `supabase/rollback/20261115000004_social_avatars.down.sql` e, com o bucket vazio, exclua-o pelo painel.
3. Rode `...000003_social_functions.down.sql`, `...000002_social_rls.down.sql` e `...000001_social_tables.down.sql`.

Isso apaga só o que é do perfil social; `user_data` e a sincronização ficam intactas. O app volta a mostrar “ainda não disponível”.

## 6. Rodar os testes de segurança no seu computador (opcional)

Precisa do Docker. Nunca aponte para a produção:

```bash
npx supabase@2.122.1 start -x realtime,studio,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor,postgres-meta
npx supabase@2.122.1 test db
npx supabase@2.122.1 stop
```

O mesmo roda no CI a cada push (job `db`), junto com a reversão aplicada em ordem.

## Pendências do dono

- **Contato do controlador:** preencher `CONTROLLER_CONTACT` em `apps/web/src/lib/social/texts.ts` (aparece no termo e na política).
- **Revisão jurídica** do termo e da seção da política (rascunhos). O tratamento de dados de adolescentes (14 a 17 anos) merece atenção especial: LGPD, art. 14, e o ECA Digital (Lei 15.211/2025).
- **Moderação:** por denúncia; as consultas prontas (denúncias pendentes, resolver, suspender e reativar, remover foto) estão em [`docs/moderation.md`](moderation.md). Defina quem revisa e com que frequência.
