# Relatório 06 — Visões Dia, Semana e Ano do calendário (v0.6.0)

## O que foi feito

- **Navegação (Passo 0):** o calendário passou a ter **Dia | Semana | Mês | Ano**. O botão "Hoje" saiu do segmentado e virou uma pílula ao lado das setas (`‹ ›  Hoje  título do período`) e volta ao período atual **na visão em que se está**. Visão e data ficam na URL (`/calendario?visao=semana&data=2026-10-29`); recarregar, voltar e compartilhar preservam o estado, valores inválidos caem em Mês + hoje e parâmetros extras (ex.: `fixture`) são preservados. Os selects de mês e ano seguem a data, as setas andam por dia, semana, mês ou ano, e o filtro por matéria da topbar vale para todas as visões. "Nova Prova" não mudou.
- **Grade de horas (`TimeGrid`)**, usada por Dia e Semana: coluna de horas, linhas por hora, intervalo 06h–24h **expandido** em horas cheias quando há evento fora dele, linha de "agora" no dia de hoje, rolagem automática para a hora atual (ou 07h). Blocos posicionados por **porcentagem** do intervalo, duração visual mínima de 30 min e corte na meia-noite. `layoutSobreposicoes` distribui os concorrentes em colunas lado a lado. Conteúdo do bloco por altura (3, 2 ou 1 linha com tooltip), no estilo dos chips do mês. Clicar num espaço vazio abre o formulário com data e horário (arredondado para baixo, em 30 min); clicar num bloco abre o popover de evento do mês.
- **Semana:** 7 colunas (DOM–SÁB), hoje em amarelo, título "25 – 31 out 2026" (ajusta nas viradas de mês e ano), faixa "Hábitos" fixa com pílulas dos hábitos sem horário (manual alterna em hoje e nos dias passados; quantidade mostra valor/meta; automáticos são só leitura) e blocos tracejados para hábitos com horário. Cabeçalho e faixa ficam fixos na rolagem vertical e, abaixo de 960 px, grade e cabeçalho rolam juntos na horizontal.
- **Dia:** título "Hoje, quinta-feira, 29 de outubro" (ou a data por extenso), grade de uma coluna larga e painel à direita (abaixo de 1100 px, acima da grade) com "Hábitos do dia" (mesmos controles da página Hábitos), "Próxima prova" (contagem regressiva, barra e atalho) e "Tarefas do dia" (entregas pendentes e atrasadas, com checkbox para concluir), todos com estados vazios.
- **Ano:** 12 mini-meses (4×3 a partir de 1600 px, 3×4 a partir de 1100 px, 2×6 abaixo), densidade em 4 níveis, marcador vermelho nos dias com prova, hoje com contorno amarelo, dias de outros meses ocultos, tooltip e `aria-label` com a contagem ("3 eventos, 1 prova"), legenda "Menos … Mais". O dia abre a visão Dia e o nome do mês, a visão Mês. Foco móvel por teclado (← → um dia, ↑ ↓ uma semana).
- **Teclado:** `←` `→` período, `T` hoje, `D` `S` `M` `A` visão; desativados em campos de texto, em menus e diálogos, com modal aberto, com o app travado e quando a própria visão já tratou a tecla (grade do Ano). `aria-keyshortcuts` e dica no tooltip.
- **Verificação:** fixture `?fixture=views`, `pnpm visual:views` e auditoria de contraste ampliada ao calendário.

## Decisões

- **Estado na URL por `useSearchParams`:** cada mudança é uma entrada do histórico (o voltar do navegador funciona); a visão padrão (Mês) não reescreve a URL até alguém navegar.
- **Posição por porcentagem:** altura do corpo = horas × `--ds-grid-hour-h` (token) e cada bloco usa `top`/`height` em %. As linhas por altura usam limiares em **minutos** (≥ 50 min = 3 linhas), calibrados para a hora de 72 px.
- **Entrega sem duração** vira um bloco de 30 min (mínimo visual), sempre dentro das 24 h.
- **Hábitos na grade:** hábitos com horário usam o mesmo layout de sobreposição dos eventos (`GridItem` unificado) e alternam ao clique (manuais, até hoje).
- **Criar num espaço vazio** usa o tipo "Bloco de estudo" (o mais comum numa grade de horas); o botão do dia no cabeçalho da Semana abre o formulário padrão e é a alternativa por teclado.
- **Densidade do Ano** ignora eventos cancelados; o texto da célula troca para escuro no nível 3 (amarelo cheio).
- **Sem dependência nova.** Classes do Tailwind só por mapas literais (`HABIT_COLOR_CLASS`, `DENSITY_CLASS`) ou variáveis de tokens; nada de classes montadas por template.

## Valores visuais estimados

Todos em `tokens.css` e no design system (§ 12): hora de 72 px, coluna de horas de 56 px, largura mínima da Semana de 960 px, cabeçalho de 56 px, painel do Dia de 320 px (altura mínima da grade de 36 rem quando o painel vai para cima), linha de agora de 2 px com bolinha de 8 px, pílula de hábito de 24 px, borda tracejada de 2 px, célula do Ano de 24 px com vão de 24 px e marcador de prova de 5 px, densidades de 4 %, 22 %, 38 % e 85 % do amarelo.

## Contraste

`node apps/web/scripts/contrast-audit.mjs views` (1.107 textos nas 4 visões e nas demais páginas). Primeira medição: o "valor/meta" das pílulas ficava em 2,9–3,6:1 e os números do nível 2 do Ano em 4,2:1 (o resto dos reprovados eram textos cobertos pelo cabeçalho fixo, descartados passando a verificar `elementFromPoint`). Depois dos ajustes: menor razão **4,55:1**, nenhum abaixo de 4,5:1 (`docs/design/screenshots/stats/contrast-views.json`). Foco visível: anel global; a grade do Ano e os blocos o herdam.

## Diferenças e limitações

- Sem arrastar/redimensionar, sem eventos de vários dias e sem recorrência de eventos (fora do escopo); o que cruza a meia-noite é cortado em cada dia.
- Clicar num espaço vazio da grade é ação de mouse; por teclado, cria-se pelo botão do dia (Semana) ou pelo "Nova Prova".
- Na fixture `views` o evento que cruza a meia-noite faz a grade da semana ir de 00h a 24h; a rolagem inicial leva à hora atual.
- O popover de evento reaproveita o do mês, sem ajustes de posição específicos da grade (a captura confirma que fica dentro da tela nos três tamanhos).
- Sem overflow horizontal da página em 1920×1080, 1440×900 e 1280×720 (`docs/design/screenshots/views/capture-report.json`).

## Como rodar

```bash
pnpm dev                       # http://localhost:5173/calendario?visao=semana&data=2026-10-29&fixture=views
pnpm visual:views              # capturas em docs/design/screenshots/views/
node apps/web/scripts/contrast-audit.mjs views
```

## Resultado dos comandos

| Comando          | Resultado                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`      | sem erros                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pnpm typecheck` | sem erros                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pnpm test`      | 255 testes em `apps/web` + 11 em `packages/shared`, todos passando (novos: intervalo da semana em viradas de mês/ano, corte na meia-noite, expansão do intervalo, posição em %, `layoutSobreposicoes` (sem conflito, 2 e 3 simultâneos, encadeados, mesmo início, evento dentro de outro, sem perda), `grade12Meses`, `densidadePorDia`, títulos de cada visão, URL com valores inválidos, clique em hábitos) |
| `pnpm build`     | ok                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm e2e`       | 29 testes passando (7 novos: trocar de visão pelo segmentado e pela URL; `→` e "Hoje"; atalhos não roubam teclas; criar num horário vazio com data e hora corretas; Ano → Dia e → Mês; marcar hábito pela faixa; simultâneos sem sobreposição)                                                                                                                                                                |

**CI no GitHub:** confirmado na mensagem final da sessão (resultado do último commit e da tag).

## Capturas (`docs/design/screenshots/views/`)

`dia-*`, `semana-*`, `mes-*`, `ano-*` e `semana-popover-*`, cada uma em `1920x1080`, `1440x900` e `1280x720`, mais `capture-report.json`.

## Pendências

- Criar eventos por teclado direto na grade (hoje: botão do dia e "Nova Prova").
- Captura do Dia com o painel acima da grade (< 1100 px) e da Semana com rolagem horizontal (< 960 px de grade).
- Foco visível e hover dos blocos foram verificados por teclado/e2e, não por medição automática.
