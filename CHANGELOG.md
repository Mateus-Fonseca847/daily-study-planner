# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). O projeto ainda não
tem versões publicadas.

## [Não lançado]

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
