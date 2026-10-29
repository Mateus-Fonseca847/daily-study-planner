# Daily — Design System (v0.3)

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

## 7. Componentes do Prompt 02 (formulários, menus, avisos e estados)

Todos usam apenas utilitários derivados de tokens; nenhum valor visual literal.

### Botões (`ui/Button`)

| Variante    | Uso                                    | Tokens principais                                             |
| ----------- | -------------------------------------- | ------------------------------------------------------------- |
| `primary`   | Ação principal (amarelo)               | `accent`, `accent-fg`, `text-nav` 16 px semibold, `h-control` |
| `secondary` | Ação secundária contornada             | `border-strong`, `text-md` 14 px                              |
| `outline`   | Contornado de 13 px (Modo Foco, toast) | igual ao secundário com `text-base`                           |
| `pill`      | “Criar” da sidebar                     | `white-pill`, `create-w` × `create-h`                         |
| `icon`      | Círculo preenchido (topbar, sidebar)   | `surface`; tamanhos `xs 24 / sm 32 / md 40`                   |
| `tile`      | Quadrado arredondado (popover, modal)  | `hover`, `radius-md`; tamanho `xs` 24 px                      |

Acessibilidade: botões só com ícone **exigem** `aria-label` (garantido pelo tipo); foco visível via anel amarelo global; `disabled` reduz a opacidade.

### Modal (`ui/Modal`)

- Camada: `scrim` (preto a 40 %) cobrindo a tela; painel `surface-raised`, `radius-xl`, `shadow-popover`, largura `--ds-modal-w` (32 rem), altura máxima `--ds-modal-max-h` (90 dvh) com rolagem interna.
- Estrutura: título `text-title` semibold + botão `tile` “Fechar”; corpo com `px-6`; rodapé alinhado à direita com `gap-2` (Cancelar `secondary`, Salvar `primary`).
- Acessibilidade: `role="dialog"`, `aria-modal`, `aria-labelledby`; foco preso (Tab/Shift+Tab), foco inicial em `[data-autofocus]` (ou no primeiro controle), **Esc fecha** e o foco volta a quem abriu (hook `useFocusScope`, também usado pelo popover).

### Menu (`ui/Menu`)

- Painel `surface-raised` com `border-hair`, `radius-lg`, `shadow-popover`, largura `--ds-menu-w` (13 rem); itens de `h-select` (36 px), `text-md`, ícone de 16 px em `muted`; hover/foco com `hover`.
- Fica logo após o gatilho no DOM (sem portal), por isso funciona dentro do popover.
- Acessibilidade: gatilho com `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`; painel `role="menu"`, itens `role="menuitem"`; foco no primeiro item ao abrir; ↑/↓ circulam, Home/End vão às pontas, **Esc fecha só o menu** e devolve o foco ao gatilho, Tab e clique fora fecham.

### Toast (`ui/ToastRegion`)

- Cartão `surface-raised`, `radius-lg`, `shadow-popover`, largura máxima `--ds-toast-w` (26 rem), centralizado na base; mensagem `text-md` e botão `outline` “Desfazer”.
- Duração: 6 s com “Desfazer” (`UNDO_MS`); avisos simples, 4 s.
- Acessibilidade: a região é `role="status"` com `aria-live="polite"`, então cada toast é anunciado; o botão é alcançável por teclado.

### Formulários (`ui/Field`)

| Componente      | Controle                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `TextField`     | Input de `h-select` (36 px), `surface`, `border-hair`, `radius-md`, `text-md`, placeholder `muted` |
| `TextAreaField` | Mesmo estilo, altura mínima `--ds-textarea-h` (5 rem), redimensionável na vertical                 |
| `SelectField`   | `<select>` nativo estilizado (`ui/Select`) com seta                                                |

- Rótulo acima (`text-base` medium, `soft`), **sempre** associado por `htmlFor`/`id`; ajuda em `text-sm muted`; erro em `text-sm danger` (`--ds-color-danger`, 5,4:1 sobre o painel), no `role="alert"`.
- Campo inválido: `aria-invalid="true"` + `aria-describedby` para a mensagem + borda `danger`; ao enviar com erro o foco vai ao primeiro campo inválido.
- Datas e horários usam os controles nativos (`color-scheme: dark`). `radio`/`checkbox` nativos usam `accent-color` amarelo.
- Mensagens de erro em pt-BR, geradas pelos schemas zod.

### Lista de conteúdos (`forms/ContentsEditor`)

- Linha: input (`h-select`) + três botões `tile` `xs` (subir, descer, remover) com `gap-1`; “Adicionar conteúdo” em `secondary`. Enter na última linha cria outra.
- Acessibilidade: cada controle tem `aria-label` com o número (“Mover conteúdo 2 para cima”); subir/descer ficam `disabled` nas pontas; reordenar não exige arrastar.
- No popover (`EventPopover`): checkbox por conteúdo (riscado e `muted` quando concluído), contador `done/total`, `ProgressBar` (`role="progressbar"`, `aria-valuenow`) e input “Adicionar conteúdo” de 24 px (`h-field`) com botão `tile`.

### Abas (`ui/Tabs`) e estado vazio (`ui/EmptyState`)

- Abas: trilho igual ao segmentado (`surface`, ativo amarelo); `role="tablist"/"tab"/"tabpanel"`, ←/→ movem a seleção, `tabIndex` roving.
- Estado vazio: borda `hair`, `radius-xl`, ícone de 32 px `muted`, título `text-lg`, texto `text-md muted` (largura máx. do modal), ações centralizadas.

### Estados de evento (`concluído` e `cancelado`)

| Estado                 | Chip (calendário e listas)                              | Token                      |
| ---------------------- | ------------------------------------------------------- | -------------------------- |
| pendente, em andamento | normal                                                  | —                          |
| concluído              | esmaecido + título riscado                              | `--ds-opacity-done` 0,55   |
| cancelado              | igual ao concluído (a diferença é o rótulo “Cancelado”) | `--ds-opacity-done`        |
| dia de outro mês       | esmaecido (já existia)                                  | `--ds-opacity-dimmed` 0,45 |

O estado nunca depende só da cor/opacidade: o status aparece por extenso no popover, nas listas e no formulário.

### Cores de matéria

Paleta fixa de 8 cores (`--ds-color-subject-vermelho … rosa`); aparece como ponto de `--ds-dot` (10 px) nas listas e como seletor de `--ds-swatch` (28 px) no formulário (`role="radiogroup"`, cada cor com `aria-label` e `aria-checked`).

### Tokens adicionados no Prompt 02 e 02.1

| Token                     | Valor                      | Uso                                      |
| ------------------------- | -------------------------- | ---------------------------------------- |
| `--ds-color-danger`       | `#FF6B78`                  | erros de formulário/alertas              |
| `--ds-color-subject-*`    | 8 cores                    | paleta de matérias                       |
| `--ds-opacity-done`       | 0,55                       | chips concluídos/cancelados              |
| `--ds-modal-w` / `-max-h` | 32 rem / 90 dvh            | modal                                    |
| `--ds-menu-w`             | 13 rem                     | menu suspenso                            |
| `--ds-toast-w`            | 26 rem                     | toast                                    |
| `--ds-page-max-w`         | 56 rem                     | largura do conteúdo das páginas de lista |
| `--ds-textarea-h`         | 5 rem                      | altura mínima do textarea                |
| `--ds-chip-pad-y`         | 3 px (4 px em telas altas) | respiro vertical do chip                 |

## 8. Telas altas (segunda tela em 1920×1080)

Com `min-height: 1000px` (`@media` em `tokens.css`): `--ds-chip-pad-y` sobe de 3 px para 4 px e `--ds-cell-min-h` de 9 rem para 9,4 rem.

| Medida (Nov/2026, dados de exemplo)                  | Antes (1920×1080) | Depois (1920×1080)          | 1440×900 (inalterado) |
| ---------------------------------------------------- | ----------------- | --------------------------- | --------------------- |
| Altura do chip                                       | 46 px             | **48 px**                   | 46 px                 |
| Linha do grid, mês de 5 semanas                      | 181 px            | 181 px (preenche a tela)    | 145 px                |
| Linha do grid, mês de 6 semanas                      | 151 px            | 151 px (≥ mínimo de 150 px) | 144 px (rola)         |
| Conteúdo necessário por célula (2 chips + “+N mais”) | 142 px            | 150 px                      | 142 px                |

Regra: o chip só cresce até o ponto em que **2 chips + “+N mais” ainda cabem numa linha de mês de 6 semanas** (a pior hipótese em 1080 px). Em meses de 5 semanas sobra ~30 px abaixo dos chips; aceitável, e o grid continua ocupando toda a altura.

Capturas: `docs/design/screenshots/app/*-1440x900.png` e `*-1920x1080.png` (`pnpm visual:app`).
