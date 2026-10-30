# Modelo de dados

> **v3 (v0.5.0):** as metas viraram **hábitos** (`habits`, `habitLogs`; seção “Entidades da versão 3”, no fim), a chave passou a `daily:v3` e `goals`/`goalLogs` saíram do snapshot (os schemas ficam em `legacy-goals.ts` só para migrar e importar).
>
> **v2 (v0.3.0):** o snapshot ganhou `preferences`, `goals`, `goalLogs`, `waterLogs` e `focusSessions` (seção “Entidades da versão 2”, no fim). O restante deste documento continua valendo.

Definido com zod em `packages/shared/src` (fonte de verdade dos tipos). Hoje os dados vivem no
navegador; os mesmos schemas serão usados pela API.

## Entidades

```
Subject (Matéria)            StudyEvent (união discriminada por `type`)
├─ id                        ├─ id
├─ name (1–60)               ├─ type: prova | estudo | entrega | revisao | especial
└─ color (paleta fixa)       ├─ title (1–120)
                             ├─ start / end   (ISO 8601 local, end ≥ start)
                             ├─ subjectId     → Subject.id | null
                             ├─ status: pendente | em-andamento | concluido | cancelado
                             └─ notes (≤ 2000)
```

| `type`     | Especialização      | Campos extras                                             |
| ---------- | ------------------- | --------------------------------------------------------- |
| `prova`    | **Prova**           | `contents: ContentItem[]` (mini tarefas)                  |
| `estudo`   | **Bloco de estudo** | `examId → Exam.id \| null` (vínculo opcional a uma prova) |
| `entrega`  | **Tarefa**          | — (`end` é o prazo; a tarefa rápida usa `start = end`)    |
| `revisao`  | Revisão             | —                                                         |
| `especial` | Especial            | —                                                         |

`ContentItem` (Conteúdo): `id`, `title` (1–120), `done`, `order` (inteiro ≥ 0; posição na lista).

Cores de matéria: `vermelho, laranja, amarelo, verde, turquesa, azul, violeta, rosa` — cada uma
é um token `--ds-color-subject-<cor>` em `tokens.css`.

## Relações e integridade

```
Subject 1 ──── * StudyEvent        (subjectId, opcional)
Exam    1 ──── * StudyBlock        (examId, opcional)
Exam    1 ──── * ContentItem       (embutido no evento)
```

`dataSnapshotSchema` (`{ subjects, events }`) valida na gravação, no carregamento e na
importação: ids únicos, `subjectId` existente e `examId` apontando para uma **prova** existente.

Regras (em `apps/web/src/lib/data/rules.ts`):

- **Excluir prova:** blocos de estudo vinculados passam a `examId = null`.
- **Excluir matéria sem eventos:** direto. **Com eventos:** é obrigatório escolher entre _apagar os
  eventos_ (aplica a regra acima) ou _movê-los_ para outra matéria existente.
- **Duplicar:** título “(cópia)”, status `pendente`; numa prova, conteúdos novos e desmarcados.
- **Desfazer:** restaura o snapshot de antes da exclusão (`replaceAll`).

## Armazenamento (`localStorage`)

| Chave                                | Conteúdo                                                               |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `daily:v3`                           | Envelope `{ app: "daily", version: 3, savedAt, data }` (formato atual) |
| `daily:v3:backup`                    | Último estado **válido** anterior à gravação mais recente              |
| `daily:v3:corrupt`                   | Cópia do dado ilegível, guardada para recuperação manual               |
| `daily:v2`, `daily:v1`               | Formatos antigos: lidos uma vez na migração e **nunca alterados**      |
| `daily:v2:pre-v3`, `daily:v1:pre-v2` | Cópia do original feita **antes** de migrar                            |
| `daily:v2:focus`                     | Sessão de foco ativa (fora do snapshot e do backup; chave histórica)   |

A chave leva a versão do formato; o campo `version` do envelope dispara as migrações
(`MIGRATIONS[n]` converte n → n+1). Arquivos exportados têm o mesmo formato do envelope.

### Histórico de versões

| Versão | Mudança                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 0      | (Protótipo da v0.1, nunca gravado em disco.) Matérias sem cor; status `agendada`/`concluida`; conteúdos sem `order`.           |
| 1      | Matérias com `color`; status `pendente/em-andamento/concluido/cancelado`; `notes`; conteúdos com `order`; blocos com `examId`. |

### Fluxo de carregamento

```
getItem(daily:v3) ─ null ─▶ getItem(daily:v2) ─ null ─▶ getItem(daily:v1) ─ null ─▶ vazio
        │ (v2 ou v1 presentes: guarda o original em :pre-v3 / :pre-v2, migra e grava em daily:v3)
        │
        ▼ parseEnvelope (JSON → versão → migração → zod)
   ok ──┴── erro ──▶ vazio + issue{corrupt} + salva original em :corrupt
   │                      └─ UI oferece “Restaurar último backup” / “Começar do zero”
   └─ versão antiga? regrava migrado (o original vira :backup)
```

## Camadas

```
componentes ──▶ useData (Zustand) ──▶ DataRepository ──▶ LocalStorageRepository ──▶ StorageLike
                     │                     ▲ interface            (adaptador)         (localStorage | memória)
                     └─ regras puras (rules.ts, selectors.ts, task-filters.ts, countdown.ts)
```

## Entidades da versão 2

| Entidade (`packages/shared`)    | Campos                                                                                                                                                                                                         | Observações                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Preferences` (uma)             | `name` (≤ 40), `waterGoalMl` (250–10 000, padrão 2000), `cupMl` (50–1000, padrão 250), `focusDurationSec` (60–10 800, padrão 1500; o antigo `focusDurationMin` ainda é lido), `lockByDefault` (padrão `false`) | Nomes do prompt: nome, metaÁguaMl, copoMl, duraçãoFocoSeg, travarPorPadrão                                       |
| `Goal` (Meta)                   | `id`, `title`, `icon` (10 ícones lucide), `kind` (`manual` \| `auto-agua` \| `auto-estudo`), `order`, `createdAt`, `archivedAt?`                                                                               | Metas padrão no primeiro acesso: Dormir 7h, Beber 2 L de água, Exercício, Cumprir blocos de estudo de hoje       |
| `GoalLog` (RegistroMeta)        | `id` (= `goalId:data`), `goalId`, `date` (`yyyy-MM-dd` local), `done`                                                                                                                                          | O `id` determinístico permite `upsert` idempotente                                                               |
| `WaterLog` (RegistroÁgua)       | `id`, `date`, `ml`, `time` (`HH:mm`)                                                                                                                                                                           |                                                                                                                  |
| `FocusSession` (SessãoFoco)     | `id`, `startedAt`, `plannedSec`, `actualSec`, `status` (`concluida` \| `interrompida`), `subjectId?`, `examId?`, `blockId?`                                                                                    | Entra no backup. Excluir a matéria/prova/bloco vinculado zera o vínculo                                          |
| `ActiveFocus` (SessãoFocoAtiva) | `id`, `status` (`ocioso` \| `rodando` \| `pausado`), `durationSec`, `startedAtMs`, `endsAtMs` (rodando), `remainingMs` (pausado), `locked`, `link`, `tabId`                                                    | **Fora do snapshot e do backup**: chave `daily:v2:focus` (histórica). No máximo uma. Só persiste rodando/pausada |

Integridade (`dataSnapshotSchema`): ids únicos em todas as coleções; `GoalLog.goalId` e os vínculos das sessões precisam existir (matéria, prova **do tipo prova**, bloco **do tipo estudo**).

### Migração v1 → v2

1. Primeiro acesso a `daily:v2` vazio, mas com `daily:v1` presente: o v1 é copiado para `daily:v1:pre-v2` (backup **antes** de migrar) e permanece intacto.
2. O envelope passa pelas migrações (`1 → 2`): preserva matérias e eventos e cria `preferences` padrão, as 4 metas padrão (`createdAt` = agora, relógio injetável) e coleções vazias.
3. O resultado é validado com zod e gravado em `daily:v2`.
4. Arquivos de backup v1 também são aceitos na importação (mesma migração, sem tocar nos dados atuais até a confirmação).

| Versão | Mudança                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| 2      | `preferences`, `goals`, `goalLogs`, `waterLogs`, `focusSessions`; chave `daily:v2`; sessão ativa em chave própria |

## Entidades da versão 3 (hábitos)

| Entidade (`packages/shared/src/habits.ts`) | Campos                                                                                                                                                                                                                                      | Observações                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Habit` (Hábito)                           | `id`, `name` (≤ 60), `icon` (12 ícones lucide), `color` (7 chaves da paleta), `type` (`check` \| `quantidade`), `unit` (≤ 12), `source` (`manual` \| `agua` \| `foco` \| `blocos`), `rules`, `createdAt`, `archivedAt?`, `endsOn?`, `order` | Fontes `agua`/`foco` exigem `quantidade`; `blocos` exige `check`. `endsOn` encerra a agenda sem arquivar        |
| `HabitRule` (Regra, versionada)            | `since` (início, âncora do intervalo), `repeat`, `target` (> 0 e obrigatória em `quantidade`), `time?` (`start` `HH:mm` + `durationMin`)                                                                                                    | Lista com ≥ 1 item, em ordem **estritamente crescente** de `since`; a última com `since ≤ dia` vale naquele dia |
| `Repeat`                                   | `dias-da-semana` (`days` 0–6, 0 = domingo; “todo dia” = os 7) ou `a-cada-n-dias` (`interval` 2–365)                                                                                                                                         | Módulo próprio (`lib/habits/repeat.ts`), reaproveitável pela recorrência de eventos                             |
| `HabitLog` (RegistroHábito)                | `id` (= `habitId:data`), `habitId`, `date`, `value` (≥ 0), `updatedAt`                                                                                                                                                                      | Só hábitos `manual`; `upsert` idempotente. Check: 0 ou 1                                                        |

Integridade: ids únicos; `HabitLog.habitId` precisa existir. Editar repetição, meta ou horário **acrescenta uma regra com `since` = hoje** (ou substitui a de hoje); o passado continua como era. Arquivar define `archivedAt`: o próprio dia conta, os seguintes não. Excluir remove também os registros (o “Desfazer” restaura o snapshot de antes).

### Migração v2 → v3

1. Primeiro acesso a `daily:v3` vazio com `daily:v2` presente: o v2 é copiado para `daily:v2:pre-v3` (antes de migrar) e permanece intacto.
2. Cada `Goal` vira um `Habit` **com o mesmo `id`**: `manual` → check/manual; `auto-agua` → quantidade em `ml`, fonte `agua`, meta = `waterGoalMl` das preferências; `auto-estudo` → check, fonte `blocos`. Todos “todo dia”, com `since` = dia de `createdAt`. Preservam título, `createdAt`, `archivedAt`, ordem e ícone (fora do conjunto → `target`); as cores são distribuídas pela paleta.
3. Cada `GoalLog` vira um `HabitLog` com valor 1 (concluída) ou 0. Diferença sutil: a meta antiga valia **até o dia anterior** ao arquivamento; o hábito vale **até o próprio dia**.
4. Idempotente: roda só sobre dados v2; dado ilegível segue o fluxo de corrupção (aviso + restaurar backup). Importar aceita arquivos v1, v2 e v3.

| Versão | Mudança                                                                |
| ------ | ---------------------------------------------------------------------- |
| 3      | `habits`, `habitLogs` no lugar de `goals`/`goalLogs`; chave `daily:v3` |

### Derivados dos hábitos (não são salvos; `apps/web/src/lib/habits`)

- **Agendado** (`isScheduled`): regra vigente na data + repetição + `archivedAt` + `endsOn`; fonte `blocos` sem blocos no dia = não agendado.
- **Valor** (`valueOn`): manual = registro; `agua` = ml do dia; `foco` = minutos reais das sessões (por dia de início); `blocos` = proporção concluída.
- **Estado do dia**: `futuro` | `nao-agendado` | `feito` | `parcial` | `perdido` | `pendente` (hoje, agendado e ainda não cumprido). **Nível** 0–4: check = 0 ou 4; quantidade = 0, ≤ 25 %, ≤ 50 %, < 100 %, ≥ 100 % da meta.
- **Sequência** e **melhor**: contam só dias agendados; dias não agendados não quebram nem somam; hoje pendente não quebra. **Taxa**: cumpridos ÷ agendados na janela (30 e 90 dias; hoje pendente fica de fora).
- **Agregado**: `dayConsistency` (% dos hábitos agendados cumpridos; sem hábitos agendados = neutro), `generalStreaks`, `aggregateMatrix` (52 semanas) e `generalRate`.
- Contas sempre em dias locais (sem `toISOString`/UTC): testadas em meses de 28 a 31 dias, ano bissexto e virada de ano. Edição retroativa: só hábitos manuais, de hoje até 366 dias atrás.

### Derivados das estatísticas (não são salvos)

Tudo em `apps/web/src/lib/stats` é função pura sobre o snapshot, com o “hoje” injetado:

- **Dia** = `yyyy-MM-dd` local; **semana** = segunda a domingo.
- **Próxima prova** e **preparação** (`nextExam`, `examPrep`): conteúdos concluídos ÷ total; prova sem conteúdos mostra “Adicione conteúdos”.
- **Horas** (`studyHoursByDay`): blocos de estudo planejados × concluídos por dia; **foco** (`focusSecondsByDay`): sessões por dia.
- **Água** (`waterOn`): soma por dia contra `waterGoalMl` (usada em “Hoje” e na meta automática de água).
- **Hábitos**: ver “Derivados dos hábitos” (sequência, taxa e consistência); as Estatísticas só consomem `lib/habits`.
- **Períodos** (`analysis.ts`): semana = 7, mês = 30, 90 dias = 90 (em barras semanais); a variação compara com o período anterior de mesmo tamanho.

### Sincronização com a nuvem (opcional, Supabase)

Local-first: o `localStorage` continua sendo a fonte usada pela UI; a nuvem é uma cópia por usuário. Código em `apps/web/src/lib/sync` e `lib/cloud`.

- **Tabela** `public.user_data(user_id pk → auth.users, data jsonb, version int, revision bigint, created_at, updated_at)`. RLS: `select/insert/update` só da própria linha, sem `delete` (a exclusão é a RPC `delete_my_account()`, que apaga o usuário e, em cascata, a linha). `revision` é incrementada **no servidor** por trigger; `data` tem checks de formato (objeto JSON) e tamanho (≤ 2 MB).
- **Concorrência otimista:** o envio é `UPDATE … WHERE revision = <última conhecida>`; zero linhas = outro dispositivo gravou antes.
- **Estado local de sync** (`daily:sync:<userId>` = `{ revision, hash }`): o último ponto em que dispositivo e nuvem eram iguais. `reconcile()` (puro, testado) decide: `push` (só o local mudou), `pull` (só a nuvem mudou ou local virgem no primeiro login), `adopt` (iguais), `conflict` (os dois mudaram — o usuário escolhe; antes de substituir o local, uma cópia vai para `daily:v3:pre-sync`).
- Comparação por SHA-256 do JSON **canônico** (chaves ordenadas), porque o `jsonb` do Postgres reordena chaves.
- **Segurança de formato:** a nuvem com `version` maior que `DATA_VERSION`, ou com dados que não passam no schema, nunca é sobrescrita (o app pede atualização/mostra erro).
- A sessão de foco ativa (`daily:v2:focus`) **não** é sincronizada.
- Mudou o formato salvo? Além de `DATA_VERSION` e da migração, lembre que dispositivos antigos passam a ver a nuvem como "mais nova".

### Sincronização entre abas

O evento `storage` (disparado só nas **outras** abas) chama `reload()` no store. **Limitação:** última escrita vence; não há mesclagem de edições simultâneas. Duas abas que finalizam a mesma sessão de foco gravam um único registro (`upsert` pelo `id`).
