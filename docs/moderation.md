# Moderação (guia do dono do projeto)

O Daily não tem painel administrativo. A moderação é **por denúncia**: as pessoas denunciam pelo app e o dono do projeto revisa no **SQL Editor do Supabase** (que roda como `postgres`, acima da RLS). Nenhuma destas consultas existe no app, e a tabela `reports` não é legível por ninguém pelo app, nem por quem denunciou.

> **Aja com cuidado.** Confira o contexto antes de suspender alguém (uma denúncia isolada pode ser engano ou retaliação), prefira a medida mais leve que resolve (remover a foto antes de suspender) e **registre cada decisão** em `reports.resolution_note`: o que foi visto, o que foi feito e por quê. Para menores de 18 anos, seja ainda mais cuidadoso e, diante de risco real (ameaça, exploração), acione os canais oficiais (Disque 100, SaferNet) além de suspender.

Todas as consultas usam o **@** (`username`), que é o que a denúncia mostra. Troque os valores entre `'…'` antes de rodar.

## 1. Denúncias pendentes, por pessoa denunciada

```sql
select r.reported_username       as "@ (no momento)",
       p.username                as "@ atual",
       count(*)                  as denuncias,
       count(distinct r.reporter_id) as quem_denunciou,
       array_agg(distinct r.reason) as motivos,
       min(r.created_at)         as primeira,
       max(r.created_at)         as ultima,
       p.suspended_at            as suspenso_em
  from public.reports r
  left join public.profiles p on p.user_id = r.reported_id
 where r.status = 'pendente'
 group by r.reported_id, r.reported_username, p.username, p.suspended_at
 order by denuncias desc, ultima desc;
```

## 2. Todas as denúncias de um mesmo @ (detalhes)

Procura pelo @ do momento da denúncia **e** pelo @ atual (a pessoa pode ter trocado de @):

```sql
select r.id, r.created_at, r.reason as motivo, r.detail as detalhe, r.status,
       r.reported_username as "@ (no momento)", r.reported_display_name as "nome (no momento)",
       r.resolved_at, r.resolution_note
  from public.reports r
  left join public.profiles p on p.user_id = r.reported_id
 where r.reported_username = 'ana.lima' or p.username = 'ana.lima'
 order by r.created_at desc;
```

## 3. Ver o perfil e a foto de quem foi denunciado

```sql
select user_id, username, display_name, avatar_path, discoverable, disabled_at,
       suspended_at, suspended_reason, created_at
  from public.profiles where username = 'ana.lima';
```

A foto fica em **Storage → avatars → `{user_id}/avatar.webp`** (abra pelo painel; o bucket é privado).

## 4. Marcar como resolvida (ou descartada)

```sql
update public.reports
   set status = 'resolvida',            -- ou 'descartada' (denúncia sem fundamento)
       resolved_at = now(),
       resolution_note = 'Foto imprópria removida em 16/11/2026; sem suspensão (primeira vez).'
 where id in (12, 13);                  -- os ids da consulta 2
```

Para resolver todas as pendentes de um @ de uma vez:

```sql
update public.reports r
   set status = 'resolvida', resolved_at = now(), resolution_note = 'Perfil suspenso (assédio reiterado).'
  from public.profiles p
 where p.user_id = r.reported_id and p.username = 'ana.lima' and r.status = 'pendente';
```

## 5. Remover a foto de alguém

Dois passos (o banco não apaga arquivos do Storage por SQL):

1. **Painel → Storage → avatars → `{user_id}/avatar.webp` → Delete.**
2. Zerar a referência (a versão sobe para os amigos deixarem de ver a cópia em memória):

```sql
update public.profiles
   set avatar_path = null, avatar_version = avatar_version + 1
 where username = 'ana.lima';
```

## 6. Suspender e reativar um perfil

Suspenso: some da busca e das listas dos outros, não envia nem responde pedidos e ninguém lê a foto. A pessoa vê no app que o perfil está suspenso (e lê o motivo na própria linha, então escreva um motivo respeitoso e objetivo).

```sql
update public.profiles
   set suspended_at = now(),
       suspended_reason = 'Suspenso por violar as regras da comunidade (assédio).'
 where username = 'ana.lima';
```

Reativar:

```sql
update public.profiles set suspended_at = null, suspended_reason = null where username = 'ana.lima';
```

Perfis suspensos hoje:

```sql
select username, display_name, suspended_at, suspended_reason
  from public.profiles where suspended_at is not null order by suspended_at desc;
```

## 7. Retenção das denúncias (sugerida)

- **Pendentes:** até serem revisadas.
- **Resolvidas ou descartadas:** guardar por **12 meses** depois de `resolved_at` (mostra reincidência) e então apagar.
- **Conta excluída:** `reporter_id` e `reported_id` viram nulos sozinhos (sem vínculo com a pessoa); o conteúdo segue a mesma regra de 12 meses.

Limpeza periódica (rode de tempos em tempos):

```sql
delete from public.reports
 where status in ('resolvida', 'descartada') and resolved_at < now() - interval '12 months';
```

## 8. Números rápidos

```sql
select status, count(*) from public.reports group by status;
select reason, count(*) from public.reports where created_at > now() - interval '30 days' group by reason;
```

## Limites que o próprio banco já aplica

5 denúncias por pessoa por dia; motivo de uma lista fechada; detalhe de até 500 caracteres; a denúncia guarda o @ e o nome do momento (retrato), então trocar de @ não apaga o histórico.
