# Daily — Design System (v0.6)

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

## 9. Dashboard (Estatísticas)

Fonte: `docs/design/reference/stats-dashboard.png` (1187×896; a página de **Estatísticas**, não o Modo Foco). Ignoramos a moldura do aparelho, o fundo texturizado, a barra de navegação, a marca, os logotipos, os avatares e os textos. **Todos os valores abaixo são estimados** (amostras de pixel da imagem e medição de bordas; escala ≈ 1,12 da imagem para o app, onde o conteúdo tem no máximo 72 rem).

### Adaptações obrigatórias

- O destaque é o **amarelo do Daily** (`--ds-color-accent`), nunca o verde-limão da referência (`#D1F85C`).
- A água usa **índigo/roxo** (tokens novos `--ds-color-water*`), no lugar do azul-arroxeado da referência.
- Sem marca, logotipos, avatares ou textos da referência; conteúdo 100 % do domínio de estudos.

### Superfícies

| Item                      | Valor estimado                                                                                                        | Token                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Página                    | `#131313` (igual ao app); a referência usa `#171717` com cartões `#2A2A2A`                                            | `--ds-color-bg`                         |
| Cartão “glass”            | gradiente diagonal (145°) de branco 7 % → 2,5 %, borda 1 px branca a 8 %, realce interno de 1 px no topo (branco 6 %) | `--ds-glass-bg`, `--ds-glass-highlight` |
| Raio do cartão grande     | 32 px (referência ≈ 30 px na imagem)                                                                                  | `--ds-radius-card`                      |
| Raio de itens flutuantes  | 20 px (cartões da agenda, pílulas)                                                                                    | `--ds-radius-card-sm`                   |
| Padding do cartão         | 24 px                                                                                                                 | `--ds-card-pad`                         |
| Espaço entre cartões      | 16 px (referência ≈ 13 px)                                                                                            | `--ds-card-gap`                         |
| Brilho do cartão de metas | gradiente radial no canto inferior direito, amarelo a 28 % → transparente (60 %)                                      | `--ds-glow-accent`                      |

### Proporções do grid (4 colunas × 2 linhas)

| Cartão                 | Colunas | Linhas | Largura na referência | Fração       |
| ---------------------- | ------- | ------ | --------------------- | ------------ |
| Semana (barras)        | 1       | 1      | 248 px                | `1.5fr`      |
| Anel (preparação/foco) | 2       | 1      | 248 px                | `1.5fr`      |
| Água                   | 3       | 1      | 161 px                | `1fr`        |
| Metas do dia           | 4       | 1–2    | 336 px                | `2fr`        |
| Agenda                 | 1–3     | 2      | 683 px                | `4fr` (soma) |

Alturas: linha 1 ≈ 288 px na imagem (≈ 20 rem no app); linha 2 ≈ 230 px (≈ 14,5 rem). O cartão de metas atravessa as duas linhas (≈ 530 px na imagem). Abaixo de 1100 px de largura o grid vira 2 colunas e, abaixo de 700 px, 1 coluna.

### Tipografia

| Papel                                   | Estimado                         | Token                  |
| --------------------------------------- | -------------------------------- | ---------------------- |
| Saudação (“Olá, Nome”)                  | 36 px, peso 400, nome em amarelo | `--ds-text-display`    |
| Título do cartão                        | 20 px, peso 400                  | `--ds-text-card-title` |
| Número grande (8h, 10 km, 40 %)         | 30 px, peso 400, `tabular-nums`  | `--ds-text-stat`       |
| Rótulo pequeno (Total, Meta, Concluído) | 14 px, `muted`                   | `--ds-text-md`         |
| Rótulos de eixo (Seg, Ter…)             | 11 px                            | `--ds-text-xs`         |

### Componentes do dashboard

- **Barras da semana:** 7 barras verticais em pílula (≈ 20 px de largura, ≈ 110 px de altura, vão ≈ 8 px). Trilha `--ds-color-chart-track`; o **planejado** é um hachurado índigo (`--ds-hatch-planned`) e o **concluído** é preenchido de baixo para cima em amarelo; o dia atual tem a trilha clara (`--ds-color-chart-track-strong`) e o rótulo em pílula.
- **Anel:** diâmetro ≈ 136 px (≈ 150 px no app), espessura ≈ 18 px (≈ 13 % do diâmetro), extremidades arredondadas, trilha `--ds-color-chart-track`, arco amarelo; valor no centro.
- **Cartão de água:** metade de cima na superfície do cartão, metade de baixo em gradiente índigo (`--ds-water-gradient`), com **onda** (path SVG) de transição em tom mais claro; valor grande (ex.: `0,7 L`) e botão circular “+” (branco a 20 %, ≈ 32 px) no canto inferior.
- **Metas do dia:** linhas de ≈ 63 px com ícone em círculo de 40 px (superfície clara), título, círculo de verificação de 24 px (amarelo com visto escuro quando cumprida, vazio escuro quando não); metas cumpridas ficam esmaecidas e riscadas; separadores tracejados; barra de progresso de 12 px (trilha clara, preenchimento amarelo) e “Concluído NN %”.
- **Agenda:** chips de data e de mês em pílula (`surface`), botão de calendário circular; horários à esquerda com linhas tracejadas; **cartões flutuantes** escuros (`--ds-radius-card-sm`, sombra `--ds-shadow-popover`) sobrepostos e deslocados; botão de ação circular amarelo de 48 px com brilho.

### Tokens previstos (definidos em `tokens.css`)

`--ds-radius-card`, `--ds-radius-card-sm`, `--ds-card-pad`, `--ds-card-gap`, `--ds-glass-bg`, `--ds-glass-highlight`, `--ds-glow-accent`, `--ds-color-water`, `--ds-color-water-deep`, `--ds-color-water-wave`, `--ds-water-gradient`, `--ds-color-chart-track`, `--ds-color-chart-track-strong`, `--ds-hatch-planned`, `--ds-text-display`, `--ds-text-card-title`, `--ds-text-stat`.

### 9.1 Implementação (v0.6) e “Análises”

- **Página** (`features/stats`): saudação, seção “Hoje” (grid de 4 colunas a partir de 80 rem; 2 colunas abaixo) e seção “Análises”; rola na vertical, com conteúdo de até `--ds-container-stats`.
- **Análises:** seis cartões `surface-glass` em 2 colunas (1 abaixo de 64 rem). Gráficos em **SVG próprio** (`features/stats/charts.tsx`): barras (trilha `chart-track-strong` = planejado, amarelo = realizado; linha de referência para a meta de água), barras horizontais na cor da matéria e mapa de calor de 12 semanas (opacidade do amarelo ∝ % de metas). Alturas por tokens (`h-chart`, `h-chart-sm`, `h-stat-bar`).
- **Acessibilidade dos gráficos:** barras têm tabela `sr-only` com legenda; o mapa de calor é `role="img"` com resumo; todos os cartões vazios mostram “Ainda não há dados neste período”.
- **Água:** onda animada (`animate-wave`) com a altura proporcional à meta; `prefers-reduced-motion` desliga a animação e a transição.
- **Agenda:** linha do tempo 06h–23h rolada até o horário atual, cartões que se escalonam quando se sobrepõem (`lib/stats/agenda.ts`), linha de “agora”.
- **Diferenças restantes em relação à referência:** o rótulo da matéria no cartão “Preparação” é truncado em janelas estreitas; a referência não tem a coluna de origem das metas automáticas; os cartões flutuantes da agenda não têm avatares (não usamos imagens da referência); o fundo texturizado da moldura não é reproduzido.
- **Capturas:** `pnpm visual:stats` → `docs/design/screenshots/stats/` (página inteira e primeira dobra em 1920×1080, 1440×900 e 1280×720; lado a lado com a referência por região em 1920 e 1440).

## 10. Cronômetro do Modo Foco

> **v0.5 (03.1):** o cronômetro foi redesenhado para ser minimalista. **Os valores da tabela abaixo (v0.4) foram substituídos pelos da seção 10.1**, que traz o antes/depois. A tabela fica como histórico.

Especificação visual **estimada** no mesmo sistema (a referência não tem cronômetro). Rota `/foco`: página limpa, só o anel, os dígitos e os controles, centralizados.

| Item                      | Valor                                                                                                                                                                                           | Token                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Anel                      | diâmetro 320 px (20 rem), traço de 14 px com pontas arredondadas; a trilha é o círculo inteiro                                                                                                  | `--ds-timer-size`, `--ds-timer-stroke` |
| Cor da trilha             | branco a 10 %                                                                                                                                                                                   | `--ds-color-timer-track`               |
| Cor do progresso          | amarelo do Daily (rodando)                                                                                                                                                                      | `--ds-color-timer-progress`            |
| Pausado                   | arco em cinza claro (`fg-soft`) e dígitos em `soft`                                                                                                                                             | `--ds-color-timer-paused`              |
| Concluído                 | arco cheio em verde (cor de “revisão”)                                                                                                                                                          | `--ds-color-timer-done`                |
| Dígitos                   | 72 px (4,5 rem), peso 300, `tabular-nums`, altura de linha 1, `mm:ss` (ou `h:mm:ss`)                                                                                                            | `--ds-text-timer`                      |
| Botão/“puxador” do ajuste | círculo de 24 px na posição do ângulo escolhido, só no estado ocioso                                                                                                                            | `--ds-timer-knob`                      |
| Faixa de ajuste           | 1 a 180 min; o anel inteiro = 180 min; 1 min por passo                                                                                                                                          | constantes em `lib/focus`              |
| Progresso rodando         | o arco **diminui** do cheio até zero                                                                                                                                                            | —                                      |
| Estados                   | **ocioso** (arco = duração/180 + puxador), **rodando** (amarelo), **pausado** (cinza), **concluído** (verde, tela de resumo), **travado** (selo “Tela travada”, controles de navegação ocultos) | —                                      |
| Movimento                 | transições do arco desligadas com `prefers-reduced-motion`                                                                                                                                      | —                                      |
| Hold-to-unlock            | botão `outline` com anel de progresso que preenche em 3 s                                                                                                                                       | `HOLD_TO_UNLOCK_MS`                    |

Acessibilidade do anel: `role="slider"` (`aria-valuemin=1`, `aria-valuemax=180`, `aria-valuenow`, `aria-valuetext` “25 minutos”), teclado (setas ±1, PageUp/PageDown ±5, Home/End), arraste por ponteiro (mouse e toque). Os dígitos têm `role="timer"` e não são anunciados a cada segundo (sem `aria-live`).

### 10.1 Cronômetro minimalista (v0.5) — antes/depois

Princípio: o anel com o tempo dentro, e quase mais nada. Sem cartões, sem textos auxiliares; as explicações vão para `aria-describedby`, tooltips (`title`) e README. Valores **estimados**.

| Item                                                                                       | Antes (v0.4)                                                  | Depois (v0.5)                                                                  | Token                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------ |
| Diâmetro do anel                                                                           | 320 px (20 rem)                                               | **352 px (22 rem)**                                                            | `--ds-timer-size`              |
| Espessura do traço                                                                         | 14 px (4,375 un. do viewBox)                                  | **≈ 5 px (1,5 un.)**                                                           | `--ds-timer-stroke`            |
| Anel ocioso                                                                                | arco = duração/180 + alça arrastável                          | **anel completo, neutro** (branco a 28 %)                                      | `--ds-color-timer-idle` (novo) |
| Alça (bolinha) e arrastar                                                                  | sim                                                           | **removidos** (o anel só indica progresso)                                     | —                              |
| Dígitos                                                                                    | 72 px, peso 300, `tabular-nums`                               | igual (72 px, 300, tabulares) — mais respiro ao redor                          | `--ds-text-timer`              |
| Largura do campo de tempo                                                                  | —                                                             | 288 px (18 rem), centralizado                                                  | `--ds-timer-input-w` (novo)    |
| Controles dentro do anel                                                                   | Iniciar/Pausar/Reiniciar/Encerrar em botões com texto, abaixo | **só ícones** dentro do anel, abaixo dos dígitos                               | `Button variant="icon"`        |
| Atalhos de tempo (15–90), −5/+5, seletor “Estudando”, parágrafo da trava, “Segure por 3 s” | visíveis                                                      | **removidos da tela**                                                          | —                              |
| Cadeado (travar ao iniciar)                                                                | caixa de seleção com texto                                    | ícone pequeno discreto sob o anel (`aria-pressed`), só com o cronômetro parado | —                              |
| Posição do anel                                                                            | no fluxo, empurrado pelos controles                           | **centralizado** na área útil; o que fica abaixo é posicionado fora do fluxo   | —                              |

Estados (v0.5):

| Estado                        | Anel                   | Dentro do anel                                                                                              | Sob o anel                       |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Ocioso                        | completo, neutro       | tempo **editável** + play (amarelo)                                                                         | cadeado                          |
| Rodando (sem trava)           | amarelo, diminui       | tempo + pausar                                                                                              | —                                |
| Pausado (sem trava)           | cinza claro, congelado | tempo **piscando** (`animate-pulse`, desligado com `prefers-reduced-motion`) + retomar, reiniciar, encerrar | —                                |
| Rodando/pausado **com trava** | amarelo / cinza        | só o tempo                                                                                                  | só “Segurar para destravar”      |
| Concluído                     | completo, verde        | “Concluído” + duração focada + nova sessão                                                                  | link discreto “Ver estatísticas” |

Campo de tempo: `<input>` sem caixa nem borda (apenas sublinhado sutil de 1 px no hover e no foco, cursor amarelo); aceita só dígitos e “:”; `25` = 25 min, `25:30`, `1:30:00`, `90` = 1 h 30; Enter e sair confirmam, Esc cancela, ↑/↓ ±1 min (Shift ±5); mínimo 1 min, máximo 3 h (valores fora são ajustados com aviso `aria-live`; formato inválido volta ao valor anterior).
