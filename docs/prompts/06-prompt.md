# Prompt 06 — Visões Dia, Semana e Ano do calendário

## Contexto

Projeto Daily (monorepo pnpm, apps/web em React + TS + Vite + Tailwind). Leia CLAUDE.md, docs/design/design-system.md, docs/data-model.md e os relatórios em docs/prompts/ (principalmente 01, 01.1 e 05). Trabalhe DIRETO na main, sem PRs e sem trocar de branch.

Pré-checagem: rode `git status` e confirme que a árvore está limpa e sincronizada com origin/main. Se não estiver, pare e avise. Este arquivo já existe em docs/prompts/06-prompt.md; inclua-o no primeiro commit.

## Objetivo (tag v0.6.0)

Substituir os placeholders "Visualização semanal/anual em breve" por visões reais e criar a visão diária ("Hoje"). O calendário passa a ter: **Dia | Semana | Mês | Ano**.

## Passo 0 — Navegação e design

- Segmentado com Dia, Semana, Mês e Ano. O botão "Hoje" sai do segmentado e passa a ser uma pílula ao lado das setas de navegação: `‹ ›  Hoje  título do período`. "Hoje" volta ao período atual **na visão em que se está**. A visão Dia abre no dia atual; é a visão "Hoje".
- A visão e a data ficam na URL: `/calendario?visao=semana&data=2026-10-29`. Recarregar, voltar e compartilhar o link preservam o estado. Mês continua sendo o padrão.
- Os selects de mês e ano continuam e ficam sincronizados com a data. As setas navegam por dia, semana, mês ou ano conforme a visão. O filtro por matéria da topbar vale para todas as visões. O botão "+ Nova Prova" não muda.
- Atualize design-system.md com uma seção "Visões do calendário" e crie os tokens novos em tokens.css (altura da hora, largura da coluna de horas, largura do painel lateral do dia, cores e tamanhos da linha de agora, mini-meses do ano e níveis de densidade). Nenhum valor hardcoded. Posicione os blocos por **porcentagem do intervalo de horas**, não por pixels fixos.

## Base compartilhada (grade de horas)

- Componente `TimeGrid` usado por Dia e Semana: coluna de horas, linhas por hora, intervalo padrão 06h–23h que se **expande** se houver eventos fora dele, linha de "agora" no dia de hoje, rolagem automática para a hora atual (ou 07h em dias que não são hoje).
- Eventos como blocos posicionados por início e fim. Eventos que cruzam a meia-noite são cortados em cada dia. Duração mínima visual de 30 min.
- Função pura `layoutSobreposicoes(eventos)` que distribui eventos concorrentes em colunas lado a lado, sem sobreposição e sem perder nenhum. Cubra com testes (sem conflito, 2 e 3 simultâneos, encadeados, mesmo início, evento dentro de outro).
- Conteúdo do bloco por altura disponível: 3 linhas (tipo, título, horário) quando couber; 2 linhas (título e horário); 1 linha (título) com tooltip. Mesmo estilo de cor dos chips do mês (fundo tingido, borda esquerda).
- Clicar num espaço vazio abre o formulário de criação com data e horário pré-preenchidos (arredondados para 30 min). Clicar num bloco abre o mesmo popover de evento do mês. Sem arrastar nem redimensionar nesta etapa.

## Visão Semana

- 7 colunas (DOM–SÁB), cabeçalho com dia da semana e número, hoje destacado em amarelo (como no mês).
- **Faixa "Hábitos"** no topo, abaixo do cabeçalho: para cada dia, pílulas pequenas (ícone na cor do hábito + nome) dos hábitos agendados **sem horário**, com estado feito, parcial ou pendente. Hábito manual alterna ao clicar (só dia atual e passados); hábito de quantidade mostra "valor/meta"; fontes automáticas são somente leitura. Hábitos **com horário** aparecem na grade como blocos com borda tracejada na cor do hábito, usando o mesmo layout de sobreposição.
- Título do período: "27 out – 2 nov 2026" (ajusta quando cruza mês ou ano).
- Grade e cabeçalho rolam juntos na horizontal se a largura for menor que o mínimo de 1280 px; o cabeçalho e a faixa de hábitos ficam fixos ao rolar na vertical.

## Visão Dia ("Hoje")

- Grade de horas de uma coluna larga, com título "Hoje, quinta-feira, 29 de outubro" (ou a data por extenso, quando não é hoje).
- **Painel lateral** à direita (largura por token; abaixo de 1100 px vai para cima da grade): "Hábitos do dia" com os mesmos controles da página Hábitos, "Próxima prova" (contagem regressiva e barra de progresso dos conteúdos; atalho para abrir) e "Tarefas do dia" (entregas pendentes e atrasadas, com checkbox para concluir). Estados vazios amigáveis.
- Hábitos com horário aparecem também na grade (borda tracejada).

## Visão Ano

- 12 mini-meses (cabeçalho DOM–SÁB com inicial, dias do mês). Colunas responsivas: 4×3 a partir de 1600 px, 3×4 a partir de 1100 px, 2×6 abaixo.
- Cada dia é colorido por densidade de eventos (0, 1, 2, 3+) com tokens; dias com prova têm um marcador vermelho; hoje com contorno amarelo; dias de outros meses não aparecem.
- Clicar num dia abre a visão Dia daquela data; clicar no nome do mês abre a visão Mês. Tooltip e aria-label com a contagem ("3 eventos, 1 prova").
- Setas ‹ › navegam por ano; "Hoje" volta ao ano atual. Legenda de densidade ("Menos … Mais").
- Funções puras `grade12Meses(ano)` e `densidadePorDia(eventos, ano)` testadas (ano bissexto, mês que começa em cada dia da semana).

## Teclado (escopo do calendário)

`←` e `→` período anterior e seguinte, `T` hoje, `D` `S` `M` `A` trocam a visão. Ficam desativados com foco em campo de texto, com modal aberto e com o app travado pelo Modo Foco. Use `aria-keyshortcuts` e mostre a dica no tooltip dos botões.

## Verificação visual

- Fixture `?fixture=views` (só em dev): data fixa, uma semana densa com eventos simultâneos, uma prova, dias vazios, hábitos com e sem horário. Mantenha `?fixture=reference` funcionando.
- Capturas Playwright das 4 visões em 1920×1080, 1440×900 e 1280×720 (Dia, Semana, Mês e Ano, mais o popover aberto na Semana) em docs/design/screenshots/views/. Sem overflow horizontal da página, sem texto cortado nos blocos (reticências com tooltip), popovers dentro da tela. Contraste AA e foco visível.

## Testes

- Unitários: intervalo da semana (virada de mês e de ano), corte de eventos na meia-noite, expansão do intervalo de horas, posição em porcentagem, `layoutSobreposicoes`, `grade12Meses`, `densidadePorDia`, título do período em cada visão, leitura e escrita de visão e data na URL (inclusive valores inválidos, que caem em Mês + hoje).
- E2E (Playwright, page.clock): (1) trocar entre as 4 visões pelo segmentado e pela URL; (2) navegar a semana com `→` e voltar com "Hoje"; (3) clicar num horário vazio da Semana e criar um evento com data e hora corretas; (4) na Ano, clicar num dia e cair na visão Dia dessa data; (5) marcar um hábito pela faixa da Semana e ver o estado mudar; (6) a fixture com eventos simultâneos mostra todos sem sobreposição. Atualize os e2e que dependiam do botão "Hoje" dentro do segmentado.

## Fluxo na main

- Antes de CADA commit: `pnpm lint && pnpm typecheck && pnpm test`. Antes de cada push: também `pnpm build` e `pnpm e2e`.
- Um commit por etapa lógica, em Conventional Commits, cada um compilando sozinho (sugestão: grade de horas, Semana, Dia, Ano, navegação por URL e teclado, docs).
- Push ao final de cada etapa; se o CI falhar, corrija na hora com `fix:`.
- Nunca use `git push --force`, não reescreva o histórico e não troque de branch.
- No fim: CI verde confirmado no GitHub e tag v0.6.0 enviada.

## Regras

Tokens obrigatórios, componentes pequenos e tipados, lógica fora dos componentes, acessibilidade (foco visível, aria-labels, tudo operável por teclado), nenhuma dependência nova sem justificativa. Sem backend, autenticação, notificações do sistema nem PWA. Fora do escopo: arrastar e redimensionar eventos, eventos de vários dias e recorrência de eventos.

## Critérios de aceite

- [ ] Dia, Semana, Mês e Ano funcionam, com a visão e a data na URL
- [ ] Eventos simultâneos aparecem lado a lado, sem se sobrepor
- [ ] Hábitos aparecem na Semana e no Dia e podem ser marcados dali
- [ ] Ano mostra a densidade dos 12 meses e leva ao Dia e ao Mês
- [ ] Sem overflow horizontal em 1280×720, 1440×900 e 1920×1080
- [ ] lint, typecheck, test, build e e2e passam, inclusive no CI do GitHub (confirmado)

## Entrega

Escreva docs/prompts/06-report.md com: o que foi feito, decisões, valores visuais estimados, diferenças, resultado do CI no GitHub e pendências. Atualize design-system.md, README (status, funcionalidades, limitações) e CHANGELOG. Liste ao final os caminhos das capturas.
