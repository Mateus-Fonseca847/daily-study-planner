# Contexto

Estou construindo o **Daily**, um organizador de estudos (PWA) para estudantes, pensado para ficar aberto o dia todo numa segunda tela do PC. É um projeto de portfólio: TypeScript estrito, código limpo, documentação e testes bem escolhidos.

# Objetivo deste prompt

Criar o monorepo e reproduzir FIELMENTE o design da imagem `docs/design/reference/calendar.png`, adaptado ao domínio de estudos. Nesta etapa NÃO existe backend: use dados mockados.

# Passo 0 — Análise antes de codar

Abra e analise a imagem de referência. Antes de escrever código, crie `docs/design/design-system.md` com uma primeira versão contendo: paleta, tipografia (família, tamanhos, pesos, caixa alta, espaçamento entre letras), espaçamentos, raios, bordas, sombras e dimensões dos elementos (sidebar, topbar, barra de controles, células do calendário, chips, popover). Marque cada valor como "estimado" e use-o como fonte de verdade para os tokens.

# Passos

1. Monorepo pnpm com: apps/web, apps/api (só README por enquanto), packages/shared, docs/, .github/workflows/ci.yml. Configure ESLint, Prettier, TypeScript strict e Vitest.
2. Em apps/web: React + TypeScript + Vite + Tailwind CSS, React Router, lucide-react (ícones de traço fino), fonte Inter via @fontsource.
3. `src/styles/tokens.css`: TODOS os valores visuais como variáveis CSS (cores, raios, bordas, sombras, espaçamentos, tamanhos de fonte, pesos, alturas de linha, larguras da sidebar). Mapeie os tokens no tema do Tailwind. Nenhum valor visual hardcoded nos componentes.
4. Valores de partida (ajuste olhando a imagem):
   - fundo ~#0B0B0C; superfície ~#141416; superfície elevada ~#1C1C1F
   - borda: branco a 8% de opacidade, 1px
   - destaque amarelo ~#F5E94B, com texto preto sobre ele
   - badge rosa ~#FF2D9B
   - texto principal branco; secundário cinza ~#8A8A93
   - cores de evento: prova vermelho, estudo azul, entrega laranja, revisão verde, especial magenta
   - chips: fundo da cor a ~15% de opacidade, borda esquerda de 2px na cor cheia
5. Componentes em `components/ui`: Button (variantes primary amarelo, secondary contorno, white pill, icon), Badge (contador rosa e "NEW" amarelo), SegmentedControl, Select, EventChip, Popover, Avatar, ProgressBar, Checkbox.
6. Layout em `components/layout`:
   - Sidebar: recolhível, logo textual "Daily" simples, botão "Criar" branco em pílula, grupos "Menus" e "Configurações", item ativo em amarelo com barra lateral amarela
   - Topbar: seletor de matéria/curso, busca, notificações, botão "Modo Foco"
   - AppShell
7. Itens da Sidebar (pt-BR):
   - Menus: Calendário (ativo), Provas (contador de próximas), Tarefas (contador de pendentes), Matérias, Blocos de estudo, Modo Foco (badge NEW), Estatísticas
   - Configurações: Convidar amigos, FAQ, Atalhos, Preferências
   - Apenas o Calendário precisa funcionar; as demais rotas mostram uma página placeholder
8. Feature `calendar`:
   - grid mensal com cabeçalho DOM–SÁB
   - números dos dias em cinza; dias de outros meses esmaecidos
   - destaque no dia atual
   - chips de evento por dia e link "+N mais" quando houver overflow
   - navegação por mês e ano nos selects, botão "Hoje" e botão amarelo "+ Nova Prova" (só visual)
   - segmentado Semana/Mês/Ano: só Mês funcional, os outros são placeholder
9. Popover de evento ao clicar num chip: botões de lixeira, menu e fechar; título; data por extenso; horário; campos Matéria / Tipo / Status. Para provas, mostre também a checklist de conteúdos (mini tarefas) com checkbox e ProgressBar, funcionando em estado local. O Popover fecha com Esc e clique fora, e é posicionado perto do chip sem sair da tela.
10. Mocks em `src/mocks`, com tipos e schemas zod em `packages/shared`. Tipos de evento: prova, estudo, entrega, revisão, especial. Gere as datas RELATIVAS ao mês atual (date-fns), para o calendário sempre parecer populado. Inclua dias com 3+ eventos para exercitar o "+N mais" e provas com 3 a 6 conteúdos.
11. Idioma pt-BR. Datas com date-fns (locale ptBR). Viewport-alvo: desktop 1440×900, com comportamento aceitável a partir de 1280px.
12. Crie `CLAUDE.md` na raiz com: descrição do projeto, stack, convenções (Conventional Commits, tokens obrigatórios, componentes pequenos), comandos úteis e a regra de gerar relatório em `docs/prompts/NN-report.md` a cada prompt.
13. Testes (poucos e úteis): geração do grid do mês (inclusive meses que começam em dias diferentes) e cálculo de progresso da prova.

# Regras

- Fidelidade visual é a prioridade: tipografia, espaçamento, alinhamento e proporções devem bater com a referência.
- Componentes pequenos, tipados e sem lógica visual duplicada.
- Acessibilidade básica: foco visível, aria-labels nos botões de ícone, navegação por teclado no popover.
- Commits em Conventional Commits, um por etapa lógica.
- Não use a marca "beatgig" nem copie assets. Use apenas o sistema visual.

# Verificação visual

Ao terminar, rode o app, tire um screenshot em 1440×900 (se tiver acesso ao navegador ou Playwright) e compare com a referência. Liste as diferenças que ainda restam.

# Critérios de aceite

- [ ] `pnpm install && pnpm dev` sobe o app sem erros
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam
- [ ] Calendário mensal navegável, com dia atual destacado
- [ ] Popover abre e fecha corretamente; a checklist atualiza a barra de progresso
- [ ] Nenhuma cor ou medida hardcoded fora de tokens.css
- [ ] design-system.md documenta todos os tokens

# Entrega

Escreva `docs/prompts/01-report.md` com: o que foi feito, decisões tomadas, valores visuais estimados, diferenças restantes em relação à referência, como rodar, resultado de lint/typecheck/test/build e pendências. Salve também este prompt em `docs/prompts/01-prompt.md`.
