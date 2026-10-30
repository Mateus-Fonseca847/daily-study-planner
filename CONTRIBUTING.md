# Contribuindo

O Daily é um projeto pessoal de portfólio, mas ideias e correções são bem-vindas.

1. **Abra uma issue** (bug ou ideia) antes de mudanças grandes.
2. Faça um fork e crie uma branch (`feat/minha-ideia`).
3. `pnpm install` e `pnpm dev` (http://localhost:5173). Na primeira vez dos testes e2e: `pnpm --filter @daily/web exec playwright install chromium`.
4. Antes de abrir o pull request, rode `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`.
5. Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Regras do projeto

- **Tokens:** nenhum valor visual (cor, medida, raio, sombra, fonte) fora de `apps/web/src/styles/tokens.css`. Valor novo: documente em `docs/design/design-system.md`, crie o token e mapeie no tema.
- **Classes do Tailwind sempre literais:** nunca monte classes por template (`bg-${cor}`); use mapas literais ou variáveis CSS.
- **Componentes pequenos e tipados**; lógica fora dos componentes (funções puras com teste em `lib/`).
- **Componentes nunca acessam `localStorage`:** UI → `useData` → `DataRepository`.
- Mudou o formato salvo? Suba `DATA_VERSION`, escreva a migração e atualize `docs/data-model.md`.
- Acessibilidade: foco visível, `aria-label` em botões de ícone e teclado funcional.

Mais contexto em [`CLAUDE.md`](CLAUDE.md) e [`docs/architecture.md`](docs/architecture.md).
