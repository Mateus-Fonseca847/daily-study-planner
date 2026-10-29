# Relatório 04 — Estatísticas (fase B, v0.4.0)

## O que foi feito

- **Página `/estatisticas`** no lugar do placeholder (`apps/web/src/features/stats`): saudação, seção **Hoje** (Horas de estudo, Preparação, Sequência, Água, Metas do dia, Agenda de hoje) e seção **Análises** com seletor Semana | Mês | 90 dias e seis cartões.
- **Gráficos em SVG próprio** (`charts.tsx`): barras (planejado × feito, com linha de meta para água), barras horizontais por matéria e mapa de calor de 12 semanas. Nenhuma biblioteca nova. Cada gráfico tem alternativa textual (tabela `sr-only` ou `role="img"`) e o estado vazio "Ainda não há dados neste período".
- **Dados:** ações de água (adicionar copo, desfazer), de metas (marcar, criar, renomear, reordenar, arquivar) e de preferências (nome, meta de água, copo) no store; funções puras em `lib/stats` (`derive.ts`, `analysis.ts`, `agenda.ts`, `format.ts`).
- **Fixtures de desenvolvimento** `?fixture=stats` (10/11/2026 10:30, em memória) e `?fixture=focus` (sessão travada rodando).
- **Agenda:** linha do tempo 06h–23h rolada até o horário atual, cartões escalonados quando se sobrepõem, linha de "agora"; o relógio atualiza a cada 30 s e vira o dia à meia-noite.
- **Docs:** design-system v0.6 (§9.1), data-model (derivados), README, CHANGELOG, CLAUDE.md (`pnpm visual:stats`).

## Decisões

- Períodos: semana = 7 dias, mês = 30, 90 dias = 90 (em barras semanais); variação contra o período anterior de mesmo tamanho.
- Sequência: dias seguidos com **todas** as metas que existiam naquele dia cumpridas (`criadaEm`/`arquivadaEm`); hoje só quebra a sequência depois de encerrado; busca limitada a 365 dias.
- Metas automáticas (água, blocos de estudo) são calculadas e não clicáveis; mostram a origem.
- Sem dados novos no formato salvo: nenhuma migração nem aumento de `DATA_VERSION` (o modelo v2 já tinha metas, água e sessões).
- O gráfico "por matéria" usa a cor da matéria; dias sem meta ou sem dado ficam na trilha neutra.

## Valores estimados

Todos os valores visuais novos estão em `tokens.css` e documentados em `design-system.md` §9 e §9.1 (raios, paddings, alturas dos gráficos, onda da água, gradientes). São estimativas a partir da imagem de referência (1187×896).

## Diferenças restantes em relação à referência

- O rótulo da matéria no cartão "Preparação" é truncado em colunas estreitas (aparece "Matem…" em 1920×1080); o texto completo está no `title`.
- Sem avatares nos cartões da agenda e sem o fundo texturizado/moldura de dispositivo (decisão de design).
- O cartão de metas mostra a origem das metas automáticas, que a referência não tem.
- A comparação é a olho, sem diff de pixels.

## Como rodar

```bash
pnpm install
pnpm dev            # http://localhost:5173/estatisticas?fixture=stats (fixture só em dev)
pnpm visual:stats   # capturas em docs/design/screenshots/stats/
```

## Resultado dos comandos

| Comando             | Resultado                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | sem erros                                                                                                  |
| `pnpm typecheck`    | sem erros                                                                                                  |
| `pnpm test`         | 179 testes em `apps/web` e 11 em `packages/shared`, todos passando                                         |
| `pnpm build`        | ok                                                                                                         |
| `pnpm e2e`          | 15 testes passando (3 novos de Estatísticas, mais os de foco, checklist e provas)                          |
| `pnpm visual:stats` | `overflowX: false` em 1920×1080, 1440×900 e 1280×720 (`docs/design/screenshots/stats/capture-report.json`) |

## Imagens

Em `docs/design/screenshots/stats/`:

- Página inteira: `full-1920x1080.png`, `full-1440x900.png`, `full-1280x720.png`
- Primeira dobra: `viewport-1920x1080.png`, `viewport-1440x900.png`, `viewport-1280x720.png`
- Lado a lado com a referência (1920 e 1440): `compare-horas-*.png`, `compare-preparacao-*.png`, `compare-sequencia-agua-*.png`, `compare-metas-*.png`, `compare-agenda-*.png`

## Pendências

- Contraste AA e foco visível: os cartões reutilizam os tokens já validados (texto `muted`/`soft` sobre `surface`, anel de foco global); **não** houve nova medição automatizada dos tamanhos `2xs`/`xs` dentro dos gráficos.
- Capturas do `?fixture=focus` não foram incluídas (as do Modo Foco estão em `docs/design/screenshots/focus/`).
- A confirmação do CI no GitHub e a tag `v0.4.0` acontecem após o push deste relatório.
