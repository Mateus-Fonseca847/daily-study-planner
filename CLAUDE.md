# Daily

App de disciplina e desenvolvimento pessoal (PWA), nascido como organizador de estudos, pensado para ficar aberto o dia todo numa segunda
tela do PC. Projeto de portfólio: TypeScript estrito, código limpo, documentação e testes bem
escolhidos. Idioma da UI: **pt-BR**. Viewport-alvo: desktop 1440×900 (aceitável a partir de 1280 px).

Estado atual: só front-end; os dados ficam no `localStorage` (`daily:v4`) atrás de um `Repository`. Mocks (`apps/web/src/mocks`) só servem ao botão “Carregar dados de exemplo”, à fixture e aos testes. `apps/api` é apenas um README.

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
- **Dois temas**: todo componente novo funciona no claro e no escuro e usa só tokens semânticos.
  Os valores claros ficam em `:root[data-theme='light']` (mesmos nomes). Separe os papéis: cor de
  **preenchimento** (`bg-accent`, `bg-concluido`) × **tinta** sobre superfície (`text-accent-ink`,
  `text-concluido`) × **marca sobre preenchimento** (`text-accent-fg`, `text-on-status`,
  `text-on-habit`); anel de foco = `focus-ring`. `pnpm check:tokens` (no CI) falha com cor
  literal fora de `tokens.css`; o escuro é provado com `node apps/web/scripts/theme-regression.mjs
compare dark` e o contraste com `node apps/web/scripts/contrast-audit.mjs <rótulo> --all
--theme=light|dark`.
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
pnpm icons           # regenera os ícones do PWA (apps/web/public/icons/)
pnpm verify:prod     # verifica o app publicado (rotas, manifest, service worker, offline)
pnpm check:links     # confere os links relativos dos .md versionados
pnpm check:tokens    # falha com cor literal fora de tokens.css
pnpm format       # prettier --write
```

## Regra de relatório

A cada prompt de trabalho, salve o prompt em `docs/prompts/NN-prompt.md` e gere o relatório
`docs/prompts/NN-report.md` (o que foi feito, decisões, valores estimados, diferenças restantes,
como rodar, resultado de lint/typecheck/test/build e pendências). `NN` é sequencial (01, 02…).
A pasta `docs/prompts/` (e `docs/portfolio/`, `docs/media/`) **não é versionada**: fica só no disco,
listada no `.gitignore`, porque é material de processo e de divulgação, não do produto.

## Dados

- Entidades e relações: `docs/data-model.md`; schemas zod em `packages/shared`.
- UI → `useData` (Zustand, `lib/data/app-store.ts`) → `DataRepository` → `LocalStorageRepository`. **Componentes nunca acessam `localStorage`.**
- Regras de domínio ficam em funções puras (`lib/data/rules.ts`, `selectors.ts`, `subtasks.ts`, `countdown.ts`, `lib/tasks/sections.ts`), com teste.
- Compromissos: tipos `tarefa | prova | especial` e status `pendente | concluido | cancelado`; cores de status reservadas e chips por `chipStyle` (`lib/event-meta.ts`). Criar/ver/editar = `features/tasks/TaskPanel` (abre por `openEventForm`). Filtro global por tipo em `lib/tasks/type-filter-store.ts`.
- Mudou o formato salvo? Suba `DATA_VERSION`, escreva a migração em `envelope.ts` e atualize o histórico em `docs/data-model.md`.
- Modo Foco: lógica pura em `lib/focus` (`session.ts` = máquina de estados por timestamps, `hold.ts`, `time-input.ts`, `format.ts`, `top-days.ts`); efeitos em `controller.ts`; a sessão ativa fica numa chave própria (`daily:v2:focus`), fora do backup. O relógio é injetável: as funções recebem `nowMs`.
- Hábitos: lógica pura em `lib/habits` (`repeat.ts` = repetição reaproveitável, `engine.ts`, `matrix.ts`, `aggregate.ts`, `edit.ts`, `form.ts`); fontes automáticas leem água e foco via `HabitContext`; dias de descanso (`restDays`) contam como não agendados. Editar repetição/meta/horário cria uma **regra nova a partir de hoje** (nunca reescreva o passado). As classes `habit-<cor>` precisam aparecer **literalmente** no código (`HABIT_COLOR_CLASS`).
- Calendário: a visão e a data vivem na URL (`?visao=dia|semana|mes|ano&data=yyyy-MM-dd`, `features/calendar/lib/views.ts`); a grade de horas (`TimeGrid`) posiciona blocos por **porcentagem** do intervalo, e o layout de simultâneos é a função pura `layoutSobreposicoes` (`lib/time-layout.ts`). Nunca monte classes do Tailwind por template: use mapas literais (`HABIT_COLOR_CLASS`, `DENSITY_CLASS`) ou variáveis CSS de tokens.
- Responsivo: breakpoints num só lugar (`lib/responsive/breakpoints.ts`, espelhado em `styles/index.css`, com teste). Use as variantes `phone:`, `short:` e `coarse:` (e `md:`/`lg:`/`xl:`); JavaScript (`useBreakpoint`, `usePhone`) só quando a árvore muda. O desktop (≥ 1280 px) não pode mudar: confira com `node apps/web/scripts/desktop-regression.mjs compare` (a linha de base fica em `apps/web/.reports/`, fora do Git). Nada depende de hover; controles principais ≥ 44 px (`--ds-touch`), densos ≥ 24 px com `data-touch="dense"` e um equivalente maior; áreas que rolam na horizontal levam `data-scroll-x`; campos de texto ≥ 16 px. Popover, Modal e Menu já viram sheet/tela cheia no celular: use-os em vez de criar overlays novos.
- Paleta de matérias e hábitos: `PALETTE_COLORS` (sem vermelho, verde, amarelo e laranja); confira com `node apps/web/scripts/palette-check.mjs` e `src/styles/palette.test.ts` (os dois temas: ΔE ≥ 15 no escuro e ≥ 14 no claro).
- Tema: lógica pura em `lib/theme` (`theme.ts` = escolha `sistema | claro | escuro` em `daily:theme`, por dispositivo e fora do snapshot e da sincronização; `apply.ts`; `theme-store.ts`). `public/theme-init.js` repete a resolução antes da 1ª pintura (a CSP não permite script inline) e o teste `theme.test.ts` o roda num contexto isolado: mude os dois juntos. Usuário com dados começa no Escuro; instalação nova, em Sistema. Os e2e rodam com `colorScheme: 'dark'`.
- Excluir algo = `deleteEventWithUndo` / `deleteSubjectWithUndo` (toast “Desfazer”, 6 s).

## Fixture visual

`/calendario?fixture=reference` (só em `pnpm dev`) carrega novembro/2024 com densidade da referência e data fixa, em memória (não toca nos dados reais); é usada pelo e2e de fumaça.

## Referências

- Design: `docs/design/design-system.md` (fonte de verdade). As imagens de referência (mockups de terceiros) não fazem parte do repositório.
- Notas de ambiente: o TypeScript está fixado em 5.9 porque o typescript-eslint ainda não suporta o TS 7.
