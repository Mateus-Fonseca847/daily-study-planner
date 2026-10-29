# Daily — Design System (v0.1)

Fonte de verdade para os tokens em `apps/web/src/styles/tokens.css` (variáveis com prefixo `--ds-`, ex.: `--ds-color-bg`).
Referência: `docs/design/reference/calendar.png` (808×609 px, mockup com moldura de dispositivo).

> **Todos os valores abaixo são _estimados_.** A imagem tem ~790 px úteis de largura; os
> valores foram convertidos para o viewport-alvo de 1440×900 com fator ≈ 1,8 e arredondados
> para a grade de 4 px. Ajustes finos devem ser feitos aqui primeiro e depois em `tokens.css`.

Tema: **somente escuro** (a referência não tem tema claro).

## 1. Paleta (estimado)

| Token                       | Valor         | Uso                                |
| --------------------------- | ------------- | ---------------------------------- |
| `--ds-color-bg`             | `#0B0B0C`     | fundo da aplicação / sidebar       |
| `--ds-color-surface`        | `#141416`     | superfícies (selects, segmentado)  |
| `--ds-color-surface-raised` | `#1C1C1F`     | popover, itens ativos              |
| `--ds-color-border`         | branco a 8 %  | todas as bordas de 1 px            |
| `--ds-color-border-strong`  | branco a 16 % | foco/hover de contornos            |
| `--ds-color-hover`          | branco a 6 %  | hover de itens                     |
| `--ds-color-accent`         | `#F5E94B`     | destaque amarelo (CTA, item ativo) |
| `--ds-color-accent-fg`      | `#0B0B0C`     | texto sobre o amarelo              |
| `--ds-color-badge`          | `#FF2D9B`     | contador rosa                      |
| `--ds-color-fg`             | `#FFFFFF`     | texto principal                    |
| `--ds-color-fg-muted`       | `#8A8A93`     | texto secundário, números dos dias |
| `--ds-color-fg-subtle`      | `#55555C`     | dias de outros meses, placeholders |
| `--ds-color-white-pill`     | `#FFFFFF`     | botão “Criar” (texto `#0B0B0C`)    |

Cores de evento (chip = cor a 15 % no fundo + borda esquerda de 2 px na cor cheia):

| Tipo     | Cor       | Observação na referência |
| -------- | --------- | ------------------------ |
| prova    | `#FF4D5E` | vermelho                 |
| estudo   | `#3B82F6` | azul                     |
| entrega  | `#FF9F1C` | laranja                  |
| revisão  | `#2FD16B` | verde                    |
| especial | `#E23FD8` | magenta                  |

## 2. Tipografia (estimado)

Família: **Inter** (`@fontsource-variable/inter`), fallback `system-ui, sans-serif`.

| Papel                          | Tamanho | Peso | Altura de linha | Caixa / tracking     |
| ------------------------------ | ------- | ---- | --------------- | -------------------- |
| Cabeçalho DOM–SÁB              | 11 px   | 500  | 16 px           | MAIÚSCULAS, +0,08 em |
| Rótulo de grupo (“Menus”)      | 12 px   | 500  | 16 px           | normal, +0,01 em     |
| Número do dia                  | 12 px   | 500  | 16 px           | normal               |
| Chip — rótulo de tipo          | 10 px   | 500  | 14 px           | normal               |
| Chip — título                  | 12 px   | 600  | 16 px           | normal               |
| Chip — horário                 | 10 px   | 400  | 14 px           | normal               |
| Item de menu / botões          | 14 px   | 500  | 20 px           | normal               |
| Badge                          | 11 px   | 600  | 14 px           | normal               |
| Corpo / campos do popover      | 13 px   | 400  | 20 px           | normal               |
| Título do popover              | 18 px   | 600  | 24 px           | −0,01 em             |
| Título de página (placeholder) | 24 px   | 600  | 32 px           | −0,02 em             |
| Logo “Daily”                   | 22 px   | 700  | 28 px           | −0,02 em             |

Pesos usados: 400, 500, 600, 700.

## 3. Espaçamento, raios, bordas, sombras (estimado)

- Unidade base: **4 px** (escala do Tailwind: `p-1 = 4 px`).
- Raios: `sm 4 px` (chips), `md 8 px` (itens, selects), `lg 12 px`, `xl 16 px` (popover), `full` (pílulas e avatares).
- Bordas: `1 px` branco a 8 %; acento lateral do chip e do popover `2 px`; barra do item ativo `3 px`.
- Sombras: `--ds-shadow-popover: 0 24px 48px rgb(0 0 0 / 55 %), 0 0 0 1px` branco a 8 %; `--ds-focus-*`: anel de 2 px amarelo com offset de 2 px.
- Foco visível: anel amarelo 2 px (`:focus-visible`).

## 4. Dimensões (1440×900, estimado)

| Elemento                 | Dimensão                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Sidebar expandida        | 264 px de largura (recolhida: 72 px)                                                  |
| Cabeçalho da sidebar     | 72 px (logo + botão de recolher 32 px)                                                |
| Botão “Criar”            | 44 px de altura, pílula branca, largura total (− 2×16 px)                             |
| Item da sidebar          | 40 px de altura, ícone 18 px (traço 1,5), gap 12 px, raio 8 px                        |
| Barra do item ativo      | 3 px × 40 px na borda direita da sidebar, amarela                                     |
| Topbar                   | 72 px de altura, padding horizontal 24 px                                             |
| Seletor de matéria       | 40 px de altura, pílula com avatar de 24 px                                           |
| Botões de ícone (busca…) | 40 × 40 px, circulares, borda 1 px                                                    |
| Botão “Modo Foco”        | 40 px de altura, pílula contornada, padding 16 px                                     |
| Barra de controles       | 64 px de altura, padding horizontal 24 px                                             |
| Segmentado               | 40 px de altura, trilho `surface`, item ativo amarelo (pílula)                        |
| Selects (mês/ano)        | 40 px de altura, raio 8 px; mês 128 px, ano 96 px                                     |
| Botão “+ Nova Prova”     | 40 px de altura, pílula amarela, padding 16 px                                        |
| Cabeçalho dos dias       | 36 px de altura                                                                       |
| Célula do calendário     | largura = 1/7 da área; altura = (área − cabeçalho)/semanas; padding 8 px; mín. 112 px |
| Chip de evento           | altura ≈ 40 px (2 linhas), padding 4 px 8 px, raio 4 px, gap 4 px                     |
| Máx. de chips por dia    | 2; excedente vira link “+N mais” (altura 20 px, 11 px)                                |
| Dia atual                | número em círculo amarelo de 24 px, texto preto                                       |
| Popover                  | 288 px de largura, raio 16 px, padding 16 px, fundo `surface-raised`                  |
| Botões do popover        | 28 × 28 px, circulares, ícone 14 px                                                   |
| Campo do popover         | rótulo 56 px + valor com fundo `hover`, 28 px de altura, raio 6 px                    |
| Badge contador           | altura 18 px, mín. 20 px, pílula rosa, texto branco                                   |
| Badge “NEW”              | altura 18 px, pílula amarela, texto preto, 10 px MAIÚSCULAS                           |
| Avatar                   | 24 px (topbar), 32 px (sidebar), círculo com inicial                                  |
| Barra de progresso       | 6 px de altura, trilho `hover`, preenchimento amarelo                                 |
| Checkbox                 | 16 px, raio 4 px, borda 1 px, marcado = amarelo com check preto                       |

## 5. Adaptação ao domínio de estudos

Eventos: prova, estudo, entrega, revisão, especial. “Matéria” substitui “Artista”, “Status”
substitui o estágio de negociação (Agendada, Em andamento, Concluída). Provas exibem
checklist de conteúdos com barra de progresso.

## 6. Diferenças intencionais em relação à referência

- Não há logo/ícones da marca original; logo textual “Daily”.
- A referência mostra chips com 3 linhas; usamos 2 para caber 2 chips + “+N mais” em 900 px.
- Sem moldura de dispositivo.
