<div align="center">

# Daily

**Organizador de estudos para estudantes, feito para ficar aberto na segunda tela.**

Provas com contagem regressiva, conteúdos como mini tarefas, blocos de estudo e um calendário claro, escuro e sempre à vista.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-F5E94B?style=flat-square&labelColor=0B0B0C)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)
![pnpm](https://img.shields.io/badge/pnpm-monorepo-F69220?style=flat-square&logo=pnpm&logoColor=white)

![Daily — calendário mensal](docs/design/screenshots/calendar.png)

[Demo online](#) · [Documentação](docs/) · [Roadmap](#roadmap) · [Changelog](CHANGELOG.md)

</div>

---

## Sobre o projeto

O **Daily** nasceu de uma necessidade pessoal: ter um painel que fique aberto o dia inteiro na segunda tela, lembrando constantemente das obrigações acadêmicas. Em vez de mais um to-do genérico, ele é pensado para a rotina de quem estuda:

- **Provas** com contagem regressiva e progresso calculado a partir dos conteúdos já estudados
- **Conteúdos como mini tarefas**: cada prova é dividida em matérias/assuntos que podem ser marcados como concluídos
- **Blocos de estudo** com horário marcado
- **Modo Foco**, uma visão em tela cheia para a segunda tela, com o que importa agora
- **Gratuito e hospedável**, sem dependência de serviços pagos

O projeto também é um estudo de engenharia de software: monorepo, TypeScript estrito, design system baseado em tokens, testes e documentação versionada, incluindo o histórico dos prompts usados no desenvolvimento assistido por IA.

## Status

O projeto está em desenvolvimento, organizado em marcos.

| Marco                  | Escopo                                                                     | Status       |
| ---------------------- | -------------------------------------------------------------------------- | ------------ |
| **0. Fundação visual** | Monorepo, design system, calendário mensal com dados mockados              | Concluído    |
| **1. Base**            | Dados locais, CRUD, páginas (feito); login, back-end e deploy              | Em andamento |
| **2. Estudos**         | Provas com contagem regressiva, conteúdos, blocos de estudo                | Em andamento |
| **3. Segunda tela**    | Modo Foco e Estatísticas (feitos); notificações, lembretes, PWA instalável | Em andamento |
| **4. Acabamento**      | Documentação final, GIFs, post no LinkedIn                                 | Planejado    |

## Funcionalidades

### Já disponíveis

- [x] Calendário mensal com navegação por mês e ano e botão "Hoje"
- [x] Dia atual destacado e dias de outros meses esmaecidos
- [x] Chips de evento por tipo (prova, estudo, entrega, revisão, especial) com "+N mais" em dias cheios
- [x] Popover de evento com data, horário, matéria, tipo e status
- [x] Checklist de conteúdos da prova com barra de progresso
- [x] Filtro do calendário por matéria
- [x] Sidebar recolhível e interface em pt-BR
- [x] Design system documentado, com tokens centralizados em CSS
- [x] **Dados salvos no navegador** (`localStorage` versionado, com validação, migração e backup)
- [x] **Criar, editar, duplicar e excluir** provas, tarefas, blocos de estudo e matérias, com "Desfazer" por 6 s
- [x] Conteúdos da prova como mini tarefas (adicionar, renomear, remover, reordenar, marcar) com progresso
- [x] Páginas **Provas** (contagem regressiva), **Tarefas** (filtros e criação rápida), **Matérias** (cores) e **Blocos de estudo** (semana)
- [x] Estados do evento: pendente, em andamento, concluído e cancelado
- [x] Clique num dia vazio cria evento; "+N mais" abre a lista completa do dia
- [x] Exportar e importar dados em JSON (validado, com confirmação; aceita arquivos v1 e v2)
- [x] **Modo Foco** (`/foco`): anel minimalista com tempo editável por digitação (1 min a 3 h), histórico de sessões e **travamento do app** (veja abaixo)
- [x] Preferências do perfil: nome, meta de água, copo, duração padrão do foco e "travar por padrão"
- [x] Várias abas/janelas ficam sincronizadas (evento `storage`)
- [x] **Estatísticas** (`/estatisticas`): painel “Hoje” (horas da semana, preparação para a próxima prova, sequência, água, metas do dia e agenda) e “Análises” (semana, mês ou 90 dias) com cinco gráficos em SVG próprio

### Em planejamento

- [ ] Autenticação (e-mail/senha ou Google)
- [ ] Sincronização com back-end
- [ ] Visões Semana e Ano
- [ ] Notificações e lembretes periódicos
- [ ] PWA instalável (manifest e service worker)
- [ ] Atalhos de teclado

## Stack

| Camada            | Tecnologia                                                       |
| ----------------- | ---------------------------------------------------------------- |
| Front-end         | React, TypeScript, Vite, Tailwind CSS, React Router              |
| Ícones e fonte    | lucide-react, Inter (`@fontsource`)                              |
| Datas             | date-fns (locale `pt-BR`)                                        |
| Tipos e validação | Zod, compartilhados em `packages/shared`                         |
| Testes            | Vitest (unidade) e Playwright (e2e de fumaça e capturas visuais) |
| Qualidade         | ESLint, Prettier, TypeScript `strict`                            |
| Gerenciador       | pnpm workspaces                                                  |
| CI                | GitHub Actions                                                   |

**Planejado para o Marco 1:** Node.js com Fastify, PostgreSQL com Prisma, deploy com Vercel (front), Render ou Railway (API) e Neon ou Supabase (banco).

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Git

### Instalação

```bash
git clone https://github.com/<seu-usuario>/daily-study-planner.git
cd daily-study-planner
pnpm install
pnpm dev
```

O app sobe em **http://localhost:5173**. Viewport recomendado: 1440×900, com comportamento aceitável a partir de 1280px.

### Scripts

| Comando               | O que faz                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`            | Servidor de desenvolvimento                                                                                                    |
| `pnpm build`          | Build de produção                                                                                                              |
| `pnpm lint`           | ESLint em todo o monorepo                                                                                                      |
| `pnpm typecheck`      | Checagem de tipos                                                                                                              |
| `pnpm test`           | Testes com Vitest                                                                                                              |
| `pnpm e2e`            | Teste e2e de fumaça com Playwright (na primeira vez: `pnpm --filter @daily/web exec playwright install chromium`)              |
| `pnpm visual:capture` | Screenshots (1440×900 em 1x e 2x, 1280×720, 1280×800) e comparações lado a lado com a referência em `docs/design/screenshots/` |

## Estrutura do repositório

```
daily-study-planner/
├── .github/
│   └── workflows/ci.yml        # lint, typecheck, testes e build
├── apps/
│   ├── web/                    # React + TS + Vite
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/         # Button, Badge, SegmentedControl, Popover...
│   │       │   └── layout/     # Sidebar, Topbar, AppShell
│   │       ├── features/
│   │       │   └── calendar/   # grid mensal, chips, popover de evento
│   │       ├── mocks/          # dados gerados em relação à data atual
│   │       └── styles/         # tokens.css e estilos globais
│   └── api/                    # back-end (Marco 1)
├── packages/
│   └── shared/                 # tipos e schemas Zod
├── docs/
│   ├── design/
│   │   ├── reference/          # imagem de referência visual
│   │   └── design-system.md    # tokens, tipografia e componentes
│   └── prompts/                # prompts e relatórios de cada etapa
├── CLAUDE.md                   # contexto do projeto para o Claude Code
├── CHANGELOG.md
└── README.md
```

## Design system

Toda decisão visual vive em `apps/web/src/styles/tokens.css` (cores, raios, bordas, sombras, espaçamentos, tipografia e dimensões de layout), mapeada no tema do Tailwind. **Nenhum valor visual é escrito direto nos componentes.** Isso permite ajustar o visual inteiro em um só lugar.

Resumo da identidade:

- **Tema escuro**, com fundo quase preto e superfícies em camadas
- **Destaque amarelo** com texto preto sobre ele
- **Cores por tipo de evento**: prova (vermelho), estudo (azul), entrega (laranja), revisão (verde) e especial (magenta)
- **Chips** com fundo tingido e borda lateral na cor do tipo
- **Tipografia**: Inter

A especificação completa, incluindo quais valores são estimados, está em [`docs/design/design-system.md`](docs/design/design-system.md).

## Desenvolvimento assistido por IA

Este projeto é construído em ciclos com o [Claude Code](https://www.anthropic.com/claude-code):

1. Um prompt detalhado é escrito para cada etapa
2. O Claude Code implementa e entrega um relatório
3. Eu testo, comparo com a referência e aprovo ou peço ajustes

Cada ciclo fica registrado em [`docs/prompts/`](docs/prompts/) (`NN-prompt.md` e `NN-report.md`). O arquivo [`CLAUDE.md`](CLAUDE.md) mantém as convenções do projeto entre as sessões.

## Decisões técnicas

| Decisão                      | Motivo                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Monorepo com pnpm            | Compartilhar tipos e schemas entre front e API                                                                               |
| TypeScript 5.9 fixado        | O `typescript-eslint` ainda não suporta o TS 7                                                                               |
| Mocks relativos à data atual | O calendário nunca aparece vazio, em qualquer mês                                                                            |
| Tokens CSS obrigatórios      | Fidelidade visual e manutenção em um único lugar                                                                             |
| PWA em vez de app nativo     | Um código só para "app de PC" e versão online                                                                                |
| `Repository` + Zustand       | A UI não conhece o `localStorage`; trocar por uma API é trocar o adaptador (veja [`docs/data-model.md`](docs/data-model.md)) |

Decisões maiores serão registradas em `docs/adr/`.

## Modo Foco e travamento

O **Modo Foco** (`/foco`) mostra só **dígitos grandes**. **Digite a duração** no próprio relógio (`25` = 25 min, `25:30`, `1:30:00`, `90` = 1 h 30; mínimo 1 min, máximo 3 h; ↑/↓ ajustam 1 min, Shift 5 min) e use as pílulas **Travar** e **Iniciar**. A última duração confirmada vira o padrão (guardada em segundos). Rodando, uma fração de milésimos aparece em cinza ao lado dos dígitos (some com movimento reduzido, que também atualiza o relógio só uma vez por segundo); pausado, os dígitos piscam de leve e aparecem **Reiniciar**, **Encerrar** e **Retomar**; ao fim há um som curto (Web Audio, só na aba que iniciou), o título da aba vira "Sessão concluída" e a tela mostra "Concluído · 25 min", **Nova sessão** e **Ver estatísticas**. O tempo restante é sempre calculado por **timestamps** (fim − agora): fica exato com a aba em segundo plano e a sessão **sobrevive a recarregamentos**. Sessões com mais de 1 minuto entram no histórico (usado nas Estatísticas).

À esquerda fica o painel **Dias de mais foco**: os 7 dias com mais tempo focado em todo o histórico (concluídas e interrompidas; a sessão conta no dia local em que **começou**; empate: o mais recente primeiro). Ele atualiza quando uma sessão termina e some enquanto a tela está travada.

A pílula **Travar** (visível só com o cronômetro parado) liga a trava para a próxima sessão; ela guarda a última escolha. Com a **trava** ligada e o cronômetro rodando ou pausado:

- só ficam na tela os dígitos e **"Segurar para destravar"** (sem pausar, reiniciar, encerrar nem a tecla Espaço);
- somem a barra lateral, o topo, o painel e os links; a navegação interna é bloqueada e qualquer rota digitada volta para `/foco`;
- o app pede **tela cheia** (se você sair com Esc, continua travado; **Esc nunca destrava**), mantém a tela ligada (**Wake Lock**, quando houver suporte) e mostra o aviso do navegador ao recarregar ou fechar a aba;
- para destravar, **segure o botão por 3 segundos** (mouse, toque ou Enter/Espaço); um anel em volta do cadeado enche. Destravar **não encerra** a sessão.

**O que ela NÃO pode fazer.** É um travamento _do aplicativo_, para evitar distração acidental, **não uma medida de segurança**. Navegadores não permitem bloquear Alt+Tab, Ctrl+W, fechar a janela, trocar de aba/janela nem o sistema operacional; quem quiser sair sempre consegue. O Wake Lock e a tela cheia também dependem do navegador (e a tela cheia não pode ser reaberta depois de um Esc: a tela fica travada, mas em janela normal).

**Ideia futura:** instalar o Daily como PWA e abri-lo em **janela própria** (modo standalone/kiosk), o que reduz as distrações da barra de abas e dá mais controle sobre a tela cheia.

## Dados e privacidade

- Seus dados (matérias, provas, tarefas, blocos de estudo e conteúdos) ficam **somente no seu navegador**, no `localStorage` deste site. Nada é enviado a servidores, não há conta nem rastreamento.
- Por isso, **limpar os dados do site, trocar de navegador ou de computador faz os dados "sumirem"**. Para guardar uma cópia, use **Preferências → Exportar dados (JSON)**; para restaurar ou levar a outro lugar, **Importar dados (JSON)**.
- O Daily mantém automaticamente uma cópia do último estado válido e, se o dado salvo ficar corrompido, avisa e oferece restaurá-la (detalhes em [`docs/data-model.md`](docs/data-model.md)).
- Em navegação anônima/privada os dados podem não persistir; o app avisa quando não consegue salvar.

## Limitações conhecidas

- **Testado apenas no Chromium** (Playwright e uso manual); Firefox e Safari não foram verificados, e os campos nativos de data e hora variam entre navegadores
- Os dados vivem **só neste navegador** (sem conta nem sincronização): limpar os dados do site apaga tudo. Use Preferências → Exportar para guardar uma cópia
- Com várias abas abertas, **a última escrita vence** (o evento `storage` recarrega a aba que não gravou; não há mesclagem de edições simultâneas)
- O `Repository` é síncrono (adequado ao `localStorage`); uma API exigirá torná-lo assíncrono
- Busca e notificações ainda são apenas visuais
- Visões Semana e Ano são placeholders; Atalhos, FAQ e Convidar amigos são páginas placeholder
- Estatísticas: a água e as metas são registradas só neste navegador; a sequência olha no máximo 365 dias para trás; as análises usam os blocos de estudo e as sessões de foco registradas (sem dados, mostram “Ainda não há dados neste período”)
- Matérias sem cor própria no calendário: os chips usam a cor do **tipo** de evento, e a cor da matéria aparece nas listas
- Os chips têm ~44 px em vez dos ~56 px da referência: ela equivale a 1440×1080, e em 900 px de altura só assim cabem 2 chips completos mais o "+N mais" (detalhes em [`design-system.md`](docs/design/design-system.md))
- Em janelas baixas (por exemplo 1280×720) ou meses com 6 semanas, o grid rola verticalmente em vez de encolher as linhas
- Ainda não há manifest nem service worker (PWA)
- A comparação com a referência é lado a lado, a olho (sem diff de pixels automatizado)
- A fixture `?fixture=reference` só existe em desenvolvimento (`pnpm dev`) e usa dados em memória, sem tocar nos seus dados

## Roadmap

- [x] **Marco 0:** monorepo, design system e calendário mensal
- [ ] **Marco 1:** autenticação, API, banco de dados e deploy (CRUD local já feito)
- [x] **Marco 2 (parte local):** provas com contagem regressiva, conteúdos e blocos de estudo
- [ ] **Marco 3:** Modo Foco, notificações e PWA instalável
- [ ] **Marco 4:** acabamento, documentação final e divulgação

O acompanhamento detalhado fica nas [issues](../../issues) e [milestones](../../milestones) do repositório.

## Contribuindo

Este é um projeto pessoal de portfólio, mas sugestões são bem-vindas via issues. Se for abrir um pull request:

1. Faça um fork e crie uma branch (`feat/minha-ideia`)
2. Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `chore:`)
3. Garanta que `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm e2e` passam
4. Não escreva valores visuais fora de `tokens.css`

## Licença

Distribuído sob a licença MIT. Veja o arquivo `LICENSE`.

## Autor

Feito por **<seu nome>**.

[LinkedIn](https://www.linkedin.com/in/<seu-perfil>) · [GitHub](https://github.com/<seu-usuario>)
