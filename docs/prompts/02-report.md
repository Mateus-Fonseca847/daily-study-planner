# Relatório 02 — Provas, persistência e páginas

Branch: `feat/exams-and-persistence`.

## O que foi feito

**Camada de dados**

- `packages/shared`: schemas zod de `Subject`, `StudyEvent` (união discriminada: prova com conteúdos, bloco de estudo com `examId`, tarefa/entrega, revisão, especial) e `DataSnapshot` com integridade referencial (ids únicos, matéria e prova existentes).
- `apps/web/src/lib/data`: interface `DataRepository`/`EntityRepository` (`list/get/create/update/delete`), adaptador `LocalStorageRepository` (chave `daily:v1`, envelope versionado, validação zod ao carregar e gravar, migração v0→v1, backup do último estado válido, cópia do dado corrompido, `StorageWriteError` quando a gravação falha) e `MemoryStorage` (fixture, testes e fallback se o `localStorage` for inacessível).
- Store Zustand (`createDataStore`) sobre o repositório; nenhum componente toca o `localStorage`. Regras puras em `rules.ts`, `selectors.ts`, `task-filters.ts`, `countdown.ts`, `backup.ts`.
- Primeiro acesso: empty state no calendário com “Criar prova” e “Carregar dados de exemplo” (os mocks agora só alimentam esse botão, a fixture e testes).
- Aviso de dado corrompido (“Restaurar último backup” / “Começar do zero”) e de falha ao salvar.

**Criar, editar, excluir**

- Menu “Criar” (Prova, Tarefa, Bloco de estudo, Matéria); “+ Nova Prova” abre o formulário de prova.
- Modal acessível (foco preso, Esc, labels, erros em pt-BR validados por zod) com matéria nova inline, data, início/término (tarefa tem só o prazo), status, notas, vínculo a prova (blocos) e editor de conteúdos (adicionar, renomear, remover, reordenar).
- Popover: lixeira (excluir + “Desfazer” 6 s, sem confirmação), menu “…” com Editar e Duplicar, conteúdos persistentes e input para adicionar no fim.
- Estados pendente/em andamento/concluído/cancelado; concluído e cancelado ficam esmaecidos (`opacity-done`) e com título riscado.
- Clique em dia vazio (ou no número do dia, que virou botão) abre o formulário com a data; “+N mais” abre um popover com a lista completa do dia.

**Páginas:** Provas (abas Próximas/Passadas, contagem regressiva, progresso, editar), Tarefas (criação rápida, filtros Hoje/7 dias/Atrasadas/Concluídas), Matérias (CRUD, paleta fixa, exclusão com escolha de destino), Blocos de estudo (semana agrupada por dia, criação rápida, vínculo opcional), Preferências (exportar/importar JSON com confirmação). Contadores da sidebar reais (provas abertas nos próximos 14 dias; tarefas pendentes ou atrasadas). Estatísticas, Modo Foco, Atalhos, FAQ e Convidar amigos seguem placeholders.

## Decisões

- **Zustand em vez de context + reducer.** O store é um objeto fora do React: pode ser criado sobre qualquer repositório (testei com `MemoryStorage` sem DOM), as ações são chamáveis fora de componentes (`deleteEventWithUndo`) e `useData(seletor)` re-renderiza só quem mudou — com context+reducer cada toggle de conteúdo re-renderizaria toda a árvore. Custo: 1 dependência pequena.
- **Repositório síncrono.** `localStorage` é síncrono e a UI fica mais simples. Ao trocar por uma API, o contrato (`DataRepository`) terá de virar assíncrono — registrado como limitação.
- **“Tarefa” é o tipo `entrega`.** Mantém os cinco tipos pedidos e evita uma entidade paralela; o chip continua “entrega” (não mudei o visual). A tarefa rápida tem prazo hoje às 23:59, o que faz os filtros funcionarem.
- **`subjectId` anulável.** Tarefas e blocos rápidos nascem sem matéria.
- **Desfazer por snapshot.** Excluir evento/matéria guarda o snapshot anterior e o toast chama `replaceAll`; serve também para a exclusão em cascata de matéria e persiste.
- **Backup = último estado válido.** Nunca é sobrescrito por um dado corrompido; o dado ilegível vai para `daily:v1:corrupt`.
- **A fixture usa armazenamento em memória** — nunca lê nem grava os dados reais — e todos os eventos são `pendente` para continuar idêntica à referência.
- **`+N mais` abre popover** (pedido) em vez de expandir a célula.
- O e2e do fluxo usa a data real de hoje; a prova é criada “hoje” para sempre aparecer no mês corrente.

## Mudanças no modelo de dados

Ver [`docs/data-model.md`](../data-model.md). Resumo: status `agendada/em-andamento/concluida` → `pendente/em-andamento/concluido/cancelado`; matérias ganham `color`; eventos ganham `notes`; conteúdos ganham `order`; só provas têm `contents`; blocos de estudo ganham `examId`; `subjectId` pode ser `null`. Formato salvo: envelope `daily:v1` (versão 1) com migração a partir da versão 0.

## Tokens e visual

Sem alterar valores existentes. Novos tokens: `--ds-color-danger`, paleta `--ds-color-subject-*` (8 cores), `--ds-opacity-done`, e dimensões de modal, menu, toast, textarea, swatch e página. Sidebar, topbar, grid e chips ficaram idênticos (a captura da fixture não mudou, exceto o novo campo “Adicionar conteúdo” no popover da prova).

## Dependências adicionadas

| Pacote    | Onde       | Justificativa                                                                                                                                  |
| --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `zustand` | `apps/web` | Store externo ao React, testável sem DOM e com seletores granulares (~1 kB).                                                                   |
| `zod`     | `apps/web` | Os formulários validam com o mesmo zod do domínio; antes só `shared` o declarava e o pnpm é estrito. Sem versão nova (já estava no workspace). |

## Testes

- **Unitários (Vitest):** 51 novos no `web` (56 no total) e 2 no `shared` (5 no total): CRUD e persistência do `LocalStorageRepository`; migração v0→v1; versão futura; 5 formas de dado corrompido (original preservado, nada sobrescrito); restauração de backup; falha de gravação; progresso; contagem regressiva (hoje, amanhã, N dias, ontem, passado, virada de mês/ano); exclusão de matéria (sem eventos, sem resolução, apagar, mover, destino inválido); import/export (ida e volta + 8 arquivos inválidos); validação dos formulários em pt-BR; tarefa/bloco rápidos; filtros de tarefas; contadores.
- **E2E (Playwright):** o de fumaça anterior; o fluxo _criar matéria → prova com 3 conteúdos → calendário → marcar 2 → recarregar → conferir persistência → excluir e desfazer (e recarregar de novo)_; e _dado corrompido não quebra o app_. Todos entram no CI.

## Resultado dos comandos

| Comando          | Resultado                                     |
| ---------------- | --------------------------------------------- |
| `pnpm lint`      | passa                                         |
| `pnpm typecheck` | passa                                         |
| `pnpm test`      | passa (web 56, shared 5)                      |
| `pnpm build`     | passa                                         |
| `pnpm e2e`       | passa (3 testes)                              |
| CI no GitHub     | roda os mesmos passos; o resultado está no PR |

## O que não foi feito

- Backend, autenticação, notificações e PWA (fora do escopo).
- Edição inline de um conteúdo já salvo no popover (renomear/remover/reordenar é feito pelo formulário de edição).
- Visões Semana/Ano, busca, notificações e “Modo Foco” da topbar (continuam visuais).
- Cor da matéria nos chips do calendário (os chips seguem a cor do tipo, como no design).

## Pendências e riscos

- **Teste manual em outros navegadores:** validei só no Chromium (Playwright). Os inputs `date`/`time` nativos variam por navegador.
- O `Repository` terá de ser assíncrono quando houver API.
- Se o armazenamento estourar a cota, o app mostra aviso e mantém os dados em memória; sem compressão nem limpeza automática do backup.
- Um evento excluído por “Desfazer” volta à posição original apenas porque o snapshot é restaurado inteiro; edições feitas entre a exclusão e o “Desfazer” (dentro de 6 s) são perdidas.
- Revisar `docs/design/design-system.md` para registrar os novos componentes (modal, menu, toast) — adicionei apenas os tokens.
