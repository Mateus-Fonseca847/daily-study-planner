# Perfil social: aplicar no Supabase (guia do dono do projeto)

Este guia é para quem administra o projeto Supabase de produção. **Nada do perfil social é aplicado automaticamente**: o repositório só traz as migrações, as reversões e os testes. Você revisa e aplica.

O front é seguro em qualquer ordem: sem as tabelas, Preferências → Perfil social mostra “ainda não disponível” e o resto do app segue igual. Mesmo assim, a ordem recomendada é **migração antes do deploy**.

## O que vem no repositório

| Caminho                                                   | O que é                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase/migrations/20261115000001_social_tables.sql`    | Tabelas (`profiles`, `profile_private`, `consents`, `username_history`, `reserved_usernames`, `social_rate_limits`), regras do @ e gatilho |
| `supabase/migrations/20261115000002_social_rls.sql`       | RLS e permissões (só o dono acessa o que é seu)                                                                                            |
| `supabase/migrations/20261115000003_social_functions.sql` | Funções `social_*` (SECURITY DEFINER, `search_path` vazio, limite de taxa)                                                                 |
| `supabase/migrations/20261115000004_social_avatars.sql`   | Bucket privado `avatars` (300 KB, só WebP) e políticas do Storage                                                                          |
| `supabase/rollback/*.down.sql`                            | Reversão de cada migração (aplicar em ordem inversa)                                                                                       |
| `supabase/tests/social_security.test.sql`                 | 84 testes de segurança (pgTAP), rodados no CI num Supabase local                                                                           |

As migrações **só acrescentam**: não mexem em `public.user_data` nem em `public.delete_my_account()`.

## 1. Antes de aplicar (confira no painel)

1. **SQL Editor:** rode as consultas abaixo e confirme que nada disso já existe (para não colidir):

   ```sql
   select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in ('profiles','profile_private','consents','username_history',
                         'reserved_usernames','social_rate_limits');
   select proname from pg_proc where proname like 'social_%';
   select id from storage.buckets where id = 'avatars';
   ```

2. Anote a definição de `delete_my_account()` (Database → Functions) e confira que ela apaga o usuário de `auth.users`: as tabelas novas somem em cascata com ele. A foto não tem cascata no Storage; o app a apaga antes de chamar essa função.
3. Faça um backup (Database → Backups) ou, no plano gratuito, exporte o esquema.

## 2. Aplicar

**Opção A: SQL Editor (recomendada).** Abra cada arquivo de `supabase/migrations/`, **na ordem do número**, cole no SQL Editor e execute. Cada arquivo roda numa transação: se algo falhar, nada daquele arquivo fica aplicado.

**Opção B: Supabase CLI.** No seu computador, com o projeto vinculado:

```bash
npx supabase@2.122.1 link --project-ref <ref-do-projeto>
npx supabase@2.122.1 db push
```

O `db push` aplica só as migrações que ainda não estão no histórico do projeto (as quatro, na primeira vez).

## 3. Conferir

```sql
-- RLS ligada nas tabelas novas (todas com rowsecurity = true)
select tablename, rowsecurity from pg_tables
 where schemaname = 'public'
   and tablename in ('profiles','profile_private','consents','username_history',
                     'reserved_usernames','social_rate_limits');
-- Funções só para authenticated (anon sem EXECUTE)
select proname, has_function_privilege('anon', oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', oid, 'EXECUTE') as autenticado
  from pg_proc where proname like 'social_%';
-- Bucket privado, 300 KB, só WebP
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
```

Esperado: `rowsecurity = true` em todas; `anon = false` em todas as funções; `autenticado = true` em `social_username_status`, `social_activate`, `social_change_username`, `social_set_active` e `social_delete_profile` (e `false` em `social_rate_hit`, `social_is_minor` e `social_profiles_guard`); bucket `public = false`, `307200`, `{image/webp}`.

Depois, no app publicado, com a sua conta: Preferências → Perfil social → ativar, escolher @, enviar uma foto, trocar o nome, desativar, reativar e excluir.

## 4. Deploy do front

Mescle o PR e espere a Vercel publicar. A CSP **não muda**: a foto vem do Supabase com o token (`connect-src` já permite o domínio) e aparece por `blob:` (já permitido em `img-src`).

## 5. Reverter

Na ordem **inversa** (4, 3, 2, 1), pelo SQL Editor:

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
- **Moderação:** por enquanto, só o dono vê a própria foto. A denúncia e a revisão chegam no Prompt 16.
