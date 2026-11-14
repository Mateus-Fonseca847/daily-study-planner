# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). As versões estão marcadas como tags no Git.

## [Não lançado]

### Adicionado (paleta completa)

- **27 cores para hábitos e matérias**, em 9 grupos (vermelhos, laranjas e terrosos, amarelos, verdes, azul-esverdeados, azuis, roxos, rosas e neutros), com valores próprios no escuro e no claro e contraste AA em todos os usos. As 7 cores anteriores continuam iguais.
- **Seletor de cor único** (`ColorPicker`) em hábitos e matérias: anel e check na cor escolhida, nome em pt-BR, setas, Home/End, Enter e Espaço, alvos de 44 px no toque, sem rolagem horizontal no celular.

### Alterado

- A paleta passa a ter todos os matizes: a regra “sem vermelho, verde, amarelo e laranja” sai, porque status e tipos sempre têm ícone e texto. Distância mínima entre cores da paleta: ΔE2000 ≥ 8 nos dois temas.
- Cor desconhecida (de uma versão mais nova) abre sem erro, aparece como Cinza e é mantida ao salvar.
- A chama de sequência zerada usa `fg-muted` (o `fg-subtle` ficava abaixo de AA nos cartões), e em Hábitos de hoje a chama ganha uma pílula escura.

### Alterado (minimalismo das páginas)

- **Páginas sem subtítulo descritivo:** Hábitos, Tarefas, Provas, Matérias, Amigos e Preferências mostram só o título e as ações (a prop `description` saiu do `PageShell`). Estados vazios, diálogos, Entrar e Privacidade mantêm os textos.
- **Tarefas mais enxuta:** sem os quatro cartões de resumo (as contagens ficam nos cabeçalhos das seções e no distintivo do menu) e com o botão **“+ Nova tarefa”** no mesmo padrão de “Novo hábito”, que abre o painel de nova tarefa.
- **Preferências:** a seção “Perfil e Modo Foco” perdeu o parágrafo que repetia os rótulos dos campos.

### Removido

- **Entrada rápida em pt-BR** da página Tarefas (`Treinar toda segunda 19h`, “Entendi: …”), com `lib/tasks/quick-parse` e `lib/forms/quick-create`. Tarefas recorrentes continuam pelo painel (“Repetir”).

### Corrigido (acabamento 13.1)

- **Contraste AA no tema escuro:** o texto secundário (`--ds-color-fg-muted`) passa de `#8A8A93` para `#92929B` e o contador rosa (`--ds-color-badge`) de `#FF2D9B` para `#FF3DA3`; a linha tracejada da agenda de hoje deixa de passar por trás das horas. A auditoria completa (todas as telas e estados, desktop e celular) fica sem reprovações nos dois temas: menor razão 4,59:1 no escuro e 4,73:1 no claro. O claro não muda.
- **Concluir com um clique nos chips e blocos do calendário** (Dia, Semana, Mês, lista “+N mais”, agenda do Mês no celular e agenda de hoje no Perfil), sem botão dentro de botão: o chip tem duas áreas irmãs, a que abre o painel e a de concluir. Ocorrência de série conclui só a si mesma; Prova não ganha o controle; cancelada mostra o estado. Visível sempre nas listas, com mouse nos blocos grandes, ao passar o mouse ou focar nos chips do Mês, e no celular pelo painel e pela agenda quando não cabe. Toast com “Desfazer” e medalhas avaliadas como em qualquer conclusão.
- **“Marcar descanso” no hábito de água**, com a mesma regra dos outros hábitos.
- **Rótulos sem cortar:** “Concluídas na semana” e “Próximas provas” (Tarefas), Sequência, Melhor e Taxa (Hábitos) quebram linha em vez de truncar; em Hábitos de hoje (Perfil) a origem automática vai para baixo do nome.
- **Capturas do README** e `hero.webp` regeneradas com o app atual e dados fictícios.

### Testes

- e2e novos: concluir pelo chip (Dia, Semana com série, Mês por teclado e mouse, agenda de hoje, Prova sem o controle, Desfazer e medalha), descanso na água, rótulos nos três tamanhos e modais longos (Prova com 40 conteúdos, série com 40 subtarefas e hábito) em cinco tamanhos de tela.
- O e2e de excluir o perfil social espera o estado do Supabase simulado (falhava às vezes no CI).
- Linhas de base visuais do desktop e dos dois temas regeneradas (fora do Git).

### Adicionado (amizades, busca, bloquear e denunciar)

- **Amizade mútua com aceite:** enviar, cancelar (com “Desfazer”), aceitar e recusar pedidos; um pedido para quem já te pediu vira amizade na hora. Limites: 20 pedidos pendentes, 20 envios por dia e 200 amigos. Uma recusa nunca é avisada: quem enviou continua vendo “pendente” por até 7 dias e só pode pedir de novo depois de 30.
- **Buscar pessoas pela lupa da topbar** (e em Amigos, no celular): pelo @, a partir de 3 caracteres, até 10 resultados, só perfis que ligaram “Aparecer na busca”, sem foto até serem amigos, com a ação conforme a relação (Adicionar, Pendente, Aceitar, Amigos).
- **Página Amigos** (`/amigos`, no menu e no “Mais” do celular): abas Amigos, Solicitações (recebidas e enviadas) e Bloqueados; distintivo de pedidos recebidos na navegação (“N solicitações recebidas” para leitores de tela), atualizado ao abrir, ao voltar para a aba e a cada 60 s só com a aba visível.
- **Bloquear e denunciar:** bloquear é imediato e nos dois sentidos (some da busca e das listas, desfaz a amizade e os pedidos; a pessoa não é avisada); denunciar tem 5 motivos, detalhe opcional de até 500 caracteres e “Bloquear também” marcado; 5 denúncias por dia. As denúncias só o dono do projeto lê, pelo painel (`docs/moderation.md`).
- **Foto só para amigos:** o Storage passa a deixar amigos lerem a foto (sem bloqueio, perfis ativos e não suspensos), por links assinados de 120 s baixados sem cache e mostrados por `blob:`.
- **Proteção de menores:** amizade só entre pessoas da mesma faixa (14 a 17 ou 18+); 14 a 17 não aparecem na busca, então ainda não recebem pedidos (convite por link fica para depois). Respostas entre faixas, para bloqueio e para quem não existe são idênticas.
- **Moderação pelo dono:** suspensão de perfil (`suspended_at`/`suspended_reason`, só por SQL), com aviso e motivo para a pessoa suspensa; consultas prontas em `docs/moderation.md`.
- **Banco (só arquivos, aplicados pelo dono depois das do Prompt 15):** 4 migrações aditivas com reversão (`supabase/migrations/202611160000*`), escritas e leituras só por funções `social_*` com limite de taxa, e 159 testes pgTAP novos no job `db`.

### Alterado

- **Termo do perfil social e política de privacidade** descrevem amigos, busca, bloqueio e denúncia (versões `perfil-social-2026-11b` e `privacidade-2026-11b`; quem já aceitou não precisa aceitar de novo). O interruptor “Aparecer na busca (quando a busca existir)” virou “Aparecer na busca por @”.

### Adicionado (perfil social: fundação)

- **Perfil social visível só para a própria pessoa** (amigos chegam depois): @, nome de exibição, foto e interruptores de privacidade, em Preferências → Perfil social, com convite no Perfil.
- **Assistente “Ativar perfil social”:** data de nascimento (a partir de 14 anos; menor de 14 vê uma mensagem gentil e nada é enviado), termo de consentimento com aceite explícito e versionado (aviso simples e padrões travados no mais privado para 14 a 17 anos), @ com verificação em tempo real, nome, foto opcional e revisão.
- **Foto:** validada pelo conteúdo (JPEG, PNG ou WebP; GIF e SVG recusados), dimensões conferidas antes de decodificar, recorte quadrado com zoom (toque e teclado), 512 × 512 em WebP sem metadados, num espaço privado. Aparece no Perfil e no menu da conta.
- **Gerenciar:** editar nome, trocar o @ (1 vez a cada 30 dias; o antigo fica reservado por 90 dias), foto, privacidade, desativar (revoga o aceite) e excluir tudo com confirmação pelo @. Excluir a conta também apaga a foto.
- **Banco (só arquivos, aplicados pelo dono):** migrações aditivas em `supabase/migrations` com RLS só do dono, funções com limite de taxa e regras do @ e da idade impostas no servidor, reversões e 84 testes de segurança pgTAP rodando num Supabase local no CI (job `db`). Guia em `docs/social-setup.md`.
- **Privacidade:** nova seção na política (versão `privacidade-2026-11`); o backup inclui o perfil social e os aceites, fora dos dados de estudo. Nada do social entra no `daily:v6` nem na sincronização, e quem não abre a seção não faz nenhuma requisição nova. CSP sem mudança.

### Adicionado (medalhas e conquistas)

- **13 medalhas** que reconhecem constância e conclusão, nunca excesso: Primeiro passo, Rotina, Planejado, Mãos à obra, Dia limpo, Preparado, Ritmo, Passo a passo, Concentrado, Sessão completa, Constância, Hidratado e Variedade, com níveis bronze, prata e ouro (ou nível único). Cancelada e pulada não contam; dia de descanso não quebra sequência; medalha conquistada é permanente.
- **Perfil → Conquistas:** contador, filtro Todas | Conquistadas | Em andamento, grade por categoria com progresso para o próximo nível (“17 de 25 tarefas”) e a data; bloqueadas em silhueta. **Detalhe** com o critério, a data de cada nível e “Destacar no perfil” (até 3). **Vitrine** no topo do Perfil.
- **Aviso discreto e agrupado** (“Nova medalha: Constância — prata”), com “Ver”; espera o fim do Modo Foco. Quem já tinha histórico recebe as medalhas merecidas com **um único resumo**.
- **Dados:** formato v6 (`daily:v6`) com `achievements` e a marca da concessão retroativa; prova ganha `preparedAt`. Migração idempotente do v5 (cópia em `daily:v5:pre-v6`, removida 30 dias depois). Importar aceita v1 a v6. **Sincronização:** num conflito, as medalhas dos dois lados são unidas (nível mais alto, data mais antiga); app v5 não sobrescreve dado v6; sem mudança no Supabase.
- Tokens de nível (`--ds-tier-*`) nos dois temas, com AA.

### Adicionado (modo claro)

- **Tema claro** com fundo cinza muito claro, cartões brancos com borda fina e sombra sutil, tinta escura. Status, tipos, chama, paleta de matérias e hábitos, heatmap, densidade do Ano, água, anel e barras com valores próprios; o amarelo da marca continua nos botões e na navegação. Contraste AA medido em todas as telas e estados (menor razão 4,73:1).
- **Seletor de tema:** Preferências → Aparência (Sistema | Claro | Escuro) e atalho sol/lua na topbar e no sheet “Mais”. “Sistema” acompanha o aparelho em tempo real; a escolha vale por dispositivo (não sincroniza) e as outras abas acompanham.
- **Padrões:** quem já usava o Daily continua no escuro; instalação nova começa em Sistema.
- **Sem flash na abertura:** `theme-init.js` (externo, no `<head>`, sem relaxar a CSP) aplica o tema antes da primeira pintura; duas metas `theme-color` (barras do sistema) seguem o tema.
- **`pnpm check:tokens`** no CI: falha se aparecer cor literal fora de `tokens.css`.

### Alterado

- O escuro não mudou: 146 capturas (14 rotas × 10 tamanhos + estados abertos) idênticas à linha de base, exceto o sheet “Mais”, que ganhou a linha do tema. Por baixo, os componentes passaram a usar o papel certo de cada cor (tinta × preenchimento: `accent-ink`, `focus`, `on-status`, `on-habit`).

### Adicionado (tarefas recorrentes)

- **Repetir** em Tarefa e Especial (Prova nunca repete): atalhos de um toque (Não repete, Todo dia, Dias úteis, Toda semana, Todo mês, Todo ano) e **Personalizado** (a cada N dias/semanas/meses/anos, dias da semana, dia do mês ou último dia, término Nunca / Em data / Após N vezes), sempre com o resumo em texto (“Toda segunda e quarta, até 20/12”) e a prévia das próximas 5 datas. Também pelo menu “…” → “Repetir…”.
- **Cada ocorrência é independente:** concluir, cancelar e marcar subtarefas valem só para aquele dia, sem perguntar; as subtarefas recomeçam em cada ocorrência.
- **Editar ou excluir uma série** pergunta o escopo: Somente esta, Esta e as próximas ou Todas (com “Desfazer”). Numa ocorrência, as edições do painel esperam “Salvar…”.
- **Entrada rápida** na página Tarefas, em pt-BR: `Treinar toda segunda 19h`, `Aluguel todo dia 5`, `Ler todo dia até 20/12`, `amanhã às 9h30`… mostra “Entendi: …” antes de salvar; o que não entende fica no título.
- **Exibição:** ícone de repetição (com nome acessível) nos chips e blocos; o calendário expande as ocorrências só da janela visível; a visão Ano conta ocorrências na densidade. Na página Tarefas, “Próximas” mostra a próxima ocorrência de cada série com a regra e “+N nesta semana”; “Atrasadas” mostra ocorrências perdidas dos últimos 7 dias (as mais antigas não acumulam). Contadores e resumos contam ocorrências.
- **Dados:** formato v5 (`daily:v5`) com `recurrence` no compromisso e as **exceções por ocorrência** (`exceptions`, id `serie@aaaa-mm-dd`). Migração idempotente do v4 (cópia em `daily:v4:pre-v5`, removida 30 dias depois). Exportar gera v5; importar aceita v1 a v5. Sem mudança no esquema do Supabase; um app antigo nunca sobrescreve dados v5 e o rebase da sincronização vale para qualquer versão anterior.

### Corrigido

- Horário dos chips e blocos do calendário com contraste AA sobre o fundo de status (era 4,06:1).

### Alterado (tarefas, subtarefas, tipos e status; Perfil)

- **Tipos:** Tarefa (padrão), Prova e Especial. Revisão, Entrega e Bloco de estudo deixaram de existir (os dados migram para Tarefa).
- **Status:** Pendente, Concluído e Cancelado, com cores reservadas (amarelo, verde e vermelho), ícone e texto. “Em andamento” vira Pendente.
- **Subtarefas** em qualquer compromisso (os conteúdos das provas migram sem perder estado; numa prova a lista continua se chamando “Conteúdos”).
- **Painel de tarefa** único para criar, ver e editar: lateral no desktop, tela cheia no celular; criação simples (título, tipo, prazo, subtarefas e notas) com o resto em “Mais opções”; edição direta, status em 3 opções, progresso pelas subtarefas, reordenar por botões. Criar pela grade do calendário traz data e hora do clique, já em Tarefa; botão “+ Nova tarefa”; menu Criar com Tarefa, Prova, Especial, Hábito e Matéria.
- **Concluir com um clique** em todo chip e linha (Mês, Semana, Dia, agenda de hoje, Tarefas), com “Desfazer”; cancelar fica no menu “…”.
- **Página Tarefas** nova: cartões-resumo, Atrasadas, Hoje, Próximas (todas as futuras, sem limite de 7 dias, em Amanhã / Esta semana / Mais tarde) e Concluídas dos últimos 30 dias; “Ver no calendário”. O contador da sidebar soma as tarefas pendentes e atrasadas.
- **Filtro por tipo** (multisseleção, “Todos” e “Limpar”) no lugar do filtro por matéria, no calendário e em Tarefas, salvo entre sessões.
- **Cores:** paleta de matérias e hábitos sem vermelho, verde, amarelo e laranja (ciano, petróleo, gelo, lilás, fúcsia, rosa e cinza), verificada por ΔE2000 e contraste AA; as escolhas antigas são remapeadas.
- **Hábitos:** “Água” criado automaticamente no primeiro uso (uma vez; não volta se excluído; nunca numa conta que já tem dados); **dias de descanso** pelo popover do dia (este hábito ou todos, também os próximos 29 dias), que não quebram a sequência; **chama** com a sequência de cada hábito; formulário no mesmo padrão do painel de tarefa.
- **Estatísticas viram Perfil** (`/perfil`; `/estatisticas` redireciona): foto da conta Google ou iniciais e nome; cartões “Tempo de foco” (cronômetro + **registro manual** com data, duração e nota, também no Modo Foco), Preparação, Água, Hábitos de hoje e Agenda; estatísticas pessoais e Consistência.
- **Dados:** formato v4 (`daily:v4`) com migração idempotente a partir do v3 (cópia em `daily:v3:pre-v4`, removida 30 dias depois). Exportar gera v4; importar aceita v1 a v4.
- **Sincronização:** dados da nuvem em versão anterior são migrados ao baixar (a nuvem só é reescrita numa edição real); o ponto de sincronia é “rebaseado” depois da migração (sem conflito falso); “só o hábito de água” conta como dispositivo vazio; um app antigo nunca sobrescreve dados v4.
- CSP: `img-src` aceita `https://lh3.googleusercontent.com` (foto da conta).

### Removido

- Blocos de estudo (página, item do menu, criação, meta automática, fonte `blocos`); `/blocos` redireciona para o calendário.
- Seção “Análises” (gráficos, seletor de período) e o cartão “Sequência”.
- Filtro por matéria.

### Adicionado (água editável e hábitos reordenáveis)

- **Água editável:** tocar no valor do cartão "Água" (Estatísticas) ou do hábito "Água" abre um painel (popover no desktop, folha inferior no celular) com total, meta e progresso, a lista dos registros de hoje (editar e excluir, com "Desfazer"), quantidade personalizada (`300`, `300 ml`, `0,3 l`, `1,5L`), atalhos **+ copo** e **− último** e **Definir o total do dia** (aumentar acrescenta a diferença; diminuir pede confirmação e remove ou reduz os registros mais recentes). Limites: 1 a 5000 ml por registro e 20 L por dia. O novo total é anunciado a leitores de tela.
- **Dias anteriores:** o popover do heatmap do hábito "Água" abre o mesmo painel para adicionar, editar ou excluir registros de até 366 dias atrás (nunca do futuro); o horário padrão de um registro retroativo é 12:00. Sem mudança no esquema de dados.
- **Hábitos reordenáveis:** em `/habitos` cada cartão ganha uma alça de arrastar (`Reordenar {nome}`), que funciona com mouse, toque e teclado (espaço pega, setas movem, espaço solta, Esc cancela) com anúncios em pt-BR, e os itens "Mover para cima" e "Mover para baixo" no menu "...". A ordem vale em todas as listas (Estatísticas, Semana, Dia) e persiste; hábitos arquivados ficam fora e mantêm seus lugares.
- Nova dependência: `@dnd-kit/core` e `@dnd-kit/sortable` (ordenação com acessibilidade pronta, sem estilos injetados nem `eval`, compatível com a CSP).

### Adicionado (responsividade: celular e tablet)

- **Layout responsivo** em quatro faixas (celular < 768 px e paisagem de celular, tablet 768–1023, notebook 1024–1279 e desktop ≥ 1280, que ficou idêntico). Breakpoints num só lugar (`lib/responsive/breakpoints.ts`, espelhado no tema do Tailwind com teste), variantes `phone:`, `short:` e `coarse:`, hooks `useMediaQuery`, `useBreakpoint`, `usePhone` e `usePointerCoarse`.
- **Navegação:** barra inferior no celular (Calendário, Hábitos, Foco, Estatísticas e **Mais**), botão **+** flutuante com o menu Criar, topbar compacta com o filtro por matéria em sheet; trilho de ícones com menu sobreposto no tablet; o notebook lembra a escolha de recolher a sidebar. Tudo some junto com o Modo Foco travado.
- **Sheets e telas cheias:** `BottomSheet` (foco preso, Esc, arrastar a alça, botão voltar do aparelho, área segura e teclado virtual); popovers viram sheets, menus viram action sheets e formulários ocupam a tela inteira no celular.
- **Calendário no celular e no tablet:** segmentado em largura total e seletor de mês e ano em sheet; **Mês compacto** com pontos por tipo e agenda do dia; Semana com rolagem horizontal, snap e início em hoje; Dia com resumo recolhível; Ano em 3 colunas no tablet (no celular a visão Ano some e o Mês é o padrão), Semana compacta com hábitos em ícones; **deslizar** muda o dia e o mês; **toque longo** cria evento na grade (o toque simples só rola).
- Hábitos (cabeçalho em duas linhas, heatmap rolável com células de 24 px e sheet do dia com ‹ ›), Estatísticas (4/3/2/1 colunas, ordem de leitura, seletor de período fixo, eixos com menos marcas), Modo Foco (dígitos fluidos, painel recolhível, destravar com o dedo, aviso de tela cheia/tela ligada indisponíveis), listas, filtros em chips roláveis, Preferências, conta, entrada, privacidade e conflito de sincronização (só layout) com texto ≥ 16 px.
- Alvos de toque de 44 px (24 px nos densos, com equivalente maior), campos de 16 px, `viewport-fit=cover`, `interactive-widget=resizes-content`, variáveis de área segura e da `visualViewport`, `prefers-reduced-motion` global e metas `apple-mobile-web-app-*`.
- Projeto Playwright **"responsive"** (rota × tamanho: documento sem rolagem, nada fora da janela, alvos, fontes, CSP; fluxos de toque, login no celular, área segura e teclado) e `scripts/desktop-regression.mjs`; `contrast-audit.mjs --phone`.

### Adicionado

- **Conta opcional com Google e sincronização na nuvem (Supabase):** tela `/entrar` (primeira visita) com "Entrar com Google" ou "Continuar sem conta" (modo visitante, sem mudar nada do uso atual), menu da conta na topbar, seção "Conta e sincronização" em Preferências (sincronizar agora, sair, excluir conta) e página pública `/privacidade`.
- Camada local-first em `lib/sync`: decisão pura de reconciliação, concorrência otimista por `revision`, diálogo de conflito (nuvem × dispositivo) com cópia de segurança, reenvio ao voltar a conexão. Ao sair da conta os dados do dispositivo são removidos.
- Banco: tabela `user_data` com RLS e RPC `delete_my_account()`.

### Alterado

- CSP: `connect-src` passa a aceitar o domínio do Supabase. Sem `VITE_SUPABASE_*` o app segue 100% local.

## [1.0.1] — 2026-10-30

Só o conteúdo do repositório mudou; o app publicado é o mesmo da 1.0.0.

### Removido (v1.0.1)

- Do repositório: os prompts e relatórios de processo, o material de divulgação e as capturas de tela e de comparação (ficam só no disco do autor, fora do Git), e as imagens de referência de terceiros. O histórico do Git continua guardando tudo.
- Os scripts de captura (`visual:capture`, `visual:app`, `visual:focus`, `visual:stats`, `visual:habits`, `visual:views`, `visual:layout` e `media:capture`), que só serviam a esse material.

### Adicionado (v1.0.1)

- `docs/images/`: as nove imagens usadas no README, em WebP (1600 px), no lugar de ~29 MB de capturas.
- `pnpm check:links`: verifica os links relativos dos arquivos `.md` versionados (o destino precisa estar no Git).

### Alterado (v1.0.1)

- README, CLAUDE.md, design system, modelo de dados e arquitetura sem links para arquivos removidos; a seção sobre desenvolvimento assistido por IA descreve o processo sem apontar para os prompts.
- A auditoria de contraste (`contrast-audit.mjs`) grava em `apps/web/.reports/` (ignorada pelo Git).
- Rótulos "Prompt NN" do CHANGELOG viraram as versões correspondentes.

## [1.0.0] — 2026-10-30

Primeira versão publicada: [dailystudyplanner.vercel.app](https://dailystudyplanner.vercel.app). Reúne tudo o que está abaixo (v0.4.0 a v0.7.0) mais o material de divulgação.

### Adicionado (v1.0.0, deploy, divulgação e acabamento)

- **Deploy na Vercel** com `apps/web/vercel.json` (rewrite SPA, cache imutável em `/assets`, revalidação do service worker e do `index.html`, cabeçalhos de segurança e CSP sem `unsafe-inline` nem `unsafe-eval`) e o guia `docs/deploy.md`. O zod roda sem JIT para não exigir `unsafe-eval`.
- `pnpm verify:prod`: verifica o app publicado (rotas, rota direta recarregada, manifest, service worker, offline, imagem Open Graph e console sem erros).
- README final (imagem de topo, badges, demo, telas, instalação como app, dados e privacidade), `docs/architecture.md` (diagrama Mermaid e decisões), `CONTRIBUTING.md`, modelos de issue, material de divulgação (post do LinkedIn, currículo e checklist de publicação), milestones e issues no GitHub.

### Alterado (v1.0.0)

- A URL pública entra nas metas Open Graph e Twitter (`SITE_URL`).

### Adicionado (v0.7.0, PWA e persistência)

- **App instalável e offline** (`vite-plugin-pwa`, Workbox): manifest com ícones (incluindo maskable), atalhos (Modo Foco, Hábitos, Estatísticas) e `start_url` `/calendario`; pré-cache de todo o app shell, links diretos a qualquer rota funcionam sem rede. O service worker só existe no build e no preview, nunca no `pnpm dev`.
- Atualização por oferta ("Nova versão disponível · Atualizar", também em Preferências), sem recarregar sozinho e **nunca durante uma sessão de foco** (rodando, pausada ou travada).
- Botão "Instalar app" (sidebar e Preferências), instruções para navegadores sem `beforeinstallprompt`, armazenamento persistente (pedido na primeira criação de dados e ao instalar; situação e espaço usado em Preferências) e indicador "Offline" na topbar.
- Ícones gerados de um SVG versionado (`pnpm icons`), favicons, metadados Open Graph e Twitter, `robots.txt`.
- Projeto Playwright "pwa" (build + preview) no CI: manifest, service worker, offline, fixtures sem efeito e console sem erros.

### Alterado (v0.7.0)

- As fixtures de desenvolvimento (`?fixture=`) deixam de ir para o bundle de produção.
- O nome acessível dos botões "criar evento" começa pela data visível (`1 de outubro: criar evento`).

### Corrigido (v0.5.1, AppShell na altura da janela)

- Em `/habitos` o **documento** rolava (1460 px numa janela de 1080) e aparecia uma faixa do fundo do body embaixo, como se o conteúdo fosse cortado. Causa: a tabela `sr-only` do heatmap (e a de `stats/charts.tsx`) é `position: absolute` sem ancestral posicionado e `<table>` ignora `height` e `overflow`, então estendia a rolagem da viewport. As tabelas agora ficam dentro de um `<div className="sr-only">` que recorta de verdade.
- Altura numa única camada: `--ds-viewport-h` (`100vh`, com `100dvh` onde houver suporte) em html, body e #root, com `overflow: hidden`, `overscroll-behavior: none` e o mesmo fundo do app. O AppShell é `relative overflow-hidden`, a sidebar vai até o fim da janela (os menus rolam por dentro em janelas baixas, com "Configurações" ancorada ao fundo) e só a área de conteúdo rola.
- Teste e2e `layout.spec.ts` (todas as rotas, de 1920×1080 a 1280×500 e equivalentes de zoom 67 % e 150 %) e capturas antes e depois.

### Adicionado (v0.6.0 — visões do calendário)

- O calendário tem **Dia | Semana | Mês | Ano**. A visão e a data ficam na URL (`/calendario?visao=semana&data=2026-10-29`; valores inválidos caem em Mês + hoje) e o botão voltar do navegador as respeita. O botão "Hoje" saiu do segmentado e virou uma pílula ao lado das setas (`‹ ›  Hoje  título do período`); as setas andam por dia, semana, mês ou ano.
- **Grade de horas** (`TimeGrid`) para Dia e Semana: 06h–24h expandida quando há eventos fora dela, blocos posicionados por **porcentagem** do intervalo, duração visual mínima de 30 min, corte na meia-noite, linha de "agora" e rolagem inicial na hora atual (ou 07h). Eventos simultâneos ficam lado a lado (`layoutSobreposicoes`). Blocos mostram 3, 2 ou 1 linha conforme a altura, com tooltip. Clicar num espaço vazio abre o formulário já com data e horário (arredondado para 30 min).
- **Semana:** faixa "Hábitos" fixa com pílulas dos hábitos sem horário (marca hábito manual de hoje e dos dias passados; quantidade mostra valor/meta; automáticos são só leitura) e blocos tracejados para hábitos com horário. **Dia ("Hoje"):** grade larga e painel com "Hábitos do dia", "Próxima prova" e "Tarefas do dia". **Ano:** 12 mini-meses com densidade de eventos (0, 1, 2, 3+), marcador de prova, hoje com contorno e navegação por teclado; o dia abre a visão Dia e o nome do mês, a visão Mês.
- Atalhos `←` `→` (período), `T` (hoje) e `D` `S` `M` `A` (visão), desativados em campos de texto, com modal aberto e com o app travado; `aria-keyshortcuts` e dica no tooltip.
- Fixture `?fixture=views`, tokens e a seção "Visões do calendário" no design system.

### Alterado (v0.6.0)

- A auditoria de contraste passou a cobrir o calendário; corrigidos o texto "valor/meta" das pílulas e o nível 2 da densidade do Ano.

### Adicionado (v0.5.0 — hábitos recorrentes)

- Página `/habitos` e item "Hábitos" na sidebar (contador de pendentes hoje; oculto em zero, como o de Tarefas): um cartão por hábito, com ícone e cor, resumo da repetição, sequência, melhor sequência, taxa de 90 dias, controle de hoje, menu (Editar, Duplicar, Arquivar, Excluir com "Desfazer") e o **heatmap de contribuições** (semanas em colunas, rótulos de mês e dia, legenda, hoje com contorno, teclado e `aria-label` por dia, tooltip, tabela oculta por mês, rolagem horizontal abaixo de 1100 px).
- Hábitos com repetição por dias da semana ou a cada N dias, horário opcional, tipo check ou quantidade, fontes automáticas (água, foco, blocos de estudo) e **regras versionadas**: editar repetição, meta ou horário vale a partir de hoje e o histórico não muda.
- Modal Novo/Editar hábito (validação em pt-BR), popover do dia (corrige dias passados de hábitos manuais, até 366 dias), 4 sugestões no estado vazio e seção "Arquivados".
- `lib/habits` (agendamento, valor, estado e nível do dia, sequências, taxa, matriz do heatmap e agregados) e `lib/habits/repeat.ts` (repetição reaproveitável), com testes; fixture `?fixture=habits` e seção "Heatmap de hábitos" no design system.
- Formato de dados **v3** (`daily:v3`, backup do v2 em `daily:v2:pre-v3`); importação de arquivos v1, v2 e v3.

### Alterado (v0.5.0)

- As **metas** viraram hábitos (migração automática, sem perda de registros). Estatísticas: "Metas do dia" → **Hábitos de hoje** (o lápis leva a `/habitos`), "Metas" nas Análises → **Consistência** (heatmap das últimas 52 semanas, sequência geral, melhor e taxas de 30 e 90 dias) e a pílula de sequência usa a sequência geral.
- `/foco`: a fração dos milésimos fica ao lado dos dígitos em posição absoluta (os dígitos ficam centralizados com as pílulas); o botão "Modo Foco" da topbar ganha estado ativo em `/foco`.

### Removido (v0.5.0)

- Cartão, modal e funções de Metas (`goalStates`, `computeStreaks`…), o mapa de calor antigo e o token `--ds-heat-min`; os schemas de metas ficam só em `legacy-goals.ts` para migrar e importar arquivos v2.

### Alterado (v0.4.1)

- `/foco` redesenhado **sem o anel**: dígitos grandes e pesados (editáveis quando parado), fração de milésimos em cinza no baseline só enquanto roda (com movimento reduzido, os dígitos atualizam uma vez por segundo), botões em pílula por estado e, à esquerda, o painel **Dias de mais foco** (abaixo de 1100 px ele desce). Com a trava, só os dígitos e "Segurar para destravar" (agora com um anel de progresso em volta do cadeado).
- Concluído: "Concluído · 25 min", "Nova sessão" e "Ver estatísticas".
- Estatísticas: a seção **Análises** passa a ter 5 cartões (a Água ficou só em "Hoje"); "Metas" ocupa a última linha inteira.
- Contraste AA nos textos do painel do foco; o nível mais baixo do mapa de calor ficou mais visível (`--ds-heat-min`); o nome da matéria no cartão "Preparação" quebra em até 2 linhas e mostra o nome completo no `title`.

### Adicionado (v0.4.1)

- `topFocusDays` e formatadores do painel e da fração em `lib/focus`, com testes; `contrast-audit.mjs`.

### Removido (v0.4.1)

- Anel do cronômetro (`TimerRing`), `fracaoRestante`, tokens `--ds-timer-*` e `--ds-color-timer-*`, e `waterAnalysis` (média, dias com meta batida e mini barras de 14 dias), usados só por esses itens. Os dados de água continuam registrados e exportados.

### Adicionado (v0.4.0 — fase B: Estatísticas)

- Página `/estatisticas` inspirada num mockup de terceiros: saudação com o nome, seção **Hoje** (horas de estudo da semana, preparação para a próxima prova, sequência, água com onda animada, metas do dia e agenda de hoje) e seção **Análises** (Semana | Mês | 90 dias) com seis cartões em SVG próprio.
- Ações de dados: água (adicionar copo com "Desfazer"), metas (marcar, criar, renomear, reordenar, arquivar) e preferências de nome, meta de água e copo.
- Funções puras de estatística em `lib/stats` (preparação, horas, foco, água, metas, sequência atual e melhor, variação entre períodos) com testes.
- Fixtures de desenvolvimento `?fixture=stats` e `?fixture=focus`; testes e2e de estatísticas.

### Alterado (03.1 — Modo Foco minimalista)

- `/foco` redesenhado: **só o anel com o tempo dentro**. O tempo é um campo editável por digitação (`25`, `25:30`, `1:30:00`, `90`; 1 min a 3 h; ↑/↓ ±1 min, Shift ±5), validado por uma função pura (`lib/focus/time-input.ts`), com avisos `aria-live`.
- Estados: ocioso (play + cadeado), rodando (pausar), pausado (retomar/reiniciar/encerrar; o tempo pisca), travado (**só** o anel e "Segurar para destravar") e concluído ("Concluído", duração e nova sessão).
- A última duração confirmada é o padrão e é guardada em **segundos** (`focusDurationSec`); o formato antigo em minutos (`focusDurationMin`) continua sendo lido, sem migração de versão.
- Anel mais fino (≈ 5 px) e maior (22 rem); novos tokens `--ds-color-timer-idle` e `--ds-timer-input-w`.

### Removido (03.1)

- Botões −5/+5, atalhos 15–90, alça e arrastar do anel, seletor "Estudando" e "Marcar bloco como concluído" (os campos de vínculo continuam no modelo), textos auxiliares, o campo "duração padrão" em Preferências e o botão "Voltar à tela cheia" da tela travada.

### Adicionado (v0.3.0 — fase A: Modo Foco)

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

### Adicionado (v0.2.0 — provas e persistência)

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
