# Daily

Organizador de estudos (PWA) para estudantes, pensado para ficar aberto o dia todo numa segunda
tela do PC. Projeto de portfólio: TypeScript estrito, código limpo, documentação e testes bem
escolhidos. Idioma da UI: **pt-BR**. Viewport-alvo: desktop 1440×900 (aceitável a partir de 1280 px).

Estado atual: só front-end com dados mockados (`apps/web/src/mocks`). `apps/api` é apenas um README.

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
pnpm format       # prettier --write
```

## Regra de relatório

A cada prompt de trabalho, salve o prompt em `docs/prompts/NN-prompt.md` e gere o relatório
`docs/prompts/NN-report.md` (o que foi feito, decisões, valores estimados, diferenças restantes,
como rodar, resultado de lint/typecheck/test/build e pendências). `NN` é sequencial (01, 02…).

## Fixture visual

`/calendario?fixture=reference` (só em `pnpm dev`) carrega novembro/2024 com densidade da referência e data fixa; é usada por `visual:capture` e pelo e2e.

## Referências

- Design: `docs/design/design-system.md` (fonte de verdade) e `docs/design/reference/calendar.png`
- Notas de ambiente: o TypeScript está fixado em 5.9 porque o typescript-eslint ainda não suporta o TS 7.
