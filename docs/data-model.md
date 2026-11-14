# Modelo de dados

> **v4 (prompt 11):** tipos `tarefa | prova | especial`, status `pendente | concluido | cancelado`, subtarefas em qualquer compromisso, dias de descanso, tempo de foco manual, marca `onboarding` e paleta nova. Chave `daily:v4` (seção “Entidades da versão 4”, no fim). O que está acima dessa seção descreve as versões anteriores.
>
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
| `daily:v5`                           | Envelope `{ app: "daily", version: 5, savedAt, data }` (formato atual) |
| `daily:v4`, `daily:v4:pre-v5`        | Formato anterior e cópia antes de migrar; removidos 30 dias depois     |
| `daily:v3`, `daily:v3:pre-v4`        | Formato v3 e cópia antes de migrar; removidos 30 dias depois           |
| `daily:v5:backup`                    | Último estado **válido** anterior à gravação mais recente              |
| `daily:v5:corrupt`                   | Cópia do dado ilegível, guardada para recuperação manual               |
| `daily:v5:migrated-at`               | Quando a última migração rodou (marca o prazo da limpeza)              |
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
getItem(daily:v5) ─ null ─▶ getItem(daily:v4) ─ null ─▶ getItem(daily:v3) ─ null ─▶ getItem(daily:v2) ─ null ─▶ getItem(daily:v1) ─ null ─▶ vazio
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

## Entidades da versão 4

### Compromisso (`StudyEvent`, `packages/shared/src/event.ts`)

Um objeto só (deixou de ser união discriminada):

| Campo       | Tipo                                     | Observação                                          |
| ----------- | ---------------------------------------- | --------------------------------------------------- |
| `id`        | string                                   |                                                     |
| `type`      | `tarefa` \| `prova` \| `especial`        | Tarefa é o padrão                                   |
| `title`     | 1–120                                    |                                                     |
| `start`     | ISO local                                | prazo/início                                        |
| `end`       | ISO local, ≥ `start`                     | término; igual ao início = pontual                  |
| `subjectId` | `Subject.id` \| null                     | matéria opcional                                    |
| `status`    | `pendente` \| `concluido` \| `cancelado` | cores reservadas (design system, seção 16)          |
| `notes`     | ≤ 2000                                   | “Descrição” no painel                               |
| `subtasks`  | `Subtask[]`                              | qualquer tipo; a UI chama de “Conteúdos” numa prova |
| `createdAt` | ISO local                                | “Criada em”; dados migrados usam o início           |

`Subtask`: `id`, `title` (1–120), `done`, `order` (o antigo `ContentItem`). Progresso = concluídas ÷ total (`subtaskProgress`).

### Outras mudanças

| Entidade            | Mudança                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FocusSession`      | sai `blockId`; entram `origin: 'cronometro' \| 'manual'` (padrão `cronometro`) e `note` (≤ 200). Registro manual: concluída, `plannedSec = actualSec`, `startedAt` = dia às 12:00 |
| `FocusLink` ativo   | sai `blockId` (o zod descarta a chave antiga ao ler `daily:v2:focus`)                                                                                                             |
| `Habit`             | fontes `manual` \| `agua` \| `foco` (sai `blocos`); cores da paleta nova                                                                                                          |
| `Subject`           | cores da paleta nova (`ciano, petroleo, gelo, lilas, fucsia, rosa, cinza`)                                                                                                        |
| `RestDay` (novo)    | `{ id, habitId \| null, date }`; `null` = todos os hábitos; id determinístico `rest:<habitId\|*>:<data>`                                                                          |
| `onboarding` (novo) | `{ waterHabitCreated }`: o hábito “Água” automático já foi criado (ou a conta já tinha dados). Sincroniza, para nunca recriar                                                     |

Integridade nova: subtarefas sem id repetido; descanso aponta para hábito existente (ou `null`) e não se repete por (hábito, data). Excluir um hábito remove os descansos dele.

### Derivados (v4)

- **Descanso** conta como não agendado: não quebra a sequência nem entra na taxa; cumprir num dia de descanso conta como feito. Estado do dia `descanso`; o calendário e os painéis do dia não listam o hábito.
- **Chama por hábito** = `streaks(habit).current`.
- **Tempo de foco** por dia = soma das sessões do cronômetro e dos registros manuais (`focusSecondsByDay`).
- **Página Tarefas** (`lib/tasks/sections.ts`): Atrasadas (prazo < agora), Hoje, Próximas (todas as futuras, sem limite, em Amanhã / Esta semana / Mais tarde) e Concluídas (últimos 30 dias). Prazo = `end`.
- **Perfil** (`lib/stats/profile.ts`): tarefas concluídas, foco na semana e total, melhor sequência entre os hábitos e dias ativos.

### Migração v3 → v4

1. Primeiro acesso a `daily:v4` vazio com `daily:v3` presente: o v3 é copiado para `daily:v3:pre-v4` e `daily:v3` **nunca é reescrito** (uma aba antiga que ainda escute essa chave não lê um formato que não entende). A data da migração fica em `daily:v4:migrated-at`.
2. Conversões: `entrega`, `estudo` e `revisao` → `tarefa`; `em-andamento` → `pendente`; `contents` da prova → `subtasks` (mesmos ids, ordem e estado); `examId` dos blocos sai; `blockId` sai das sessões (`origin: 'cronometro'`, `note: ''`); hábito `blocos` → manual de check (o histórico dele começa vazio: era derivado dos blocos, não havia registros); cores remapeadas; `restDays: []`; `onboarding.waterHabitCreated = true` se houver qualquer dado.
3. Idempotente: só roda sobre envelopes `version: 3`, e a função é estável sobre a própria saída. Dado ilegível segue o fluxo de corrupção (nada é inventado).
4. **Limpeza:** `daily:v3` e `daily:v3:pre-v4` são removidos 30 dias depois da migração (na abertura do app).
5. Exportar grava v4; importar aceita v1 a v4.
6. Uma aba antiga que grave em `daily:v3` depois da atualização dispara um aviso (“feche-a e recarregue”); o que ela gravar não é mesclado.

| Versão | Mudança                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------- |
| 4      | tipos e status novos, subtarefas, descansos, foco manual, `onboarding`, paleta nova; chave `daily:v4` |

### Sincronização com o v4

- A linha da nuvem com `version` < 4 passa pela mesma cadeia de migrações antes de ser validada; ela só é reescrita (já em v4) no próximo envio normal, isto é, numa edição de verdade.
- `version` > a do app continua bloqueando o envio (fase `outdated`, “Atualize o app”); o envio é compare-and-set por `revision`, então um app antigo que leu antes de o v4 gravar recebe conflito, relê e para.
- **Rebase do ponto de sincronia:** `daily:sync:<userId>` ganhou `version`. Se a meta é de um formato anterior e o local antigo (`daily:v3:pre-v4`) é exatamente o que foi sincronizado, o novo hash é o do local antigo migrado; sem essa cópia, o primeiro ciclo usa a nuvem como referência quando a revisão não mudou. Assim, atualizar o app não gera conflito falso.
- **Local vazio** é um predicado (`isPristineSnapshot`): o estado inicial ou só o hábito de água automático sem registros. Um dispositivo novo continua baixando a nuvem no primeiro login.
- A cópia de segurança antes de substituir o local passou a `daily:v4:pre-sync` (hoje `daily:v5:pre-sync`).

## Entidades da versão 5 (tarefas recorrentes)

### Regra de repetição (`Recurrence`, `packages/shared/src/recurrence.ts`)

Campo opcional `recurrence` do compromisso (ausente = não repete; Prova nunca tem). Nomes de campo em inglês, valores em pt-BR, como no resto do modelo.

| Campo      | Tipo                                                                                | Observação                                           |
| ---------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `freq`     | `diaria` \| `semanal` \| `mensal` \| `anual`                                        |                                                      |
| `interval` | 1–99                                                                                | “a cada N”                                           |
| `weekdays` | `0–6[]` (0 = domingo), ordenado e sem repetição                                     | só em `semanal`; ausente = o dia da semana do início |
| `monthDay` | 1–31 \| `ultimo`                                                                    | só em `mensal`; ausente = o dia do início            |
| `end`      | `{kind:'nunca'}` \| `{kind:'em', date}` (inclusiva) \| `{kind:'apos', count 1–999}` | a data final não pode ser antes do início            |

O compromisso com `recurrence` é a **série**: `start`/`end` são a primeira ocorrência (a âncora) e definem horário e duração de todas; `status` e `subtasks` são o modelo de cada ocorrência.

### Exceção de ocorrência (`OccurrenceException`, `exceptions[]`)

| Campo          | Tipo                                         | Observação                                 |
| -------------- | -------------------------------------------- | ------------------------------------------ |
| `id`           | `serieId@aaaa-mm-dd`                         | determinístico (uma por ocorrência)        |
| `eventId`      | id da série                                  | precisa existir e ser recorrente           |
| `originalDate` | `aaaa-mm-dd`                                 | o dia que a regra gerou                    |
| `kind`         | `pulada` \| `alterada`                       | pulada = excluída “somente esta”           |
| `changes`      | parcial de `title`, `start`, `end`, `notes`  | edição “somente esta”                      |
| `status`       | `concluido` \| `cancelado`                   | ausente = pendente                         |
| `doneSubtasks` | ids das subtarefas marcadas nesta ocorrência | as subtarefas recomeçam em cada ocorrência |

Só o que difere da série é salvo. Excluir a série remove as exceções dela.

### Regras de borda (`lib/recurrence/engine.ts`, com teste)

- Datas locais (`aaaa-mm-dd`), sem fuso; a hora vem da série.
- A semana começa no domingo; “a cada 2 semanas” conta semanas a partir da semana da âncora.
- Dia 29–31 num mês mais curto cai no último dia; 29/02 anual cai em 28/02 nos anos comuns.
- “Até” é inclusivo; “após N” conta todas as ocorrências geradas, inclusive as puladas.
- Expansão só na janela pedida (fórmula fechada por frequência, sem iterar desde a âncora); no máximo 1000 ocorrências por janela; a próxima ocorrência é procurada até 730 dias à frente.

### Derivados (v5)

- **Calendário:** `expandEvents(events, exceptions, janela)` gera `EventView` (o compromisso + `seriesId`, `originalDate`) com id `serie@data` só para a janela visível de cada visão.
- **Tarefas:** “Próximas” mostra a próxima ocorrência pendente de cada série e “+N nesta semana”; “Atrasadas” inclui ocorrências perdidas só dos últimos 7 dias (`OVERDUE_WINDOW_DAYS`; avulsos não têm limite). O contador da sidebar soma avulsos pendentes vencidos e ocorrências pendentes até hoje nessa janela.
- **Perfil:** tarefas concluídas contam as ocorrências concluídas.

### Escopo de edição e exclusão (`lib/data/series.ts`)

| Escopo             | Editar                                                                                                                                                 | Excluir                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Somente esta       | exceção `alterada` com as mudanças (só título, horário e notas)                                                                                        | exceção `pulada`                                  |
| Esta e as próximas | a série antiga termina na véspera; uma série nova começa nesta data (dias e “após N” restantes calculados); as exceções dali em diante passam para ela | a série termina na véspera (ou some, se for a 1ª) |
| Todas              | muda a série (a data da âncora fica)                                                                                                                   | remove a série e as exceções                      |

### Migração v4 → v5

1. Mesmo padrão do v4: `daily:v4` é copiado para `daily:v4:pre-v5` e **nunca reescrito**; a data vai para `daily:v5:migrated-at`; `daily:v4`, `daily:v4:pre-v5` e as chaves auxiliares do v4 (e o que restar do v3) são removidos 30 dias depois.
2. Conversão: só acrescenta `exceptions: []` (nenhum compromisso antigo repete).
3. Idempotente; exportar grava v5; importar aceita v1 a v5.

| Versão | Mudança                                                        |
| ------ | -------------------------------------------------------------- |
| 5      | `recurrence` no compromisso e `exceptions[]`; chave `daily:v5` |

### Sincronização com o v5

- Sem mudança no esquema do Supabase: a linha continua sendo um envelope JSON (agora `version: 5`).
- Um app v4 em cache que leia uma linha v5 bloqueia o envio (fase `outdated`, “Atualize o app”); o envio é compare-and-set por `revision`, então ele nunca sobrescreve dados v5.
- O rebase do ponto de sincronia ficou genérico: a meta guarda a `version`, e a cópia pré-migração daquela versão (`daily:vN:pre-vN+1`) é a referência. Testes em `lib/sync/engine-v5.test.ts`.
