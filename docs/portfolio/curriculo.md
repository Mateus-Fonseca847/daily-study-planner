# Currículo e portfólio

Números medidos no repositório em 30/10/2026 (veja a origem em `linkedin-post.md`). Ajuste o que `[PREENCHER]` indicar.

## Linha para o portfólio

**Daily** — organizador de estudos instalável (PWA) com calendário em quatro visões, hábitos com heatmap, Modo Foco e estatísticas. React, TypeScript e Tailwind; funciona offline. [Demo](https://dailystudyplanner.vercel.app) · [Código](https://github.com/Mateus-Fonseca847/daily-study-planner)

## Bullets em português

- Desenvolvi o **Daily**, organizador de estudos em React 19 e TypeScript estrito, publicado na Vercel como **PWA** instalável que funciona offline (service worker com pré-cache e atualização sob controle do usuário).
- Construí um **design system por tokens** (Tailwind v4) em que nenhum valor visual existe fora de um único arquivo, e um calendário em 4 visões com layout próprio de eventos simultâneos (função pura testada).
- Modelei a lógica de domínio em **funções puras com relógio injetável** (hábitos com regras versionadas, sequências, taxas, máquina de estados do cronômetro), com **272 testes unitários**.
- Montei a esteira de qualidade: **48 testes e2e** com Playwright (inclusive contra o build com service worker e CSP restritiva sem `unsafe-inline`/`unsafe-eval`), lint, tipos e **CI no GitHub Actions** a cada push.
- Otimizei e auditei: Lighthouse **98 / 96 / 100 / 100** (desempenho, acessibilidade, boas práticas e SEO), contraste medido por script e navegação por teclado.
- Conduzi o desenvolvimento **assistido por IA** com 12 prompts versionados e relatórios por entrega, 12 versões marcadas (v0.1.0 a v1.0.0) e dados 100 % locais, com backup e migração de formato. [PREENCHER: seu papel e o que decidiu sozinho]

## Bullets in English

- Built **Daily**, a study organizer in React 19 and strict TypeScript, deployed on Vercel as an installable, offline-capable **PWA** (precached service worker, user-controlled updates that never interrupt a focus session).
- Designed a **token-based design system** (Tailwind v4) with no visual value outside a single file, and a 4-view calendar with its own overlap layout algorithm (a tested pure function).
- Modeled the domain as **pure functions with an injectable clock** (versioned habit rules, streaks, rates, a timestamp-based timer state machine), backed by **272 unit tests**.
- Set up the quality pipeline: **48 Playwright e2e tests** (including runs against the production build with a service worker and a strict CSP with no `unsafe-inline`/`unsafe-eval`), linting, type-checking and **GitHub Actions CI** on every push.
- Audited and tuned the app: Lighthouse **98 / 96 / 100 / 100** (performance, accessibility, best practices, SEO), script-measured color contrast and full keyboard navigation.
- Drove **AI-assisted development** with 12 versioned prompts and a report per delivery, 12 tagged releases (v0.1.0 to v1.0.0) and 100% local data with backup and schema migrations. [FILL IN: your role and the decisions you made yourself]
