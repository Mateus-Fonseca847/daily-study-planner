# Relatório 05 — Hábitos recorrentes com calendário de contribuições (v0.5.0)

## O que foi feito

- **Design antes do código:** seção "Heatmap de hábitos" no design system (§ 11) e tokens (célula, vão, raio, rótulos, `heat-0`, `heat-off`, 4 níveis por `color-mix` e a paleta de 7 cores, com o amarelo do Daily).
- **Modelo (A1):** `Habit`, `HabitRule` (versionada), `Repeat` (`dias-da-semana` | `a-cada-n-dias`) e `HabitLog` em `packages/shared/src/habits.ts`, com validação cruzada (fonte × tipo, regras em ordem, meta > 0). O campo opcional `endsOn` implementa o "fim" do formulário sem arquivar.
- **Migração v2 → v3 (A2):** chave `daily:v3`; o v2 é guardado em `daily:v2:pre-v3` antes de migrar e nunca é alterado; cada meta vira um hábito (mesmo `id`), cada registro de meta vira um registro de hábito (1/0). Exportar gera v3; importar aceita v1, v2 e v3.
- **Funções puras (A3)** em `lib/habits`: `isScheduled`, `valueOn`, `dayState`, `levelOn`, `streaks` (atual e melhor), `rate`, `heatmapMatrix`, `dayConsistency`, `generalStreaks`, `aggregateMatrix`, `generalRate`, mais `repeat.ts` (módulo próprio da repetição), `edit.ts` (regras versionadas, duplicar, retroativo) e `form.ts` (validação em pt-BR).
- **Store (A4):** criar, editar (nova regra), duplicar, arquivar/restaurar, excluir (toast "Desfazer" de 6 s que restaura também os registros), reordenar e registrar valor; retroativo só para hábitos manuais, de hoje até 366 dias atrás.
- **Página `/habitos` (A5):** cartões com resumo da repetição, sequência, melhor, taxa de 90 dias, controle de hoje, menu e heatmap acessível (`role="grid"`, foco móvel, setas, Enter, `aria-label`, tooltip, tabela oculta por mês); modal Novo/Editar com o aviso "A mudança vale a partir de hoje; o histórico não muda."; popover do dia; 4 sugestões no estado vazio; "Arquivados" recolhido; seletor de período (últimos 12 meses ou ano); contador na sidebar (oculto em zero, também para Tarefas).
- **Estatísticas (A6):** "Hábitos de hoje", "Consistência" (52 semanas, largura inteira, sequência geral, melhor e taxas de 30 e 90 dias) e a pílula de sequência com `generalStreaks`. Removi cartão, modal, funções, tipos e testes de Metas; sobrou só o necessário para migrar/importar (`legacy-goals.ts`).
- **Ajustes (A7):** fração dos milésimos em posição absoluta ao lado dos dígitos (sem deslocá-los; centralizados com as pílulas); o botão "Modo Foco" da topbar ganha estado ativo (`aria-current="page"` e contorno amarelo) em `/foco`.

## Decisões

- **Mesmo `id` na migração:** os registros antigos continuam apontando para o hábito sem reescrever ids.
- **Primeiro acesso sem hábitos:** antes havia 4 metas padrão; agora o estado vazio oferece as 4 sugestões (Musculação, Hidratação, Luta, Estudo).
- **Hoje pendente não conta** em sequência nem taxa (não quebra e não soma); fica `pendente` até ser cumprido.
- **Check com fonte `blocos`:** feito quando todos os blocos do dia estão concluídos; sem blocos o dia é "não agendado".
- **Foco por dia de início:** sessões contam no dia local em que começaram, em minutos reais (concluídas e interrompidas).
- **Arquivamento:** vale até o próprio dia (a meta antiga valia até o dia anterior): diferença sutil documentada na migração.
- **Tipo e fonte ficam fixos depois de criado** (só nome, ícone, cor, unidade, fim e a regra mudam), para não reinterpretar o passado.
- **Classes de cor literais:** `habit-<cor>` aparece por extenso em `HABIT_COLOR_CLASS` (o Tailwind não gera classes montadas por template; foi um bug que a captura revelou).
- **Sem dependência nova.**

## Mudanças no modelo de dados

Snapshot v3: `habits` e `habitLogs` no lugar de `goals`/`goalLogs`; `daily:v3`, `daily:v3:backup`, `daily:v3:corrupt`; `daily:v2:focus` (sessão ativa) segue fora do backup. Detalhes em [`docs/data-model.md`](../data-model.md).

## Valores visuais estimados

Todos em `tokens.css` e no design system (§ 11): célula de até 18 px (mín. 12 px), vão de 3 px, raio de 3 px, rótulos de 11 px, `heat-0` = branco a 12 %, `heat-off` = branco a 4 %, níveis 30 / 52 / 76 / 100 % da cor do hábito, legenda de 12 px, paleta `--ds-habit-*`.

## Contraste

`node apps/web/scripts/contrast-audit.mjs habits`: 254 textos medidos em `/estatisticas`, `/foco` e `/habitos` (rótulos de mês e dia, legenda, controles, popover): menor razão **4,71:1**, nenhum abaixo de 4,5:1 (`docs/design/screenshots/stats/contrast-habits.json`). As células do heatmap são gráficos; a informação nunca depende só da cor (`aria-label`, tooltip e tabela mensal oculta).

## Diferenças e limitações

- A referência (GitHub) usa semanas a partir do domingo e rótulos Seg/Qua/Sex, como aqui; as cores e a marca não foram usadas.
- Com menos de ~1100 px a grade rola na horizontal (começando na semana mais recente); não há captura dedicada desse estado.
- A fixture `habits` tem história de ~150 dias, então o heatmap de 12 meses mostra os meses antigos vazios.
- Não há reordenação por arrastar (a ação `reorderHabits` existe no store, sem UI); a ordem é a de criação.
- A regra de repetição ainda não vale para eventos do calendário (fica para depois, por decisão do prompt).
- Edição retroativa só para hábitos manuais; fontes automáticas refletem os dados de origem.

## Como rodar

```bash
pnpm dev                       # http://localhost:5173/habitos?fixture=habits (só em dev)
pnpm visual:habits             # capturas em docs/design/screenshots/habits/
node apps/web/scripts/contrast-audit.mjs habits
```

## Resultado dos comandos

| Comando              | Resultado                                                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`          | sem erros                                                                                                                                                                                                                                                                                          |
| `pnpm typecheck`     | sem erros                                                                                                                                                                                                                                                                                          |
| `pnpm test`          | 225 testes em `apps/web` + 11 em `packages/shared`, todos passando (hábitos: regras versionadas, arquivamento, intervalo de N dias, fonte `blocos` sem blocos, sequência com dia não agendado, virada de ano e 29/02, migração v2→v3 incluindo arquivadas, importação v1/v2/v3, formulário, store) |
| `pnpm build`         | ok                                                                                                                                                                                                                                                                                                 |
| `pnpm e2e`           | 22 testes passando (6 novos de hábitos: criar, marcar hoje e corrigir dia passado com sequência/taxa, persistência, água → Hidratação, migração v2 semeada, teclado no heatmap)                                                                                                                    |
| `pnpm visual:habits` | `overflowX: false` em 1920×1080, 1440×900 e 1280×720                                                                                                                                                                                                                                               |

**CI no GitHub:** confirmado na mensagem final da sessão (resultado do último commit e da tag).

## Capturas (`docs/design/screenshots/habits/`)

`habitos-viewport-*`, `habitos-pagina-*`, `popover-do-dia-*`, `modal-novo-habito-*` e `estatisticas-habitos-*`, cada uma em `1920x1080`, `1440x900` e `1280x720`; mais `capture-report.json`. Foco: `docs/design/screenshots/focus/` (refeitas).

## Pendentes do usuário (não tocados)

`docs/prompts/02-prompt.md`, `docs/prompts/02-report.md` e `docs/design/screenshots/capture-report.json`: ao começar, a árvore estava limpa e sincronizada, então não há modificações pendentes desses arquivos.

## Pendências

- Reordenar hábitos pela interface.
- Captura do estado com rolagem horizontal (< 1100 px) e dos hábitos arquivados.
- Foco visível e hover das células foram verificados por teclado/e2e, não por medição automatizada.
