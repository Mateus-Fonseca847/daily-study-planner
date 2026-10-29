# Relatório 01 — Monorepo e calendário mensal

## O que foi feito

- **Passo 0:** `docs/design/design-system.md` (v0.1) com paleta, tipografia, espaçamentos, raios,
  bordas, sombras e dimensões — todos marcados como _estimados_ (fator ≈ 1,8 sobre a imagem de 808 px).
- **Monorepo pnpm:** `apps/web`, `apps/api` (só README), `packages/shared`, `docs/`,
  `.github/workflows/ci.yml` (lint → typecheck → test → build). ESLint (flat), Prettier, TS strict
  (`noUncheckedIndexedAccess` etc.) e Vitest.
- **Web:** React 19 + Vite + Tailwind v4 + React Router + lucide-react (traço 1,5) + Inter variável.
- **Tokens:** `styles/tokens.css` é o único lugar com valores visuais (`--ds-*`); `styles/index.css`
  mapeia no tema do Tailwind e **zera as escalas padrão** (`--color-*: initial` etc.), então só
  existem utilitários derivados dos tokens.
- **UI:** Button (primary / secondary / pill / icon — `aria-label` obrigatório por tipo), Badge
  (contador / NEW), SegmentedControl, Select (nativo estilizado), EventChip, Popover, Avatar,
  ProgressBar, Checkbox.
- **Layout:** AppShell, Sidebar recolhível (barra amarela no item ativo, contadores), Topbar
  (seletor de matéria funcional como filtro, busca, notificações, Modo Foco).
- **Rotas:** `/calendario` funcional; as demais mostram `PlaceholderPage`.
- **Calendário:** grid DOM–SÁB com 4–6 semanas conforme o mês, dias de outros meses esmaecidos, dia
  atual em círculo amarelo, máx. 2 chips + “+N mais” (expande a célula), selects de mês/ano, “Hoje”,
  “+ Nova Prova” (visual), Semana/Ano como placeholder.
- **Popover:** trash (remove em estado local), menu (visual), fechar; título, data por extenso,
  horário, Matéria/Tipo/Status; provas com checklist + ProgressBar em estado local. Fecha com Esc e
  clique fora, prende o foco, devolve o foco ao chip e se posiciona perto do chip sem sair da tela.
- **Shared:** schemas zod (`studyEventSchema` etc.), tipos e `examProgress`.
- **Mocks:** gerados com date-fns relativos ao mês visível **e aos vizinhos**, então qualquer mês
  navegado parece populado; dias com 3–4 eventos; provas com 3 a 6 conteúdos; status derivado da
  data atual. Tudo validado pelo schema zod.
- **Testes:** grid do mês (fev/2026 começando no domingo = 4 semanas; out/2026 na quinta = 5; ago/2026
  no sábado = 6; início no domingo; dias fora do mês) e `examProgress` (vazio, parcial, total).
- `CLAUDE.md` e este relatório; prompt salvo em `docs/prompts/01-prompt.md`.

## Decisões

- **Tailwind v4 com `@theme inline` + prefixo `--ds-`** nos tokens para evitar colisão de nomes e
  permitir resetar as paletas padrão.
- **Active bar à direita da sidebar**, como na referência (e não à esquerda).
- **Chip de 2 linhas** (tipo + horário / título) em vez de 3 para caber 2 chips + “+N mais” numa linha
  de ~150 px em 1440×900.
- **`<select>` nativo** em vez de dropdown customizado: teclado e leitores de tela de graça.
- **TypeScript 5.9** fixado: o typescript-eslint ainda não suporta o TS 7 (que o pnpm instalaria).
- **Seletor de matéria** filtra o calendário (pequeno extra, barato e útil).
- Branch renomeada de `master` para `main`.

## Valores visuais estimados (resumo)

Fundo `#0B0B0C`, superfície `#141416`, elevada `#1C1C1F`, borda branco 8 %, amarelo `#F5E94B`, rosa
`#FF2D9B`, cinza `#8A8A93`. Sidebar 264 px, topbar 72 px, barra de controles 64 px, cabeçalho dos
dias 36 px, popover 288 px, controles 40 px, chips com raio 4 px e borda esquerda de 2 px, tipografia
Inter 10–24 px. Lista completa em `docs/design/design-system.md`.

## Diferenças restantes em relação à referência

Verificação feita no navegador embutido em 1440×900, comparando **a olho** (sem diff de pixels; o
screenshot do navegador sai reduzido para 800×500).

- Chips têm 2 linhas; a referência tem 3 (tipo, nome, horário).
- Sem moldura de dispositivo, cursor ou `Chat with Eva` (substituído por “Modo Foco”).
- Referência tem “Today” dentro do segmentado; aqui “Hoje” é um botão ao lado (conforme o prompt).
- Chip em dia fora do mês é esmaecido por opacidade; a referência não mostra esse caso.
- Logo textual “Daily.” é uma aproximação livre; ícones são do lucide (a referência usa outro set).
- Proporções vêm de estimativa por escala; podem divergir em poucos pixels (sidebar, altura de
  linhas). Nenhuma medição por sobreposição foi feita.
- A largura 1280 px não foi testada visualmente (o layout é fluido, mas não há screenshot).

## Como rodar

```bash
pnpm install
pnpm dev     # http://localhost:5173
```

## Resultado

| Comando          | Resultado                               |
| ---------------- | --------------------------------------- |
| `pnpm lint`      | passa                                   |
| `pnpm typecheck` | passa                                   |
| `pnpm test`      | passa (shared: 3 testes; web: 5 testes) |
| `pnpm build`     | passa                                   |

Teste manual no navegador: calendário carrega com dia atual destacado; clique abre o popover; marcar
um conteúdo atualiza `3/4` e a barra; Esc fecha e devolve o foco ao chip.

## Pendências

- `stroke-width` dos ícones (1,5) está nos componentes, não em token.
- A utilidade `border` padrão do Tailwind não é usada; larguras vêm de utilitários próprios
  (`border-hair`, `border-l-stripe`) ligados a tokens.
- Sem manifest/service worker (PWA) — fica para um próximo prompt.
- Sem testes de componente/E2E (somente lógica pura, conforme pedido).
- Visões Semana/Ano, “+ Nova Prova”, busca, notificações e menu do popover são apenas visuais.
- Checklist e exclusões não persistem após recarregar a página.
