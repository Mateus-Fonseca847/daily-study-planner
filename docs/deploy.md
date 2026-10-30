# Deploy do Daily (Vercel)

O Daily é um front-end estático (Vite): o build gera `apps/web/dist` e nenhum back-end ou variável de ambiente é necessário. A hospedagem escolhida é a **Vercel** (plano gratuito), ligada ao repositório do GitHub pela interface da própria Vercel. Não use tokens nem secrets.

> A interface da Vercel muda de tempos em tempos. Os nomes abaixo vieram da documentação e da interface conhecidas na data deste texto (30/10/2026) e **não foram conferidos online durante a escrita**; se algum campo tiver outro nome, procure o equivalente em _Project Settings_.

## Passo a passo

1. Entre em <https://vercel.com> com a conta do GitHub e clique em **Add New… → Project**.
2. Em **Import Git Repository**, escolha o repositório do Daily (autorize o app da Vercel no GitHub, só para este repositório, se pedir).
3. Em **Configure Project**:
   - **Framework Preset:** `Vite`.
   - **Root Directory:** `apps/web` (clique em _Edit_ e selecione a pasta).
   - **Include source files outside of the Root Directory in the Build Step:** **ativado**. É necessário porque `apps/web` importa `@daily/shared` (`packages/shared`), que mora fora da pasta raiz do projeto.
   - **Build Command:** `pnpm build` (roda `tsc -p tsconfig.json && vite build` em `apps/web`).
   - **Output Directory:** `dist`.
   - **Install Command:** deixe o padrão. A Vercel detecta o pnpm pelo `pnpm-lock.yaml` e pelo campo `packageManager` do `package.json` da raiz e instala o workspace inteiro (equivale a `pnpm install --frozen-lockfile`). Se o build reclamar de `@daily/shared`, defina o comando como `pnpm install --frozen-lockfile` explicitamente.
   - **Node.js Version:** 20.x ou superior (o projeto exige `node >= 20`).
   - **Environment Variables:** nenhuma.
4. Clique em **Deploy**. O primeiro deploy leva cerca de um minuto; ao terminar, a Vercel mostra o endereço de produção (algo como `https://daily-xxxx.vercel.app`).
5. Abra o endereço, teste `/calendario`, `/habitos` e `/foco`, **recarregue uma rota direta** (deve abrir, não dar 404) e confira, nas ferramentas do navegador (Application → Manifest / Service Workers), que o app é instalável.
6. Envie a URL de produção para quem mantém o repositório: ela entra nas metas Open Graph (`SITE_URL` em `apps/web/vite.config.ts`), no README e nos textos de divulgação.

O que `apps/web/vercel.json` já configura (a Vercel o lê sozinha, a partir da pasta raiz do projeto):

- **Rewrite SPA:** qualquer rota sem extensão (`/habitos`, `/foco`…) devolve `index.html`; arquivos estáticos e `/assets`, `/icons` nunca são capturados (um `/assets/x.js` inexistente dá 404 de verdade).
- **Cache:** `/assets/*` com `public, max-age=31536000, immutable` (nomes com hash); `/sw.js`, `/index.html`, `/manifest.webmanifest` e as rotas do app com `max-age=0, must-revalidate`, para o navegador sempre revalidar e a atualização do service worker chegar.
- **Segurança:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva (câmera, microfone, geolocalização, pagamento, USB e sensores desligados; tela cheia e wake lock continuam permitidos), `X-Frame-Options: DENY` e `Content-Security-Policy`.

### Variáveis de ambiente (conta e sincronização)

Em **Settings → Environment Variables** da Vercel (Production e Preview), defina:

| Variável                 | Valor                                                         |
| ------------------------ | ------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase (`https://<ref>.supabase.co`)         |
| `VITE_SUPABASE_ANON_KEY` | chave **publishable** (pública; o acesso é limitado pela RLS) |

Sem elas o app funciona normalmente, só local (sem tela de entrada). Nunca use a chave `service_role`/secret no front-end. No Supabase: **Authentication → URL Configuration** com a Site URL de produção e as Redirect URLs (`https://dailystudyplanner.vercel.app/**`, `http://localhost:5173/**`); **Providers → Google** com o Client ID/Secret do Google Cloud (Credenciais de produção/URI de redirecionamento = `https://<ref>.supabase.co/auth/v1/callback`). Para o Google aceitar qualquer pessoa, a tela de consentimento precisa estar **publicada** e apontar para `/privacidade`.

### Content-Security-Policy

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:;
font-src 'self'; connect-src 'self' https://<ref>.supabase.co; media-src 'self' blob:; worker-src 'self';
manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

É a política mínima que o app aceita: sem `unsafe-inline` nem `unsafe-eval`. Dois ajustes foram necessários para chegar nisso:

- o zod 4 testava `Function('')` ao criar os schemas (o que a CSP reporta como violação de `script-src`); o app liga `z.config({ jitless: true })` antes de qualquer schema (`src/lib/zod-config.ts`), sem custo perceptível;
- estilos por atributo (`style={…}` do React) funcionam sem `unsafe-inline` porque o React os aplica pela API do DOM, não por HTML.

O app não carrega scripts nem fontes de terceiros (a fonte Inter vem empacotada). A única origem externa é o Supabase (`connect-src`), usada só com conta; o login Google é um redirecionamento de página inteira, que a CSP não bloqueia (`form-action`/`frame-ancestors` não se aplicam). Se mudar o projeto Supabase, atualize o domínio em `vercel.json`. O teste `e2e/pwa/headers.spec.ts` percorre todas as rotas, usa o Modo Foco (iniciar, tela cheia, wake lock, Web Audio) e falha se houver qualquer `securitypolicyviolation` ou erro de console, usando as regras do próprio `vercel.json` (`scripts/serve-dist.mjs`). Se você acrescentar algo que dependa de outro domínio (analytics, fontes remotas, API), amplie a diretiva correspondente e rode `pnpm e2e`.

## Prévias (preview deployments)

Cada branch e cada pull request ganha um endereço de prévia próprio (`daily-git-<branch>-<conta>.vercel.app`), mostrado no próprio PR e em **Deployments**. Trabalhando direto na `main`, só existe a produção; as prévias passam a valer quando você começar a usar branches.

## Domínio próprio

**Project → Settings → Domains → Add**, digite o domínio e siga as instruções de DNS (registro `A`/`CNAME` indicado na tela). O HTTPS é emitido automaticamente. Depois de trocar o domínio, atualize `SITE_URL` (`apps/web/vite.config.ts`), o README e o `og.png` se ele citar o endereço. Atenção: dados do navegador (hábitos, eventos) ficam **por origem**; mudar o endereço abre um app vazio, então use _Exportar_ e _Importar_ em Preferências para levar os dados.

## Risco: `main` = produção

A Vercel publica cada push na `main` automaticamente. Hoje isso é aceitável: o CI roda lint, tipos, testes, build e e2e (inclusive o projeto "pwa") a cada push, e um deploy com erro de build não substitui a produção anterior. Ainda assim, um commit com bug que passe nos testes vai ao ar. Duas mitigações simples:

- Em **Settings → Git**, desligue _Production Branch deploys_ automáticos (ou troque a branch de produção) e publique só quando quiser, promovendo um deploy.
- Quando o back-end entrar (e houver dados de outras pessoas), passe a trabalhar em branches com pull request: cada PR ganha uma prévia para validar antes do merge, e a `main` fica protegida (exigindo o CI verde).

Como o app guarda tudo no navegador do usuário, um deploy ruim **não corrompe dados**, mas a migração de formato (`DATA_VERSION`, ver `docs/data-model.md`) roda no primeiro acesso depois do deploy; por isso mudanças de formato merecem o fluxo com prévia.

## Verificação local do build de produção

```bash
pnpm build                              # raiz: gera apps/web/dist
pnpm --filter @daily/web build          # só o app (o nome do pacote é @daily/web)
pnpm --filter @daily/web preview        # serve o dist, com service worker
pnpm e2e                                # inclui o projeto "pwa" com os cabeçalhos do vercel.json
```
