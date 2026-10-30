# Checklist de publicação

Itens marcados com **(feito)** já foram executados pela sessão que preparou a v1.0.0 (o `gh` estava autenticado). Os demais dependem de você.

## No GitHub

- [x] **(feito)** Descrição, tópicos e site do repositório:

  ```bash
  gh repo edit Mateus-Fonseca847/daily-study-planner \
    --description "Organizador de estudos (PWA): calendário em 4 visões, provas, hábitos com heatmap, Modo Foco e estatísticas. React, TypeScript, Vite e Tailwind." \
    --homepage "https://dailystudyplanner.vercel.app" \
    --add-topic react --add-topic typescript --add-topic vite --add-topic tailwindcss \
    --add-topic pnpm --add-topic monorepo --add-topic pwa --add-topic study-planner \
    --add-topic calendar --add-topic habit-tracker --add-topic productivity
  ```

- [x] **(feito)** Milestones e issues a partir das limitações dos relatórios 01 a 07 (`gh issue list`).
- [x] **(feito)** GitHub Release `v1.0.0` com as notas do CHANGELOG:

  ```bash
  gh release create v1.0.0 --title "Daily v1.0.0" --notes-file docs/portfolio/release-notes-v1.0.0.md
  ```

- [ ] **Imagem social do repositório (manual, o `gh` não envia):** _Settings → General → Social preview → Edit → Upload an image_ e escolha `docs/media/social/calendario-semana-github-1280x640.png` (1280×640).
- [ ] Conferir o README renderizado em <https://github.com/Mateus-Fonseca847/daily-study-planner> (imagem de topo, badges e tabela de telas).
- [ ] Preencher no README o nome e o link do LinkedIn (`[PREENCHER]`).

## Na Vercel

- [x] Projeto criado, Root Directory `apps/web` (veja `docs/deploy.md`).
- [ ] Opcional: domínio próprio (_Settings → Domains_); depois atualize `SITE_URL` em `apps/web/vite.config.ts` e o README.
- [ ] Opcional: desligar o deploy automático de produção se não quiser que cada push na `main` publique (veja o risco em `docs/deploy.md`).

## Antes de postar no LinkedIn

- [ ] Abrir <https://dailystudyplanner.vercel.app> numa janela anônima e testar `/habitos`, `/foco` e instalar o app.
- [ ] Revisar `docs/portfolio/linkedin-post.md` e preencher os `[PREENCHER]`; reconferir os números (`git rev-list --count HEAD`, `pnpm test`, `pnpm e2e`).
- [ ] Escolher a imagem: `docs/media/social/*-post-1080x1350.png` (retrato) ou `*-post-1200x627.png` (paisagem).
- [x] **(feito)** Vídeos convertidos para MP4 (`docs/media/videos/*.mp4`, de 8 a 11 s, sem áudio). Para refazer:

  ```bash
  ffmpeg -i docs/media/videos/modo-foco.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart docs/media/videos/modo-foco.mp4
  ```

  (sem `ffmpeg` instalado: `winget install Gyan.FFmpeg`, ou use um conversor online com os vídeos, que não têm dados pessoais.)

- [ ] Testar o cartão de pré-visualização do link no [Post Inspector do LinkedIn](https://www.linkedin.com/post-inspector/) (usa a imagem `og.png`).
- [ ] Atualizar o currículo com `docs/portfolio/curriculo.md`.
