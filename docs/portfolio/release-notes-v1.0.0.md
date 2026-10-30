# Daily v1.0.0

Primeira versão publicada: **https://dailystudyplanner.vercel.app**

Organizador de estudos feito para ficar aberto na segunda tela. Funciona offline, instala como app e guarda tudo no navegador (sem conta).

## Destaques

- **Calendário em quatro visões** (Dia, Semana, Mês e Ano), com grade de horas, eventos simultâneos lado a lado e atalhos de teclado
- **Provas** com contagem regressiva e checklist de conteúdos; tarefas, matérias e blocos de estudo
- **Hábitos** recorrentes com heatmap de contribuições, sequências e taxa
- **Modo Foco** com cronômetro grande e trava ("segurar para destravar")
- **Estatísticas** de horas, preparação, água, hábitos e dias de mais foco
- **PWA**: instalável, offline em todas as rotas, atualização que nunca interrompe uma sessão de foco
- Dados locais versionados, com exportação e importação em JSON

## Qualidade

- 272 testes unitários e 48 testes e2e (Playwright, inclusive contra o build com service worker e CSP restritiva), CI no GitHub Actions
- Lighthouse local: desempenho 98, acessibilidade 96, boas práticas 100, SEO 100

Detalhes versão a versão no [CHANGELOG](https://github.com/Mateus-Fonseca847/daily-study-planner/blob/main/CHANGELOG.md).
