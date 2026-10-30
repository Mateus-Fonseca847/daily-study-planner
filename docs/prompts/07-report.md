# Relatório 07 — PWA, deploy e material de divulgação

> Em andamento: este relatório é completado a cada fase. Estado atual: **Fase A concluída (v0.7.0)** e **Fase B concluída**; Fase C aguarda a URL de produção.

## Fase A — PWA e persistência (v0.7.0)

### O que foi feito

- **Ícones e metadados (A1):** `pnpm icons` (`apps/web/scripts/generate-icons.mjs`) renderiza, com o Chromium do Playwright já instalado (sem dependência nova), o logo "D" branco + ponto amarelo (`#f5e94b`, token de destaque) sobre `#131313`, a partir de SVG versionado (`public/icons/daily.svg`, `public/favicon.svg`). Saídas: `daily-192.png`, `daily-512.png`, `daily-maskable-512.png` (fundo cheio, conteúdo a 90 % para caber na área segura de 80 %), `apple-touch-icon.png` (180), `favicon.svg` e `favicon.ico` (PNGs de 16/32/48 embutidos). `index.html`: `lang="pt-BR"`, title, description, `theme-color`, `color-scheme`, favicons, Open Graph e Twitter. O endereço absoluto vem de `SITE_URL` (constante em `vite.config.ts`, hoje vazia = caminho relativo; preenchida na Fase C). A imagem `og.png` (1200×630) é gerada na Fase C.
- **Manifest e service worker (A2):** `vite-plugin-pwa` (Workbox, `generateSW`) com `registerType: 'prompt'`, pré-cache de todo o app shell (26 entradas, ~921 KiB), `navigateFallback: '/index.html'` (links diretos para qualquer rota funcionam offline), `cleanupOutdatedCaches`. Service worker **desativado no `pnpm dev`** (`devOptions.enabled: false` + registro só com `import.meta.env.PROD`). Manifest: nome, `short_name`, descrição, `lang` pt-BR, `start_url` `/calendario`, `scope` `/`, `display` `standalone`, `orientation` `any`, `theme_color`/`background_color` `#131313`, ícones (192, 512, maskable), `categories` `education` e `productivity` e **atalhos** Modo Foco, Hábitos e Estatísticas.
- **Atualização:** ao detectar versão nova aparece o toast "Nova versão disponível · Atualizar", e a oferta também fica em Preferências. Nunca recarrega sozinho. A regra `canOfferUpdate` (`lib/pwa/update-policy.ts`) **não oferece durante sessão de foco rodando, pausada ou travada**; a oferta sai quando a sessão termina (testes unitários cobrem ocioso, rodando, pausada e travada).
- **Fixtures fora da produção:** `createRepository` agora testa `import.meta.env.DEV` diretamente; o build troca por `false` e o bundle perde as fixtures (antes, "Meditação" e outras ficavam no JS de produção). Cobertura: teste e2e no projeto "pwa" (`?fixture=` sem efeito) e conferência do bundle.
- **Instalação e armazenamento (A3):** botão "Instalar app" na sidebar (só ícone quando recolhida) e em Preferências, visível apenas com `beforeinstallprompt` e fora do modo `standalone`; sem o evento (Safari/Firefox) Preferências mostra como instalar manualmente. Armazenamento persistente (`navigator.storage.persist()`) pedido na primeira vez em que existem dados (chave `daily:persist-asked`, fora do backup) e ao instalar; Preferências mostra "Situação: ativo / não garantido", o espaço usado (`storage.estimate()`), uma explicação curta e atalho para "Exportar dados". Indicador "Offline" na topbar quando `navigator.onLine` é falso.
- **Testes (A4):** projeto Playwright **"pwa"** contra `vite build` + `vite preview` (saída em `dist-pwa`, ignorada pelo git, ESLint e Prettier), no CI via `pnpm e2e`: manifest com campos, ícones acessíveis e atalhos; service worker registra e controla a página; offline em `/habitos`, `/foco` e `/estatisticas` abre e os dados persistem; `?fixture=` sem efeito; rotas sem erro de console. Mais `app-section.spec.ts` (Preferências, botão de instalar com evento simulado, indicador Offline).

### Dependências

- **`vite-plugin-pwa` 2.0** (a única prevista): gera manifest e service worker Workbox integrados ao build do Vite.
- **`workbox-window`** (devDependency): **peer** obrigatório do `virtual:pwa-register` do plugin; sem ele o build falha ("failed to resolve import workbox-window"). Não é uma escolha à parte, é parte da instalação do plugin.

### Lighthouse (local, `npx lighthouse@13.6`, contra `vite preview` de `/calendario`)

| Categoria      | Nota                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Desempenho     | 98 (FCP/LCP 0,8 s, TBT 30 ms, CLS 0)                                                                |
| Acessibilidade | 96                                                                                                  |
| Boas práticas  | 100                                                                                                 |
| SEO            | 100 (era 91: `robots.txt` inexistente respondia com o `index.html`; adicionado `public/robots.txt`) |

O Lighthouse 13 **não tem mais a categoria PWA**; a instalabilidade foi verificada pelos testes do projeto "pwa" (manifest completo, ícones, service worker controlando a página e funcionamento offline). Itens que ficaram: `valid-source-maps` (sem source maps de produção, escolha deliberada), `target-size` (os botões do segmentado Dia/Semana/Mês/Ano têm 40 px de altura, mas ficam a menos de 24 px entre si em alguns pontos) e `label-content-name-mismatch` (dias do mês: o nome acessível "1 de outubro: criar evento" começa com o número visível, mas a regra ainda reclama; fica para investigação).

### Resultado dos comandos (Fase A)

| Comando          | Resultado                                          |
| ---------------- | -------------------------------------------------- |
| `pnpm lint`      | sem erros                                          |
| `pnpm typecheck` | sem erros                                          |
| `pnpm test`      | 261 testes em `apps/web` + 11 em `packages/shared` |
| `pnpm build`     | ok (service worker e 26 entradas de pré-cache)     |
| `pnpm e2e`       | 46 testes passando (projetos "app" e "pwa")        |

### Pendências da Fase A

- Os alertas `target-size` e `label-content-name-mismatch` do Lighthouse.
- Teste manual da instalação em janela própria (Chrome/Edge) e do toast de atualização com uma versão nova real; os testes automáticos cobrem a regra e o registro, não o ciclo "publicar outra versão e atualizar".

## Fase B — Configuração de deploy (Vercel)

### O que foi feito

- **`apps/web/vercel.json`:** rewrite de qualquer rota sem extensão para `/index.html` (arquivos estáticos, `/assets` e `/icons` não são capturados; `/assets/x.js` inexistente dá 404); `Cache-Control: public, max-age=31536000, immutable` em `/assets/*`; `max-age=0, must-revalidate` em `/sw.js`, `/index.html`, `/manifest.webmanifest` e nas rotas do app; `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva (tela cheia e wake lock continuam permitidos), `X-Frame-Options: DENY` e CSP.
- **CSP mínima, sem `unsafe-inline` nem `unsafe-eval`:** `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. A primeira versão do teste achou uma violação real: o zod 4 chama `Function('')` na criação dos schemas. Correção: `z.config({ jitless: true })` em `src/lib/zod-config.ts`, importado antes de tudo em `main.tsx`. Estilos por atributo (React) não precisaram de `unsafe-inline`.
- **Validação com as regras reais:** `scripts/serve-dist.mjs` serve o build aplicando `vercel.json` (aproximação do roteador da Vercel); o projeto "pwa" do Playwright passou a usá-lo. `e2e/pwa/headers.spec.ts`: cabeçalhos de cache e segurança, rewrites e 404 de asset inexistente; percorre as 9 rotas e o Modo Foco (iniciar, tela cheia, wake lock, Web Audio) sem nenhum `securitypolicyviolation` nem erro de console, com o service worker registrado.
- **Build sem variáveis de ambiente:** `pnpm build` (raiz) e `pnpm --filter @daily/web build` produzem `apps/web/dist` (o segundo foi rodado com ambiente limpo). O nome do filtro é `@daily/web`, não `web`.
- **`docs/deploy.md`:** passo a passo (importar o repositório, Root Directory `apps/web`, _Include source files outside of the Root Directory_ ativado, framework Vite, build `pnpm build`, saída `dist`), prévias, domínio próprio, o risco "main = produção" e a alternativa com branches e prévias. O documento avisa que a interface da Vercel pode ter mudado: não consegui conferir a documentação online nesta sessão.

### Limites

- `serve-dist.mjs` aproxima o roteador da Vercel; o comportamento real só se confirma depois do primeiro deploy (Fase C).
- O deploy e a ligação do repositório à Vercel são feitos pelo autor na interface da Vercel.

### Resultado dos comandos (Fase B)

| Comando          | Resultado                                          |
| ---------------- | -------------------------------------------------- |
| `pnpm lint`      | sem erros                                          |
| `pnpm typecheck` | sem erros                                          |
| `pnpm test`      | 261 testes em `apps/web` + 11 em `packages/shared` |
| `pnpm build`     | ok                                                 |
| `pnpm e2e`       | 48 testes passando (projetos "app" e "pwa")        |
