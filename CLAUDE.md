# Daily

Organizador de estudos (PWA) para estudantes, pensado para ficar aberto o dia todo numa segunda
tela do PC. Projeto de portfólio: TypeScript estrito, código limpo, documentação e testes bem
escolhidos. Idioma da UI: **pt-BR**. Viewport-alvo: desktop 1440×900 (aceitável a partir de 1280 px).

Estado atual: só front-end; os dados ficam no `localStorage` (`daily:v3`) atrás de um `Repository`. Mocks (`apps/web/src/mocks`) só servem ao botão “Carregar dados de exemplo”, à fixture e aos testes. `apps/api` é apenas um README.

## Stack

- Monorepo **pnpm** (`apps/web`, `apps/api`, `packages/shared`)
- Web: React 19 + TypeScript (strict) + Vite + Tailwind CSS v4 + React Router + lucide-react + Inter (`@fontsource-variable/inter`)
- Datas: `date-fns` (locale `ptBR`). Contratos: `zod` em `packages/shared`
- Qualidade: ESLint (flat config) + Prettier + Vitest + GitHub Actions (`.github/workflows/ci.yml`)

## Convenções

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `test:`…), um commit por etapa lógica.
- **Tokens obrigatórios**: nenhum valor visual (cor, medida, raio, sombra, fonte) fora de
  `apps/web/src/styles/tokens.css`. Os tokens (`--ds-*`) são mapeados no tema do Tailwind em
  `styles/index.css`; componentes usam só utilitários derivados (`bg-surface`, `h-control`…).
  Novo valor visual → documente em `docs/design/design-system.md`, crie o token, mapeie no tema.
- **Componentes pequenos e tipados**; primitivos em `components/ui`, estrutura em
  `components/layout`, features em `features/<nome>`. Sem lógica visual duplicada.
- Tipos e schemas de domínio vivem em `packages/shared`; lógica pura (grid do mês, progresso) em `lib/` com teste.
- Acessibilidade: foco visível, `aria-label` em botões de ícone, teclado funcional no popover.
- Não usar a marca “beatgig” nem assets da referência — apenas o sistema visual.

## Comandos

```bash
pnpm install
pnpm dev          # sobe apps/web em http://localhost:5173
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e          # Playwright (1ª vez: pnpm --filter @daily/web exec playwright install chromium)
pnpm visual:capture  # screenshots + comparação com a referência em docs/design/screenshots/
pnpm visual:stats    # capturas da página de Estatísticas (docs/design/screenshots/stats/)
pnpm visual:habits   # capturas de /habitos, modal, popover e Estatísticas (docs/design/screenshots/habits/)
pnpm visual:views    # capturas das visões do calendário (docs/design/screenshots/views/)
pnpm visual:layout   # capturas de todas as rotas em 4 alturas (docs/design/screenshots/layout/)
pnpm format       # prettier --write
```

## Regra de relatório

A cada prompt de trabalho, salve o prompt em `docs/prompts/NN-prompt.md` e gere o relatório
`docs/prompts/NN-report.md` (o que foi feito, decisões, valores estimados, diferenças restantes,
como rodar, resultado de lint/typecheck/test/build e pendências). `NN` é sequencial (01, 02…).

## Dados

- Entidades e relações: `docs/data-model.md`; schemas zod em `packages/shared`.
- UI → `useData` (Zustand, `lib/data/app-store.ts`) → `DataRepository` → `LocalStorageRepository`. **Componentes nunca acessam `localStorage`.**
- Regras de domínio ficam em funções puras (`lib/data/rules.ts`, `selectors.ts`, `task-filters.ts`, `countdown.ts`), com teste.
- Mudou o formato salvo? Suba `DATA_VERSION`, escreva a migração em `envelope.ts` e atualize o histórico em `docs/data-model.md`.
- Modo Foco: lógica pura em `lib/focus` (`session.ts` = máquina de estados por timestamps, `hold.ts`, `time-input.ts`, `format.ts`, `top-days.ts`); efeitos em `controller.ts`; a sessão ativa fica numa chave própria (`daily:v2:focus`), fora do backup. O relógio é injetável: as funções recebem `nowMs`.
- Hábitos: lógica pura em `lib/habits` (`repeat.ts` = repetição reaproveitável, `engine.ts`, `matrix.ts`, `aggregate.ts`, `edit.ts`, `form.ts`); fontes automáticas leem água, foco e blocos via `HabitContext`. Editar repetição/meta/horário cria uma **regra nova a partir de hoje** (nunca reescreva o passado). As classes `habit-<cor>` precisam aparecer **literalmente** no código (`HABIT_COLOR_CLASS`).
- Calendário: a visão e a data vivem na URL (`?visao=dia|semana|mes|ano&data=yyyy-MM-dd`, `features/calendar/lib/views.ts`); a grade de horas (`TimeGrid`) posiciona blocos por **porcentagem** do intervalo, e o layout de simultâneos é a função pura `layoutSobreposicoes` (`lib/time-layout.ts`). Nunca monte classes do Tailwind por template: use mapas literais (`HABIT_COLOR_CLASS`, `DENSITY_CLASS`) ou variáveis CSS de tokens.
- Excluir algo = `deleteEventWithUndo` / `deleteSubjectWithUndo` (toast “Desfazer”, 6 s).

## Fixture visual

`/calendario?fixture=reference` (só em `pnpm dev`) carrega novembro/2024 com densidade da referência e data fixa, em memória (não toca nos dados reais); é usada por `visual:capture` e pelo e2e de fumaça.

## Referências

- Design: `docs/design/design-system.md` (fonte de verdade) e `docs/design/reference/calendar.png`
- Notas de ambiente: o TypeScript está fixado em 5.9 porque o typescript-eslint ainda não suporta o TS 7.
