# Prompt 07 — PWA, deploy, material de divulgação e acabamento do repositório

## Contexto
Projeto Daily (monorepo pnpm, apps/web em React + TS + Vite + Tailwind). Leia CLAUDE.md, docs/design/design-system.md, docs/data-model.md, README.md, CHANGELOG.md e os relatórios em docs/prompts/ (principalmente 05, 05.1 e 06). Trabalhe DIRETO na main, sem PRs e sem trocar de branch.

Pré-checagem:
- `git status` limpo e sincronizado com origin/main; se não, pare e avise.
- Se não existir docs/prompts/05.1-report.md, pare e avise: o ajuste de layout (AppShell preenchendo a altura da janela) ainda não foi aplicado.
- Este arquivo já existe em docs/prompts/07-prompt.md; inclua-o no primeiro commit.

## Objetivo
Transformar o Daily em app instalável (PWA, funcionando offline), publicá-lo online com link público e deixar o repositório pronto para o currículo e o post no LinkedIn.
- Fase A: PWA e persistência (tag v0.7.0)
- Fase B: configuração de deploy (**checkpoint: pare e peça a URL ao usuário**)
- Fase C: material de divulgação e acabamento (tag v1.0.0)

Os dados continuam só no navegador (sem backend, login ou sincronização).

# FASE A — PWA e persistência

## A1. Ícones e metadados
- Se apps/web/public/icons/daily-512.png não existir, gere os ícones a partir do logo do Daily: "D" branco, em fonte sans-serif bold, sobre quadrado arredondado #131313, com um ponto amarelo (token de destaque) ao lado, como no logo textual "Daily.". Renderize com o Playwright já instalado (sem dependência nova) a partir de um SVG versionado em apps/web/public/icons/daily.svg. Gere: 192, 512, **maskable** 512 (área segura de 80%, fundo cheio), apple-touch-icon 180, favicon.svg e favicon.ico.
- index.html: `lang="pt-BR"`, title e meta description, theme-color e background-color com o token do fundo, favicons, apple-touch-icon, meta viewport e tags Open Graph/Twitter (título, descrição, imagem 1200×630 gerada na Fase C; use um caminho relativo configurável para a URL absoluta, que será preenchida no checkpoint).

## A2. Manifest e service worker
- Manifest (gerado pelo plugin): name "Daily — organizador de estudos", short_name "Daily", description, lang pt-BR, start_url `/calendario`, scope `/`, display `standalone`, orientation `any`, theme_color e background_color, ícones (192, 512, maskable), categories `education` e `productivity`, e **shortcuts**: Modo Foco (/foco), Hábitos (/habitos), Estatísticas (/estatisticas).
- Use `vite-plugin-pwa` (Workbox) com `registerType: 'prompt'`. É a única dependência nova prevista; justifique no relatório. Pré-cache de todo o app shell, `navigateFallback` para index.html (links diretos para qualquer rota funcionam offline) e limpeza de caches antigos.
- O service worker fica **desativado em `pnpm dev`** para não atrapalhar o desenvolvimento; ativo no build e no preview.
- Atualização: ao detectar nova versão, mostre um toast discreto "Nova versão disponível · Atualizar". Nunca recarregue sozinho. **Não mostre a oferta durante uma sessão de foco rodando, pausada ou travada**; ofereça depois que terminar. Teste unitário dessa regra.
- Confirme no build de produção que as fixtures de desenvolvimento (`?fixture=...`) não funcionam (devem ser removidas do bundle ou ignoradas) e cubra com teste.

## A3. Instalação e armazenamento
- Botão "Instalar app" em Preferências e no rodapé da sidebar, visível só quando o navegador oferece a instalação (`beforeinstallprompt`) e o app ainda não está instalado. Texto explicativo curto para navegadores sem esse evento (Safari/Firefox): como instalar manualmente. Detecte o modo instalado (`display-mode: standalone`) e esconda o botão.
- Peça **armazenamento persistente** (`navigator.storage.persist()`) na primeira vez em que o usuário cria dados e ao instalar. Em Preferências, mostre "Armazenamento persistente: ativo / não garantido" e o espaço usado (`storage.estimate()`), com explicação em uma linha e atalho para "Exportar dados".
- Indicador discreto "Offline" na topbar quando `navigator.onLine` for falso (o app continua 100% funcional).

## A4. Testes
- Playwright com um segundo projeto "pwa" que roda contra `vite build` + `vite preview` (o service worker não existe no dev): (1) o manifest é servido e tem os campos exigidos, ícones e shortcuts; (2) o service worker registra e passa a controlar a página; (3) após o primeiro carregamento, `context.setOffline(true)` e recarregar em /habitos e /foco ainda abre o app e os dados continuam lá; (4) `?fixture=` não tem efeito no build; (5) nenhum erro de console. Inclua no CI.
- Rode o Lighthouse com `npx` (sem adicionar ao package.json) contra o preview e registre as notas de desempenho, acessibilidade, boas práticas, SEO e o resultado dos critérios de PWA no relatório. Corrija o que for simples e liste o resto.
- Fim da Fase A: CI verde confirmado no GitHub, CHANGELOG atualizado, tag v0.7.0.

# FASE B — Configuração de deploy

Hospedagem escolhida: **Vercel** (plano gratuito), integrando o repositório do GitHub pela interface da Vercel. Não use tokens nem secrets nesta etapa.

## B1. Arquivos
- `apps/web/vercel.json` com: rewrite de todas as rotas para `/index.html` (SPA) sem capturar arquivos estáticos; `Cache-Control: public, max-age=31536000, immutable` em `/assets/*`; `no-cache` (revalidar sempre) em `/sw.js`, `/index.html` e `/manifest.webmanifest`; cabeçalhos de segurança (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva, proteção contra iframe).
- Content-Security-Policy restritiva (`default-src 'self'`, ajustada ao que o app realmente usa, inclusive estilos inline e Web Audio). Valide no preview com Playwright que não há violação de CSP no console em nenhuma rota e que Wake Lock, tela cheia, som e service worker continuam funcionando. Se algo quebrar, ajuste a política mínima necessária e documente.
- Confirme que `pnpm build` na raiz e `pnpm --filter web build` produzem `apps/web/dist` sem depender de variáveis de ambiente.
- Crie docs/deploy.md com o passo a passo para o usuário: importar o repositório na Vercel, **Root Directory = apps/web**, ativar "Include source files outside of the Root Directory" (necessário para packages/shared), framework Vite, comandos de install e build corretos para o monorepo pnpm, diretório de saída `dist`, como ver as prévias e como definir um domínio próprio depois. Se tiver acesso à web, confira a documentação atual da Vercel; se não, avise no documento que a interface pode ter mudado.
- Documente o risco de "main = produção" (cada push publica) e a alternativa de passar a usar branches com prévias quando o back-end entrar.

## B2. Checkpoint (OBRIGATÓRIO)
Termine a Fase B, faça push, **pare e escreva ao usuário**: o que ele precisa fazer na Vercel (resumo de docs/deploy.md) e peça a URL de produção. **Não avance para a Fase C até receber a URL.**

# FASE C — Material de divulgação e acabamento (após a URL)

## C1. URL e verificação em produção
- Preencha a URL de produção nas metas Open Graph, no README, no manifest (se necessário) e em docs/.
- Com Playwright, rode contra a URL pública: carregar /calendario, /habitos, /foco e /estatisticas, recarregar uma rota direta, manifest e service worker presentes, sem erros de console. Registre o resultado e as notas do Lighthouse da URL pública.

## C2. Capturas e vídeos (docs/media/, reproduzíveis com `pnpm media:capture`)
- Script que usa as fixtures de dev (data fixa) para gerar, em 1920×1080 e recortadas para: imagem social do GitHub 1280×640, Open Graph 1200×630 (salva em apps/web/public/og.png) e imagens de post 1080×1350 e 1200×627. Uma imagem por tela: Calendário (Mês), Semana, Dia, Ano, Hábitos (heatmap), Modo Foco (rodando e travado), Estatísticas.
- Gravações curtas (Playwright, vídeo): (1) Modo Foco: digitar o tempo, iniciar, travar, mostrar "Segurar para destravar"; (2) criar um hábito e marcar hoje no heatmap; (3) alternar Dia → Semana → Mês → Ano. Converta para MP4 se houver ffmpeg disponível (LinkedIn aceita MP4 melhor que GIF); se não houver, entregue os vídeos em WebM e o comando de conversão no relatório. Máximo ~15 s cada, sem dados pessoais.

## C3. Texto para divulgação (docs/portfolio/)
- `linkedin-post.md`: duas versões em pt-BR (curta, ~600 caracteres; e longa, ~1.500), contando o problema real (estudante que precisava de um painel na segunda tela), o que foi construído e os destaques técnicos (PWA offline, design system por tokens, heatmaps de hábitos acessíveis, testes e2e, CI, desenvolvimento assistido por IA com prompts versionados), aprendizados, link da demo e do repositório e sugestões de hashtags. **Use apenas números reais** extraídos do repositório (testes, commits, tags, tempo de build); não invente métricas. Marque com `[PREENCHER]` o que só o autor sabe.
- `curriculo.md`: 4 a 6 bullets para o currículo, em português e em inglês, com verbos de ação e números reais, mais uma linha curta de descrição do projeto para o portfólio.

## C4. Acabamento do repositório
- README final: imagem de topo, badges (CI do GitHub Actions, versão, licença), link da demo em destaque, "O que é", funcionalidades por tela com capturas, "Instalar como app" (Chrome/Edge e como fixar na barra de tarefas), "Dados e privacidade" (dados ficam no navegador; cada endereço tem seu próprio armazenamento; use Exportar e Importar para levar dados de localhost para o endereço publicado), stack, como rodar localmente, arquitetura resumida, decisões técnicas, limitações, roadmap e link para o CHANGELOG.
- docs/architecture.md com diagrama Mermaid (camadas: UI, store, repositório, localStorage, PWA) e as decisões principais.
- `.github/ISSUE_TEMPLATE/` (bug e ideia) e `CONTRIBUTING.md` curto. Crie milestones e issues a partir das limitações e pendências reais dos relatórios 01 a 06, por exemplo: back-end com login e sincronização; notificações; recorrência de eventos; reordenar hábitos pela interface; tipo e fonte do hábito editáveis; menu de tipo ao criar evento pela grade; criar evento pelo teclado na grade; arrastar e redimensionar eventos; eventos de vários dias; testes em Firefox e Safari; teste visual automatizado. Se `gh` estiver autenticado, crie milestones e issues com ele; senão, gere docs/roadmap-issues.md com título, descrição e rótulo de cada uma para o usuário criar.
- Se `gh` estiver disponível: `gh repo edit` com descrição, tópicos (react, typescript, vite, tailwindcss, pnpm, monorepo, pwa, study-planner, calendar, habit-tracker, productivity) e o link da demo como website; crie a GitHub Release v1.0.0 com notas do CHANGELOG. Se não, deixe os comandos em docs/portfolio/checklist-publicacao.md, junto com o lembrete de enviar manualmente a imagem social (Settings > Social preview).

# Fluxo na main
- Antes de CADA commit: `pnpm lint && pnpm typecheck && pnpm test`. Antes de cada push: também `pnpm build` e `pnpm e2e` (inclusive o projeto "pwa").
- Um commit por etapa lógica, em Conventional Commits, cada um compilando sozinho.
- Push ao final de cada etapa; se o CI falhar, corrija na hora com `fix:`.
- Nunca use `git push --force`, não reescreva o histórico e não troque de branch.
- Tags: v0.7.0 ao fim da Fase A; v1.0.0 ao fim da Fase C, com o CI verde confirmado.

# Regras
Tokens obrigatórios, componentes pequenos e tipados, lógica fora dos componentes, acessibilidade (o botão de instalar e o toast de atualização operáveis por teclado, com aria-live educado). Nenhuma dependência além de `vite-plugin-pwa` sem justificativa. Nenhum analytics ou rastreamento. Não implemente backend, autenticação, sincronização nem notificações do sistema.

# Critérios de aceite
- [ ] O app instala como PWA, abre em janela própria e funciona offline em todas as rotas
- [ ] Atualização nunca interrompe uma sessão de foco; fixtures não funcionam em produção
- [ ] Armazenamento persistente solicitado e visível em Preferências
- [ ] URL pública funcionando, com links diretos para qualquer rota e CSP sem violações
- [ ] README, arquitetura, capturas, vídeos, texto do post e bullets do currículo prontos, só com números reais
- [ ] Milestones e issues criados (ou listados para criação manual)
- [ ] lint, typecheck, test, build e e2e (inclusive "pwa") passam no CI do GitHub (confirmado), com as tags v0.7.0 e v1.0.0

# Entrega
Escreva docs/prompts/07-report.md com: o que foi feito em cada fase, decisões, a justificativa da dependência, notas do Lighthouse (local e da URL pública), resultado do CI, pendências e a lista dos caminhos das capturas, vídeos e textos. Atualize o CHANGELOG.
