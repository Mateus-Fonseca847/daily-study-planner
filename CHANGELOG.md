# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). O projeto ainda não
tem versões publicadas.

## [Não lançado]

### Corrigido (v0.5.1, AppShell na altura da janela)

- Em `/habitos` o **documento** rolava (1460 px numa janela de 1080) e aparecia uma faixa do fundo do body embaixo, como se o conteúdo fosse cortado. Causa: a tabela `sr-only` do heatmap (e a de `stats/charts.tsx`) é `position: absolute` sem ancestral posicionado e `<table>` ignora `height` e `overflow`, então estendia a rolagem da viewport. As tabelas agora ficam dentro de um `<div className="sr-only">` que recorta de verdade.
- Altura numa única camada: `--ds-viewport-h` (`100vh`, com `100dvh` onde houver suporte) em html, body e #root, com `overflow: hidden`, `overscroll-behavior: none` e o mesmo fundo do app. O AppShell é `relative overflow-hidden`, a sidebar vai até o fim da janela (os menus rolam por dentro em janelas baixas, com "Configurações" ancorada ao fundo) e só a área de conteúdo rola.
- Teste e2e `layout.spec.ts` (todas as rotas, de 1920×1080 a 1280×500 e equivalentes de zoom 67 % e 150 %), `pnpm visual:layout` e capturas antes e depois em `docs/design/screenshots/layout/`.

### Adicionado (Prompt 06 — visões do calendário)

- O calendário tem **Dia | Semana | Mês | Ano**. A visão e a data ficam na URL (`/calendario?visao=semana&data=2026-10-29`; valores inválidos caem em Mês + hoje) e o botão voltar do navegador as respeita. O botão "Hoje" saiu do segmentado e virou uma pílula ao lado das setas (`‹ ›  Hoje  título do período`); as setas andam por dia, semana, mês ou ano.
- **Grade de horas** (`TimeGrid`) para Dia e Semana: 06h–24h expandida quando há eventos fora dela, blocos posicionados por **porcentagem** do intervalo, duração visual mínima de 30 min, corte na meia-noite, linha de "agora" e rolagem inicial na hora atual (ou 07h). Eventos simultâneos ficam lado a lado (`layoutSobreposicoes`). Blocos mostram 3, 2 ou 1 linha conforme a altura, com tooltip. Clicar num espaço vazio abre o formulário já com data e horário (arredondado para 30 min).
- **Semana:** faixa "Hábitos" fixa com pílulas dos hábitos sem horário (marca hábito manual de hoje e dos dias passados; quantidade mostra valor/meta; automáticos são só leitura) e blocos tracejados para hábitos com horário. **Dia ("Hoje"):** grade larga e painel com "Hábitos do dia", "Próxima prova" e "Tarefas do dia". **Ano:** 12 mini-meses com densidade de eventos (0, 1, 2, 3+), marcador de prova, hoje com contorno e navegação por teclado; o dia abre a visão Dia e o nome do mês, a visão Mês.
- Atalhos `←` `→` (período), `T` (hoje) e `D` `S` `M` `A` (visão), desativados em campos de texto, com modal aberto e com o app travado; `aria-keyshortcuts` e dica no tooltip.
- Fixture `?fixture=views`, `pnpm visual:views`, tokens e a seção "Visões do calendário" no design system.

### Alterado (Prompt 06)

- A auditoria de contraste passou a cobrir o calendário; corrigidos o texto "valor/meta" das pílulas e o nível 2 da densidade do Ano.

### Adicionado (Prompt 05 — hábitos recorrentes)

- Página `/habitos` e item "Hábitos" na sidebar (contador de pendentes hoje; oculto em zero, como o de Tarefas): um cartão por hábito, com ícone e cor, resumo da repetição, sequência, melhor sequência, taxa de 90 dias, controle de hoje, menu (Editar, Duplicar, Arquivar, Excluir com "Desfazer") e o **heatmap de contribuições** (semanas em colunas, rótulos de mês e dia, legenda, hoje com contorno, teclado e `aria-label` por dia, tooltip, tabela oculta por mês, rolagem horizontal abaixo de 1100 px).
- Hábitos com repetição por dias da semana ou a cada N dias, horário opcional, tipo check ou quantidade, fontes automáticas (água, foco, blocos de estudo) e **regras versionadas**: editar repetição, meta ou horário vale a partir de hoje e o histórico não muda.
- Modal Novo/Editar hábito (validação em pt-BR), popover do dia (corrige dias passados de hábitos manuais, até 366 dias), 4 sugestões no estado vazio e seção "Arquivados".
- `lib/habits` (agendamento, valor, estado e nível do dia, sequências, taxa, matriz do heatmap e agregados) e `lib/habits/repeat.ts` (repetição reaproveitável), com testes; fixture `?fixture=habits`, `pnpm visual:habits` e seção "Heatmap de hábitos" no design system.
- Formato de dados **v3** (`daily:v3`, backup do v2 em `daily:v2:pre-v3`); importação de arquivos v1, v2 e v3.

### Alterado (Prompt 05)

- As **metas** viraram hábitos (migração automática, sem perda de registros). Estatísticas: "Metas do dia" → **Hábitos de hoje** (o lápis leva a `/habitos`), "Metas" nas Análises → **Consistência** (heatmap das últimas 52 semanas, sequência geral, melhor e taxas de 30 e 90 dias) e a pílula de sequência usa a sequência geral.
- `/foco`: a fração dos milésimos fica ao lado dos dígitos em posição absoluta (os dígitos ficam centralizados com as pílulas); o botão "Modo Foco" da topbar ganha estado ativo em `/foco`.

### Removido (Prompt 05)

- Cartão, modal e funções de Metas (`goalStates`, `computeStreaks`…), o mapa de calor antigo e o token `--ds-heat-min`; os schemas de metas ficam só em `legacy-goals.ts` para migrar e importar arquivos v2.

### Alterado (04.1)

- `/foco` redesenhado **sem o anel**: dígitos grandes e pesados (editáveis quando parado), fração de milésimos em cinza no baseline só enquanto roda (com movimento reduzido, os dígitos atualizam uma vez por segundo), botões em pílula por estado e, à esquerda, o painel **Dias de mais foco** (abaixo de 1100 px ele desce). Com a trava, só os dígitos e "Segurar para destravar" (agora com um anel de progresso em volta do cadeado).
- Concluído: "Concluído · 25 min", "Nova sessão" e "Ver estatísticas".
- Estatísticas: a seção **Análises** passa a ter 5 cartões (a Água ficou só em "Hoje"); "Metas" ocupa a última linha inteira.
- Contraste AA nos textos do painel do foco; o nível mais baixo do mapa de calor ficou mais visível (`--ds-heat-min`); o nome da matéria no cartão "Preparação" quebra em até 2 linhas e mostra o nome completo no `title`.

### Adicionado (04.1)

- `topFocusDays` e formatadores do painel e da fração em `lib/focus`, com testes; `pnpm visual:focus` para o novo layout (fixture `focus`) e `contrast-audit.mjs`.

### Removido (04.1)

- Anel do cronômetro (`TimerRing`), `fracaoRestante`, tokens `--ds-timer-*` e `--ds-color-timer-*`, e `waterAnalysis` (média, dias com meta batida e mini barras de 14 dias), usados só por esses itens. Os dados de água continuam registrados e exportados.

### Adicionado (Prompt 04 — fase B: Estatísticas)

- Página `/estatisticas` seguindo `docs/design/reference/stats-dashboard.png`: saudação com o nome, seção **Hoje** (horas de estudo da semana, preparação para a próxima prova, sequência, água com onda animada, metas do dia e agenda de hoje) e seção **Análises** (Semana | Mês | 90 dias) com seis cartões em SVG próprio.
- Ações de dados: água (adicionar copo com "Desfazer"), metas (marcar, criar, renomear, reordenar, arquivar) e preferências de nome, meta de água e copo.
- Funções puras de estatística em `lib/stats` (preparação, horas, foco, água, metas, sequência atual e melhor, variação entre períodos) com testes.
- Fixtures de desenvolvimento `?fixture=stats` e `?fixture=focus`; testes e2e de estatísticas; `pnpm visual:stats`.

### Alterado (03.1 — Modo Foco minimalista)

- `/foco` redesenhado: **só o anel com o tempo dentro**. O tempo é um campo editável por digitação (`25`, `25:30`, `1:30:00`, `90`; 1 min a 3 h; ↑/↓ ±1 min, Shift ±5), validado por uma função pura (`lib/focus/time-input.ts`), com avisos `aria-live`.
- Estados: ocioso (play + cadeado), rodando (pausar), pausado (retomar/reiniciar/encerrar; o tempo pisca), travado (**só** o anel e "Segurar para destravar") e concluído ("Concluído", duração e nova sessão).
- A última duração confirmada é o padrão e é guardada em **segundos** (`focusDurationSec`); o formato antigo em minutos (`focusDurationMin`) continua sendo lido, sem migração de versão.
- Anel mais fino (≈ 5 px) e maior (22 rem); novos tokens `--ds-color-timer-idle` e `--ds-timer-input-w`.

### Removido (03.1)

- Botões −5/+5, atalhos 15–90, alça e arrastar do anel, seletor "Estudando" e "Marcar bloco como concluído" (os campos de vínculo continuam no modelo), textos auxiliares, o campo "duração padrão" em Preferências e o botão "Voltar à tela cheia" da tela travada.

### Adicionado (Prompt 03 — fase A: Modo Foco)

- **Modo Foco** (`/foco`): cronômetro circular (1–180 min) com anel arrastável (`role="slider"`), teclado, botões ±5 e atalhos; tempo restante por timestamps; pausar/retomar/reiniciar/encerrar; vínculo opcional com matéria, prova ou bloco de hoje (com "Marcar bloco como concluído"); som de fim (Web Audio), título da aba e resumo.
- **Travar tela:** esconde a navegação, bloqueia rotas (`useBlocker`), pede tela cheia, mantém a tela ligada (Wake Lock), avisa antes de recarregar e destrava segurando 3 s. Esc nunca destrava; destravar não encerra a sessão.
- Sessão ativa persistida (sobrevive a recarregar) e histórico de sessões de foco.
- Dados `daily:v2`: preferências, metas (4 padrão), registros de meta e de água, sessões de foco; migração v1 → v2 com backup prévio; importação de arquivos v1 e v2.
- Sincronização entre abas pelo evento `storage` (última escrita vence).
- Preferências: nome, meta de água, copo, duração padrão do foco e "Travar por padrão".
- Especificação visual do dashboard de Estatísticas e do cronômetro, e novos tokens (cartão, glass, glow, água, gráficos, cronômetro) em `design-system.md` v0.4.

### Alterado

- O roteador passou a ser de dados (`createBrowserRouter`), exigido pelo bloqueador de navegação.
- A chave do `localStorage` passou de `daily:v1` para `daily:v2`.

### Adicionado (Prompt 02 — provas e persistência)

- Dados persistidos no navegador (`localStorage`, chave `daily:v1`) atrás de uma interface
  `Repository`, com validação zod, migração por versão, backup automático e recuperação de dado
  corrompido.
- Modelo de domínio em `packages/shared`: matérias com cor, eventos com status e notas, provas com
  conteúdos ordenados, tarefas e blocos de estudo (vínculo opcional a uma prova).
- Criar, editar, duplicar e excluir (com “Desfazer” por 6 s) provas, tarefas, blocos de estudo e
  matérias; menu “Criar” na sidebar; formulários em modal acessível.
- Conteúdos da prova: marcar, adicionar inline no popover e editar/reordenar no formulário.
- Páginas Provas (contagem regressiva, abas Próximas/Passadas), Tarefas (filtros e criação rápida),
  Matérias (paleta de cores e exclusão com destino dos eventos) e Blocos de estudo (semana).
- Calendário: clique em dia vazio cria evento; “+N mais” abre a lista do dia; chips de eventos
  concluídos/cancelados esmaecidos com título riscado.
- Contadores da sidebar reais (provas nos próximos 14 dias; tarefas pendentes/atrasadas).
- Preferências: exportar e importar JSON com validação e confirmação.
- Estado vazio com “Carregar dados de exemplo”.
- Testes: 51 novos unitários no `web`, 56 no total (repositório, migração, corrupção, contagem
  regressiva, regras de matéria, backup, formulários, filtros) e e2e do fluxo matéria → prova →
  persistência → desfazer.
- Dependências: `zustand` e `zod` no `apps/web`.

### Alterado

- Status de evento passam a ser `pendente`, `em-andamento`, `concluido`, `cancelado`.
- Tipo `StudyEvent` virou união discriminada (apenas provas têm `contents`).
- “+N mais” deixou de expandir a célula e passou a abrir um popover.

## Anteriores

- **01.1** — Ajuste fino de fidelidade visual, chips de 3 linhas, “Hoje” no segmentado, captura e
  comparação visual com Playwright, e2e de fumaça, contraste WCAG AA.
- **01** — Monorepo, design system por tokens, calendário mensal com dados mockados.
