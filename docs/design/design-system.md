# Daily — Design System (v0.2)

Fonte de verdade para os tokens em `apps/web/src/styles/tokens.css` (variáveis com prefixo `--ds-`, ex.: `--ds-color-bg`).
Referência: `docs/design/reference/calendar.png` (808×609 px, mockup com moldura de dispositivo).

## Como a referência foi medida

- A tela útil da referência vai de x≈23 a x≈790 (**767 px**) e de y≈22 a ≈597. Ela equivale a **1440 px** de largura, logo **escala ≈ 1,877** (referência → app). A altura equivalente seria ~1080 px; o app-alvo tem 900 px, então **alturas** de linhas do grid e dos chips são comprimidas (ver “Decisões de altura”).
- Cores foram amostradas com PIL (pixels da imagem); dimensões, por medição de linhas/bordas e por comparação lado a lado gerada por `pnpm visual:capture` (`docs/design/screenshots/compare/`).
- Legenda: **ajustado** = revisado e comparado com a referência (v0.2); **estimado** = valor da v0.1 não contradito pela comparação.

Tema: **somente escuro** (a referência não tem tema claro).

## 1. Paleta

| Token                       | Valor          | Status                                                                                | Antes (v0.1)       |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------- | ------------------ |
| `--ds-color-bg`             | `#131313`      | ajustado — a tela da referência é `#131313`; `#0C0C0C` é só a moldura                 | `#0B0B0C`          |
| `--ds-color-surface`        | `#1B1B1D`      | ajustado (trilho do segmentado, selects, botões de ícone)                             | `#141416`          |
| `--ds-color-surface-raised` | `#1E1F23`      | ajustado (popover; amostra `#1E1F23`)                                                 | `#1C1C1F`          |
| `--ds-color-border`         | branco a 8 %   | ajustado (linha do grid `#262626` sobre `#131313` = 8 %)                              | igual              |
| `--ds-color-border-strong`  | branco a 16 %  | estimado                                                                              | —                  |
| `--ds-color-hover`          | branco a 6 %   | ajustado (item ativo `#222124`, campo do popover `#2B2C30`)                           | igual              |
| `--ds-color-accent`         | `#F5E94B`      | estimado                                                                              | —                  |
| `--ds-color-accent-soft`    | amarelo a 15 % | ajustado (selo “NEW” é amarelo translúcido com texto amarelo)                         | novo               |
| `--ds-color-accent-fg`      | `#0B0B0C`      | estimado                                                                              | —                  |
| `--ds-color-badge`          | `#FF2D9B`      | estimado                                                                              | —                  |
| `--ds-color-badge-fg`       | `#0B0B0C`      | ajustado (texto escuro sobre rosa na referência; contraste 5,72:1)                    | `#FFFFFF` (3,44:1) |
| `--ds-color-fg`             | `#FFFFFF`      | ajustado                                                                              | —                  |
| `--ds-color-fg-soft`        | `#B0B0B6`      | ajustado — itens de menu, números dos dias, selects (referência `#A0A0A0`–`#E1E1E1`)  | novo               |
| `--ds-color-fg-muted`       | `#8A8A93`      | ajustado — mantido: 5,43:1 sobre o fundo (a referência usa `#7A7A7A`, que reprova AA) | —                  |
| `--ds-color-fg-subtle`      | `#808089`      | ajustado por contraste (dias de outros meses): 4,75:1                                 | `#55555C` (2,51:1) |
| `--ds-color-white-pill`     | `#FFFFFF`      | estimado (botão “Criar”, texto `#0B0B0C`)                                             | —                  |
| `--ds-event-chip-alpha`     | 10 %           | ajustado (fundos de chip na referência equivalem a ~9–10 %)                           | 15 %               |

Cores de evento (chip = cor a 10 % no fundo + borda esquerda de 2 px na cor cheia), todas estimadas: prova `#FF4D5E`, estudo `#3B82F6`, entrega `#FF9F1C`, revisão `#2FD16B`, especial `#E23FD8`. Contraste do rótulo colorido sobre o fundo do chip: 4,55:1 (estudo, o mínimo) a 7,87:1.

### Contraste (WCAG AA, 4,5:1 para texto normal)

| Par                                   | Razão            | Resultado                      |
| ------------------------------------- | ---------------- | ------------------------------ |
| `fg-muted` sobre `bg` / `raised`      | 5,43 / 4,81      | passa                          |
| `fg-soft` sobre `bg`                  | 8,61             | passa                          |
| `fg-subtle` sobre `bg`                | 4,75             | passa (antes 2,51 — reprovava) |
| texto escuro sobre `accent` / `badge` | 15,59 / 5,72     | passa                          |
| anel de foco `accent` sobre `bg`      | 14,72 (mín. 3:1) | passa                          |

Exceção documentada: chips de **dias de outros meses** têm `opacity-dimmed` (0,45) — é estado “inativo”, que o WCAG isenta de contraste mínimo.

## 2. Tipografia

Família: **Inter** (`@fontsource-variable/inter`), fallback `system-ui, sans-serif`. A comparação lado a lado mostra formas de letra equivalentes (`a`, `g`, `R`, `y`); **Inter foi mantida**, sem diferença clara de forma que justifique outra família. A referência parece ligeiramente mais larga nos itens de menu — compensado com 16 px.

| Papel                          | Tamanho       | Peso      | Altura de linha | Caixa / tracking             | Status                              |
| ------------------------------ | ------------- | --------- | --------------- | ---------------------------- | ----------------------------------- |
| Cabeçalho DOM–SÁB              | 11 px         | 700       | 14 px           | MAIÚSCULAS, +0,01 em, branco | ajustado (era 500, cinza, +0,08 em) |
| Rótulo de grupo (“Menus”)      | 13 px         | 500       | 20 px           | +0,01 em                     | ajustado (era 12 px)                |
| Número do dia (`01`…)          | 11 px         | 700       | 14 px           | com zero à esquerda          | ajustado (era 12 px/500)            |
| Chip — rótulo de tipo          | 10 px         | 500       | 12 px           | minúsculo                    | ajustado                            |
| Chip — título                  | 12 px         | 600       | 14 px           | normal                       | ajustado (lh 16 → 14)               |
| Chip — horário                 | 10 px         | 400       | 12 px           | intervalo “09:30 – 10:30”    | ajustado                            |
| Item de menu / CTA / “Criar”   | 16 px         | 500 / 600 | 20 px           | normal                       | ajustado (era 14 px)                |
| Selects, segmentado            | 14 px         | 400 / 500 | 20 px           | normal                       | ajustado (era 14/500, bold)         |
| Badge contador / NEW           | 11 px / 10 px | 600 / 700 | —               | NEW em MAIÚSCULAS            | estimado                            |
| Campos do popover              | 13 px         | 400 / 500 | 20 px           | normal                       | ajustado                            |
| Data/horário do popover        | 14 px         | 400       | 20 px           | normal                       | ajustado (era 13 px)                |
| Título do popover              | 19 px         | 600       | 24 px           | −0,01 em                     | ajustado (era 18 px)                |
| Título de página (placeholder) | 24 px         | 600       | 32 px           | −0,02 em                     | estimado                            |
| Logo “Daily.”                  | 22 px         | 700       | 28 px           | −0,02 em                     | estimado                            |

## 3. Espaçamento, raios, bordas, sombras

- Unidade base **4 px**. Valores intermediários usados: 6 px (padding da célula), 14 px (`--ds-sidebar-inset`), 18 px (padding do ícone do item).
- Raios: `sm 4 px` (chips), `md 8 px`, `lg 12 px`, `xl 24 px` (popover; era 16 px — ajustado), `full`.
- Bordas: 1 px branco 8 %; acento lateral do chip 2 px; barra do item ativo 3 px (ajustado: encostada na borda direita da sidebar).
- Sombra do popover: `0 24px 48px rgb(0 0 0 / 55 %)` + anel 1 px 8 % (estimado). Foco: anel amarelo 2 px com offset 2 px.

## 4. Dimensões (1440×900)

| Elemento                      | Dimensão                                                                                             | Status                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Sidebar                       | 248 px (recolhida 72 px)                                                                             | ajustado (era 264)                      |
| Cabeçalho da sidebar / topbar | 78 px, conteúdo centralizado abaixo de 12 px de respiro superior; borda inferior em ambos            | ajustado (era 72, sem borda na sidebar) |
| Botão “Criar”                 | 152 × 44 px, alinhado à esquerda, 14 px de inset                                                     | ajustado (era largura total)            |
| Item da sidebar               | 38 px de altura, inset 14 px, raio esquerdo 8 px, ícone 16 px (traço 1,5), gap 12 px                 | ajustado (era 40 / 18 px)               |
| Badge contador / NEW          | 20 px de altura                                                                                      | ajustado (era 18)                       |
| Avatar + seletor de matéria   | círculo de 40 px + pílula de 36 px × 192 px, sem borda                                               | ajustado (era pílula única com borda)   |
| Botões de ícone da topbar     | 40 px, círculo preenchido (`surface`), sem borda                                                     | ajustado                                |
| Barra de controles            | 68 px                                                                                                | ajustado (era 64)                       |
| Segmentado                    | trilho de 40 px sem borda; itens com largura mín. 78 px; “Hoje” dentro do trilho (ação, nunca ativa) | ajustado                                |
| Selects mês / ano             | 36 px de altura; 124 px / 88 px; texto 14 px                                                         | ajustado (era 40 px; 128 / 96)          |
| CTA “+ Nova Prova”            | 40 px, texto 16 px semibold                                                                          | ajustado                                |
| Cabeçalho dos dias            | 28 px                                                                                                | ajustado (era 36)                       |
| Célula do calendário          | linha mínima 144 px; padding 6 px (esq.) / 12 px (dir.)                                              | ajustado                                |
| Chip                          | 3 linhas, ~44 px (referência: ~56 px), raio 4 px                                                     | ajustado (era 2 linhas)                 |
| Dia atual                     | círculo de 20 px, amarelo                                                                            | ajustado (era 24)                       |
| Popover                       | 288 px, raio 24 px, padding 16 px                                                                    | ajustado                                |
| Botões do popover             | quadrados arredondados de 24 px, fundo `hover`, sem borda                                            | ajustado (eram círculos de 28 px)       |
| Campos do popover             | rótulo 56 px; valor 24 px de altura, gap 4 px, raio 8 px                                             | ajustado (28 / 8 px)                    |
| Barra de progresso, checkbox  | 6 px; 16 px                                                                                          | estimado                                |

### Decisões de altura

A referência equivale a 1440×1080; o alvo é 1440×900. Larguras seguem a escala 1,877. Com topbar 78 + controles 68 + cabeçalho 28 sobram 726 px: **5 semanas × 145 px**. Um chip de 3 linhas na escala exata teria ~56 px; isso não cabe (2 chips + “+N mais” exigem ≥ 172 px). Regra adotada: chip compacto de ~44 px (linhas de 12/14/12 px) → **2 chips completos + “+N mais” cabem em 142 px** e a altura mínima da linha é 144 px (`--ds-cell-min-h`).
Se a janela for menor (1280×720/800) ou o mês tiver 6 semanas, as linhas **não encolhem abaixo de 144 px** e a área do grid rola verticalmente; nada é cortado. Mais de 2 eventos num dia: o link “+N mais” expande a célula.

## 5. Adaptação ao domínio de estudos

Eventos: prova, estudo, entrega, revisão, especial. “Matéria” substitui “Artista”, “Status” substitui o estágio de negociação. Provas exibem checklist de conteúdos com barra de progresso.

## 6. Diferenças intencionais em relação à referência

- Logo textual “Daily.”; ícones lucide (a referência usa outro conjunto).
- Sem moldura de dispositivo, cursor ou botão “Chat with Eva” (vira “Modo Foco”).
- Chips ~44 px em vez de ~56 px (ver acima); chips da referência aparecem “esmaecidos” em parte dos dias — aqui só os dias de outros meses são esmaecidos.
- O seletor de matéria mantém a seta (é um `<select>` funcional).
