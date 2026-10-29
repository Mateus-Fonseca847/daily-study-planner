# Modelo de dados

> **v2 (Prompt 03):** o snapshot ganhou `preferences`, `goals`, `goalLogs`, `waterLogs` e `focusSessions` (seção “Entidades da versão 2”, no fim). O restante deste documento continua valendo.

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

| Chave              | Conteúdo                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| `daily:v1`         | Envelope `{ app: "daily", version, savedAt, data: { subjects, events } }` |
| `daily:v2:backup`  | Último estado **válido** anterior à gravação mais recente                 |
| `daily:v2:corrupt` | Cópia do dado ilegível, guardada para recuperação manual                  |

A chave leva a versão do formato; o campo `version` do envelope dispara as migrações
(`MIGRATIONS[n]` converte n → n+1). Arquivos exportados têm o mesmo formato do envelope.

### Histórico de versões

| Versão | Mudança                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 0      | (Protótipo do Prompt 01, nunca gravado em disco.) Matérias sem cor; status `agendada`/`concluida`; conteúdos sem `order`.      |
| 1      | Matérias com `color`; status `pendente/em-andamento/concluido/cancelado`; `notes`; conteúdos com `order`; blocos com `examId`. |

### Fluxo de carregamento

```
getItem(daily:v1) ─ null ───────────────▶ vazio
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

| Entidade (`packages/shared`)    | Campos                                                                                                                                                                                                         | Observações                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Preferences` (uma)             | `name` (≤ 40), `waterGoalMl` (250–10 000, padrão 2000), `cupMl` (50–1000, padrão 250), `focusDurationSec` (60–10 800, padrão 1500; o antigo `focusDurationMin` ainda é lido), `lockByDefault` (padrão `false`) | Nomes do prompt: nome, metaÁguaMl, copoMl, duraçãoFocoSeg, travarPorPadrão                                 |
| `Goal` (Meta)                   | `id`, `title`, `icon` (10 ícones lucide), `kind` (`manual` \| `auto-agua` \| `auto-estudo`), `order`, `createdAt`, `archivedAt?`                                                                               | Metas padrão no primeiro acesso: Dormir 7h, Beber 2 L de água, Exercício, Cumprir blocos de estudo de hoje |
| `GoalLog` (RegistroMeta)        | `id` (= `goalId:data`), `goalId`, `date` (`yyyy-MM-dd` local), `done`                                                                                                                                          | O `id` determinístico permite `upsert` idempotente                                                         |
| `WaterLog` (RegistroÁgua)       | `id`, `date`, `ml`, `time` (`HH:mm`)                                                                                                                                                                           |                                                                                                            |
| `FocusSession` (SessãoFoco)     | `id`, `startedAt`, `plannedSec`, `actualSec`, `status` (`concluida` \| `interrompida`), `subjectId?`, `examId?`, `blockId?`                                                                                    | Entra no backup. Excluir a matéria/prova/bloco vinculado zera o vínculo                                    |
| `ActiveFocus` (SessãoFocoAtiva) | `id`, `status` (`ocioso` \| `rodando` \| `pausado`), `durationSec`, `startedAtMs`, `endsAtMs` (rodando), `remainingMs` (pausado), `locked`, `link`, `tabId`                                                    | **Fora do snapshot e do backup**: chave `daily:v2:focus`. No máximo uma. Só persiste rodando/pausada       |

Integridade (`dataSnapshotSchema`): ids únicos em todas as coleções; `GoalLog.goalId` e os vínculos das sessões precisam existir (matéria, prova **do tipo prova**, bloco **do tipo estudo**).

### Migração v1 → v2

1. Primeiro acesso a `daily:v2` vazio, mas com `daily:v1` presente: o v1 é copiado para `daily:v1:pre-v2` (backup **antes** de migrar) e permanece intacto.
2. O envelope passa pelas migrações (`1 → 2`): preserva matérias e eventos e cria `preferences` padrão, as 4 metas padrão (`createdAt` = agora, relógio injetável) e coleções vazias.
3. O resultado é validado com zod e gravado em `daily:v2`.
4. Arquivos de backup v1 também são aceitos na importação (mesma migração, sem tocar nos dados atuais até a confirmação).

| Versão | Mudança                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| 2      | `preferences`, `goals`, `goalLogs`, `waterLogs`, `focusSessions`; chave `daily:v2`; sessão ativa em chave própria |

### Derivados das estatísticas (não são salvos)

Tudo em `apps/web/src/lib/stats` é função pura sobre o snapshot, com o “hoje” injetado:

- **Dia** = `yyyy-MM-dd` local; **semana** = segunda a domingo.
- **Próxima prova** e **preparação** (`nextExam`, `examPrep`): conteúdos concluídos ÷ total; prova sem conteúdos mostra “Adicione conteúdos”.
- **Horas** (`studyHoursByDay`): blocos de estudo planejados × concluídos por dia; **foco** (`focusSecondsByDay`): sessões por dia.
- **Água** (`waterOn`): soma por dia contra `waterGoalMl` (usada em “Hoje” e na meta automática de água).
- **Metas** (`goalStates`, `goalsSummary`): uma meta vale num dia se `createdAt ≤ dia` e (`archivedAt` ausente ou `> dia`); as automáticas (`auto-agua`, `auto-estudo`) são calculadas a partir de água e blocos.
- **Sequência** (`computeStreaks`): dias seguidos com todas as metas **que existiam naquele dia** cumpridas, olhando no máximo `MAX_STREAK_LOOKBACK_DAYS` (365); o dia de hoje só quebra a sequência depois de encerrado.
- **Períodos** (`analysis.ts`): semana = 7, mês = 30, 90 dias = 90 (em barras semanais); a variação compara com o período anterior de mesmo tamanho.

### Sincronização entre abas

O evento `storage` (disparado só nas **outras** abas) chama `reload()` no store. **Limitação:** última escrita vence; não há mesclagem de edições simultâneas. Duas abas que finalizam a mesma sessão de foco gravam um único registro (`upsert` pelo `id`).
