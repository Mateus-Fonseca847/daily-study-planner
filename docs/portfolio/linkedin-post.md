# Post para o LinkedIn

Os números abaixo foram medidos no repositório em 30/10/2026 (comandos no fim do arquivo). Tudo marcado com `[PREENCHER]` só o autor sabe. Confira os números de novo antes de publicar (`git rev-list --count HEAD`, `pnpm test`, `pnpm e2e`).

Imagens e vídeos prontos em `docs/media/`: imagens de post em `social/*-post-1080x1350.png` e `social/*-post-1200x627.png`; vídeos em `videos/` (o LinkedIn aceita melhor MP4: veja o comando de conversão em `docs/prompts/07-report.md`).

## Versão curta (~600 caracteres)

```text
Estudo com uma segunda tela aberta o dia todo e nunca achei um painel de estudos que fosse feito para isso. Então construí o Daily.

Calendário (dia, semana, mês e ano), provas com contagem regressiva, tarefas, hábitos com heatmap, Modo Foco travável e estatísticas. Funciona offline como PWA e guarda tudo no navegador, sem conta.

React + TypeScript estrito, design system por tokens, 272 testes unitários, 48 e2e com Playwright e CI no GitHub Actions.

Demo: https://dailystudyplanner.vercel.app
Código: https://github.com/Mateus-Fonseca847/daily-study-planner

#react #typescript #pwa #frontend #opensource
```

## Versão longa (~1.500 caracteres)

```text
Eu estudo com uma segunda tela aberta o dia inteiro e [PREENCHER: o que te incomodava nos apps de estudo que você usava]. Nenhum painel era pensado para ficar ali, à vista, sem atrapalhar. Então construí o Daily.

O que ele faz
• Calendário em quatro visões (dia, semana, mês e ano), com eventos simultâneos lado a lado
• Provas com contagem regressiva e checklist de conteúdos
• Hábitos recorrentes com heatmap de contribuições
• Modo Foco com cronômetro grande e trava ("segurar para destravar")
• Estatísticas de horas, preparação, água e hábitos
• PWA: instala como app, abre em janela própria e funciona offline

O que me interessou tecnicamente
• Design system por tokens: nenhum valor visual fora de tokens.css
• Lógica de domínio em funções puras, testadas, com relógio injetável
• Regras de hábito versionadas: editar a meta nunca reescreve o passado
• Acessibilidade: foco visível, teclado, contraste medido por script
• 272 testes unitários, 48 e2e (Playwright, inclusive contra o build com service worker e CSP restritiva) e CI no GitHub Actions
• Desenvolvimento assistido por IA com 12 prompts versionados no repositório, cada um com relatório do que foi feito

Aprendi que [PREENCHER: um aprendizado seu, por exemplo sobre PWA, CSP ou testes].

Os dados ficam só no navegador (sem conta, sem backend por enquanto). Próximos passos: sincronização e notificações.

Demo: https://dailystudyplanner.vercel.app
Código: https://github.com/Mateus-Fonseca847/daily-study-planner

#react #typescript #pwa #frontend #tailwindcss #vite #acessibilidade #portfolio
```

## Hashtags sugeridas

`#react` `#typescript` `#pwa` `#frontend` `#tailwindcss` `#vite` `#acessibilidade` `#opensource` `#portfolio` `#devbr`

## De onde vêm os números

| Número                         | Origem                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| 272 testes unitários           | `pnpm test`: 261 em `apps/web` + 11 em `packages/shared`                                        |
| 48 testes e2e                  | `pnpm e2e` (projetos "app" e "pwa")                                                             |
| 12 prompts versionados         | arquivos `docs/prompts/*-prompt.md` (01, 01.1, 02, 02.1, 03, 03.1, 04, 04.1, 05, 05.1, 06 e 07) |
| Lighthouse 98 / 96 / 100 / 100 | desempenho, acessibilidade, boas práticas e SEO, em `docs/prompts/07-report.md`                 |
