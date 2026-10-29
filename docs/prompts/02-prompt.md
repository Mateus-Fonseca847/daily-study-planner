# Contexto

Projeto Daily (monorepo pnpm, apps/web em React + TS + Vite + Tailwind). Os Prompts 01 e 01.1 entregaram o calendário mensal fiel à referência, com dados mockados. Leia CLAUDE.md, docs/design/design-system.md, docs/prompts/01-report.md e docs/prompts/01.1-report.md antes de começar. Trabalhe numa branch `feat/exams-and-persistence`.

# Objetivo deste prompt (02)

Transformar o Daily em um app usável no dia a dia: dados persistidos no navegador, criação/edição/exclusão de provas, conteúdos (mini tarefas), tarefas, blocos de estudo e matérias, mais contagem regressiva de provas. Continua sem backend.

# Passo 1 — Camada de dados

1. Em packages/shared, defina (zod) as entidades: Matéria (id, nome, cor), Evento base (id, tipo, título, início, fim, matériaId, status, notas) e as especializações: Prova (com lista de Conteúdos: id, título, concluído, ordem), Tarefa, Bloco de estudo. Tipos de evento mantidos: prova, estudo, entrega, revisão, especial.
2. Crie em apps/web/src/lib/data uma interface `Repository` (list/get/create/update/delete por entidade) e um adaptador `LocalStorageRepository` com: chave versionada (`daily:v1`), validação com zod ao carregar, migração simples por versão e fallback seguro se o dado estiver corrompido (não quebrar o app; avisar o usuário e oferecer restaurar a partir de backup).
3. Estado da UI com Zustand (ou React context + reducer, se preferir justificar) consumindo o Repository. Nenhum componente acessa localStorage diretamente.
4. Primeiro acesso: app vazio com estado inicial amigável (empty states), e um botão "Carregar dados de exemplo" que usa os mocks atuais. Os mocks continuam existindo só para esse botão, a fixture `?fixture=reference` e os testes.
5. Backup: em Preferências, "Exportar dados (JSON)" e "Importar dados (JSON)", com validação zod e confirmação antes de sobrescrever.

# Passo 2 — Criar, editar e excluir

1. Botão "Criar" (sidebar) abre um menu: Prova, Tarefa, Bloco de estudo, Matéria. O botão "+ Nova Prova" abre direto o formulário de prova.
2. Formulários em modal acessível (foco preso, Esc fecha, labels, mensagens de erro em pt-BR, validação com zod). Campos: título, matéria (com opção de criar nova), data, horário de início e fim, status, notas. Prova: lista de conteúdos editável no próprio formulário (adicionar, renomear, remover, reordenar).
3. Popover do evento: o menu "..." ganha Editar e Duplicar; a lixeira exclui. Exclusão com toast "Desfazer" por 6 segundos, sem diálogo de confirmação.
4. Conteúdos da prova no popover: marcar/desmarcar persiste; adicionar conteúdo inline (input no fim da lista); barra de progresso atualiza.
5. Estados de evento: pendente, em andamento, concluído, cancelado. Chip de evento concluído fica visualmente esmaecido, com título riscado. Use tokens para isso.
6. Clicar num dia vazio do calendário abre o formulário com a data pré-preenchida.

# Passo 3 — Páginas (substituem os placeholders)

1. Provas: lista de provas futuras ordenadas por data, cada uma com matéria, data, contagem regressiva ("em 3 dias", "amanhã", "hoje às 14h", "há 2 dias" para passadas), progresso dos conteúdos e atalho para editar. Abas: Próximas | Passadas.
2. Tarefas: lista simples com filtros (Hoje, Próximos 7 dias, Atrasadas, Concluídas), checkbox para concluir, criação rápida no topo (digitar título + Enter).
3. Matérias: CRUD de matérias com seletor de cor (paleta fixa nos tokens). Excluir matéria com eventos associados exige escolher: apagar os eventos ou movê-los para outra matéria.
4. Blocos de estudo: lista da semana atual agrupada por dia, com criação rápida e vínculo opcional a uma prova/matéria.
5. Os contadores da sidebar (Provas, Tarefas) passam a refletir os dados reais: provas nos próximos 14 dias e tarefas pendentes/atrasadas.
6. Estatísticas, Modo Foco e Atalhos continuam placeholders.

# Passo 4 — Calendário com dados reais

1. O calendário lê do Repository. O filtro por matéria da topbar continua funcionando.
2. Mantenha o comportamento de overflow com "+N mais"; ao clicar em "+N mais", abra um popover com a lista completa do dia.
3. Não altere tokens nem o visual existente, exceto os estados novos (concluído/cancelado). Qualquer novo componente segue o design system e usa tokens.

# Passo 5 — Testes

1. Unitários (Vitest): LocalStorageRepository (CRUD, versão, dado corrompido, migração), cálculo de progresso, formatação da contagem regressiva (hoje, amanhã, N dias, passado), regra de exclusão de matéria com eventos, import/export com validação.
2. E2E (Playwright), mantendo o de fumaça atual e adicionando um fluxo: criar matéria → criar prova com 3 conteúdos → ver no calendário → marcar 2 conteúdos → recarregar a página e confirmar que tudo persistiu → excluir e desfazer.
3. Rode tudo no CI.

# Regras

- Nenhum valor visual hardcoded; tudo em tokens.css.
- Componentes pequenos e tipados; lógica de dados fora dos componentes.
- Acessibilidade: foco visível, aria-labels, navegação por teclado nos modais e menus, toasts com role="status".
- Commits em Conventional Commits, um por etapa lógica.
- Não adicione dependências sem justificar no relatório.
- Não implemente backend, autenticação, notificações nem PWA neste prompt.

# Critérios de aceite

- [ ] Dados persistem após recarregar a página
- [ ] Criar, editar, duplicar, excluir e desfazer funcionam para todas as entidades
- [ ] Páginas Provas, Tarefas, Matérias e Blocos de estudo funcionais, com empty states
- [ ] Contagem regressiva correta em casos de borda (hoje, amanhã, passado)
- [ ] Exportar e importar JSON funcionam e rejeitam arquivos inválidos
- [ ] Dado corrompido no storage não quebra o app
- [ ] lint, typecheck, test, build e e2e passam, inclusive no CI

# Entrega

Escreva docs/prompts/02-report.md com: o que foi feito, decisões (inclusive a escolha do gerenciador de estado), mudanças no modelo de dados, dependências adicionadas, o que não foi feito e pendências. Atualize o README (status do Marco, funcionalidades e limitações), o CHANGELOG e crie docs/data-model.md com as entidades e relações. Salve este prompt em docs/prompts/02-prompt.md. Ao final, abra um PR descrevendo as mudanças.
