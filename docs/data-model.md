# Modelo de dados

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
| `daily:v1:backup`  | Último estado **válido** anterior à gravação mais recente                 |
| `daily:v1:corrupt` | Cópia do dado ilegível, guardada para recuperação manual                  |

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
