> **Esclarecimento anterior (do autor):**
>
> Houve um mal-entendido: a imagem `docs/design/reference/stats-dashboard.png` será a **página de Estatísticas**. Podemos tornar a página scrollável e adicionar as suas ideias abaixo também.
>
> O **Modo Foco** deve ser apenas um cronômetro redondo, com tempo ajustável, que permita ao usuário **travar (lockar) a tela do aplicativo** enquanto o cronômetro funciona.

> **Nota de registro:** o prompt abaixo foi recebido **cortado no item B1** ("Sequência…"); os itens B2 em diante não chegaram. Nele, a imagem aparece como `stats-dashboard.png`; o arquivo original se chamava `focus-dashboard.png.png` e foi renomeado para `stats-dashboard.png` no 03.1.

---

# Contexto

Projeto Daily (monorepo pnpm, apps/web em React + TS + Vite + Tailwind). Leia CLAUDE.md, docs/design/design-system.md, docs/prompts/02-report.md e docs/prompts/02.1-report.md. Trabalhe DIRETO na main, sem branches nem PRs.

# Objetivo (03)

1. Modo Foco (/foco): um cronômetro circular com tempo ajustável e travamento do app enquanto roda.
2. Estatísticas (/estatisticas): página com rolagem que segue o visual de docs/design/reference/stats-dashboard.png. Topo: seção "Hoje" (dashboard da referência adaptado). Abaixo: seção "Análises". Inclui o começo do controle da vida pessoal (água e metas diárias).

- Fase A: dados + Modo Foco (tag v0.3.0)
- Fase B: Estatísticas (tag v0.4.0)

# Passo 0 — Análise antes de codar

Abra a referência e acrescente ao docs/design/design-system.md a seção "Dashboard (Estatísticas)": raios dos cartões, superfícies com brilho (gradientes sutis), brilho de destaque no cartão de metas, proporções do grid, tipografia de títulos e números grandes, espaçamentos, anel, barras, onda da água e cartões flutuantes da agenda. Marque tudo como "estimado". Ignore a moldura do aparelho e o fundo texturizado. Defina também a especificação visual do cronômetro (anel, espessura, tipografia dos dígitos, estados), no mesmo sistema visual.
Regras de adaptação:

- Mantenha o amarelo do Daily como destaque (não use o verde-limão). Água usa roxo/índigo, novo token.
- Não copie marca, logos, avatares nem textos da referência.
- Novos tokens em tokens.css (raio de cartão grande, superfície "glass", glow do destaque, cores da água, trilha dos gráficos, cores do cronômetro). Nenhum valor hardcoded.
- Não altere o visual das páginas existentes.

# FASE A — Dados e Modo Foco

## A1. Modelo de dados (packages/shared, zod)

- Preferências: nome, metaÁguaMl (padrão 2000), copoMl (padrão 250), duraçãoFocoMin (padrão 25), travarPorPadrão (padrão false).
- Meta: id, título, ícone (conjunto pequeno de ícones lucide), tipo (`manual` | `auto-agua` | `auto-estudo`), ordem, criadaEm, arquivadaEm (opcional).
- RegistroMeta: metaId, data (yyyy-MM-dd local), concluída.
- RegistroÁgua: id, data (yyyy-MM-dd local), ml, horário.
- SessãoFoco (histórico): id, início, duraçãoPlanejadaSeg, duraçãoRealSeg, status (`concluída` | `interrompida`), matériaId?, provaId?, blocoId?.
- SessãoFocoAtiva (no máximo uma): status (`ocioso` | `rodando` | `pausado`), duraçãoSeg, fimEm (timestamp, quando rodando), restanteMs (quando pausado), travada (boolean), vínculo opcional (matériaId/provaId/blocoId), idDaAba que iniciou.
- Metas iniciais no primeiro acesso, editáveis: "Dormir 7h" (manual), "Beber 2 L de água" (auto-agua), "Exercício" (manual), "Cumprir blocos de estudo de hoje" (auto-estudo).
- Datas sempre no fuso local. Use um relógio injetável (`now()`), para testar virada de dia e o cronômetro.

## A2. Persistência

- Suba a versão para `daily:v2` com migração v1 → v2: preserva tudo, cria preferências e metas padrão e faz backup antes de migrar.
- Exportar/Importar JSON aceita arquivos v1 e v2 (valide com zod). A sessão ativa NÃO entra na exportação; o histórico de sessões entra.
- Estenda a interface Repository para as novas entidades; o acesso ao storage continua só dentro do adaptador.
- Sincronização entre abas/janelas: ouça o evento `storage` e recarregue o store, para uma janela refletir edições feitas na outra (última escrita vence; registre a limitação).

## A3. Lógica do cronômetro (pura, em lib/focus, 100% testável)

- O tempo restante é SEMPRE calculado por timestamps (fimEm − now()), nunca por contagem de ticks de setInterval. A UI atualiza a cada 250 ms apenas para exibir.
- Máquina de estados: ocioso → rodando ⇄ pausado → concluído/interrompido. Funções: iniciar, pausar, retomar, reiniciar, encerrar, finalizar.
- Restauração após recarregar: se estava rodando e fimEm já passou, finalize como `concluída` com a duração planejada; se ainda não passou, continue de onde estava; se pausado, mantenha o restante.
- Ao encerrar manualmente: salve a sessão como `interrompida` se passou de 1 minuto; abaixo disso, descarte.
- Ajuste de tempo (só no estado ocioso): 1 a 180 minutos, passo de 1 min por tecla, ±5 min por botão.
- Hold-to-unlock: função pura que recebe início do pressionamento e now() e informa o progresso (0–1) e se completou os 3 s (constante nomeada).

## A4. Página Modo Foco (rota /foco)

- Layout limpo: no centro, um anel SVG grande com os dígitos mm:ss (ou h:mm:ss) no meio, em fonte com números tabulares (sem tremor ao mudar). O progresso do anel diminui conforme o tempo passa. Respeite prefers-reduced-motion.
- Ajuste do tempo no estado ocioso: arrastar o anel (ponteiro, mouse e toque), setas do teclado (o anel é role="slider" com aria-valuemin/max/now e aria-valuetext em pt-BR), botões −5 / +5 min e atalhos 15, 25, 45, 60, 90. A duração padrão vem das Preferências.
- Controles: Iniciar, Pausar/Retomar, Reiniciar (volta ao tempo escolhido), Encerrar (com confirmação quando a sessão passou de 1 minuto).
- Vínculo opcional "Estudando": select com matérias, provas futuras e blocos de estudo de hoje. Ao concluir uma sessão vinculada a um bloco, ofereça "Marcar bloco como concluído".
- Alternador "Travar tela". Quando travada E em execução (rodando ou pausado):
  - AppShell em modo travado: sidebar, topbar e links de navegação ocultos; navegação interna bloqueada (bloqueador do React Router; rotas digitadas na URL voltam para /foco).
  - Solicite tela cheia (Fullscreen API) no clique que trava. Se o usuário sair da tela cheia com Esc, o app CONTINUA travado e mostra um botão discreto "Voltar à tela cheia". Esc nunca destrava o app.
  - Screen Wake Lock ativo enquanto a sessão roda, readquirido em visibilitychange, com aviso se o navegador não suportar.
  - Recarregar ou fechar a aba mostra o aviso padrão do navegador (beforeunload).
  - Atalhos de teclado do app desativados, exceto os do próprio cronômetro (Espaço pausa/retoma).
  - Para destravar: botão "Segurar para destravar" (anel de progresso preenchendo em 3 s; funciona com mouse, toque e teclado segurando Enter/Espaço). Destravar NÃO encerra a sessão: o app volta ao normal e o cronômetro continua.
- Estado travado e a sessão ativa persistem: ao recarregar, a página restaura cronômetro e trava.
- Fim da sessão: som curto gerado com Web Audio (sem arquivo de áudio), título da aba muda para "Sessão concluída" até o usuário interagir, destravamento automático e tela de resumo ("Você focou 25 min", vínculo, botões "Nova sessão" e "Ver estatísticas"). O som toca só na aba que iniciou a sessão (idDaAba), para evitar alerta duplicado entre abas.
- Durante a sessão, o título da aba mostra o tempo restante (ex.: "12:34 · Daily").
- O botão "Modo Foco" da topbar e o item da sidebar levam a /foco. Em Preferências, adicione: nome, meta de água, tamanho do copo, duração padrão do foco e "Travar por padrão".

## A5. Documentação do lock

No README, seção "Modo Foco e travamento": explique o que o lock faz e o que NÃO pode fazer (navegadores não permitem bloquear Alt+Tab, Ctrl+W, fechar a janela ou o sistema operacional; é um travamento do app para evitar distração acidental, não de segurança). Mencione, como ideia futura, rodar como PWA em janela própria.

# FASE B — Estatísticas (rota /estatisticas)

Substitua o placeholder. A página rola na vertical; o conteúdo tem largura máxima confortável em telas grandes. Cabeçalho da página: saudação "Olá, {nome}" com o nome em amarelo (sem nome: "Olá").

## B1. Funções derivadas (puras, testáveis, em lib/)

- Próxima prova: a primeira prova futura, não cancelada.
- Preparação: % de conteúdos concluídos da próxima prova (sem conteúdos: 0% e dica "Adicione conteúdos"; sem prova: estado vazio).
- Horas da semana: por dia (seg–dom), planejado vs concluído, contando blocos de estudo e revisão.
- Tempo focado: soma das sessões de foco por dia, por semana e por matéria.
- Água do dia: soma de ml; % da meta.
- Metas do dia: auto-agua = meta de água atingida; auto-estudo = todos os blocos de hoje concluídos (oculta se não houver blocos hoje); % de metas concluídas.
- Sequência: dias seguidos, até hoje (ou ontem, se hoje ainda não fechou), com todas as metas ativas cumpridas. Para dias passados, use só as metas que existiam naquele dia
