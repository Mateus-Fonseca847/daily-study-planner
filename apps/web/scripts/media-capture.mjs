/**
 * Gera o material de divulgação com as fixtures de desenvolvimento (data fixa, sem dados pessoais).
 *  - docs/media/screens/<tela>-1920x1080.png: uma imagem por tela;
 *  - docs/media/social/<tela>-<formato>.png: imagem social do GitHub (1280×640), Open Graph
 *    (1200×630, e a da Semana vira apps/web/public/og.png) e posts (1080×1350 e 1200×627);
 *  - docs/media/videos/*.webm: três gravações curtas (sem ffmpeg o formato fica em WebM).
 * Uso: `pnpm media:capture`
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { copyFileSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const mediaDir = path.resolve(webRoot, '../../docs/media');
const PORT = 5195;
const BASE = `http://localhost:${PORT}`;
const SITE = 'dailystudyplanner.vercel.app';

const VIEWS_NOW = new Date('2026-10-29T10:30:00');
const STATS_NOW = new Date('2026-11-10T10:30:00');

/** [slug, título, legenda, url, data fixa, ação opcional antes da captura] */
const SCREENS = [
  ['calendario-mes', 'Calendário', 'Provas, estudos e entregas num só lugar', '/calendario?fixture=views&visao=mes&data=2026-10-29', VIEWS_NOW],
  ['calendario-semana', 'Visão semanal', 'Grade de horas com eventos simultâneos e faixa de hábitos', '/calendario?fixture=views&visao=semana&data=2026-10-29', VIEWS_NOW],
  ['calendario-dia', 'Visão do dia', 'Hábitos, próxima prova e tarefas ao lado da agenda', '/calendario?fixture=views&visao=dia&data=2026-10-29', VIEWS_NOW],
  ['calendario-ano', 'Visão anual', 'Doze meses e a densidade de eventos de cada dia', '/calendario?fixture=views&visao=ano&data=2026-10-29', VIEWS_NOW],
  ['habitos', 'Hábitos', 'Heatmap de contribuições para cada hábito', '/habitos?fixture=habits', STATS_NOW],
  [
    'foco-rodando',
    'Modo Foco',
    'Cronômetro grande, pensado para a segunda tela',
    '/foco?fixture=stats',
    STATS_NOW,
    async (page) => {
      const field = page.getByRole('textbox', { name: 'Duração da sessão' });
      await field.click();
      await field.fill('50');
      await field.press('Enter');
      await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
      await page.waitForTimeout(700);
    },
  ],
  ['foco-travado', 'Foco travado', 'Sem distrações: só o tempo e “Segurar para destravar”', '/foco?fixture=focus', STATS_NOW],
  ['estatisticas', 'Estatísticas', 'Horas, preparação, água, hábitos e dias de mais foco', '/estatisticas?fixture=stats', STATS_NOW],
];

const FORMATS = [
  ['github-1280x640', 1280, 640, 'cover'],
  ['og-1200x630', 1200, 630, 'cover'],
  ['post-1200x627', 1200, 627, 'cover'],
  ['post-1080x1350', 1080, 1350, 'card'],
];

for (const dir of ['screens', 'social', 'videos']) mkdirSync(path.join(mediaDir, dir), { recursive: true });
const server = await createServer({ root: webRoot, logLevel: 'error', server: { port: PORT, strictPort: true } });
await server.listen();
const browser = await chromium.launch();

const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;

/** Monta a imagem social: recorte “cover” (paisagem) ou cartão com título (retrato). */
async function compose(page, file, mode, width, height, title, caption) {
  const shot = dataUrl(file);
  const html =
    mode === 'cover'
      ? `<body style="margin:0;background:#131313"><img src="${shot}" style="display:block;width:${width}px;height:${height}px;object-fit:cover;object-position:left top"></body>`
      : `<body style="margin:0;width:${width}px;height:${height}px;background:#131313;color:#fff;font-family:Inter,'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;padding:72px 48px 56px;box-sizing:border-box">
          <div style="font-size:44px;font-weight:800;letter-spacing:-1px">Daily<span style="color:#f5e94b">.</span></div>
          <div style="font-size:76px;font-weight:800;letter-spacing:-2px;margin-top:56px;line-height:1.05">${title}</div>
          <div style="font-size:34px;color:#b9b9b9;margin-top:20px;line-height:1.3">${caption}</div>
          <div style="flex:1"></div>
          <img src="${shot}" style="display:block;width:984px;height:760px;object-fit:cover;object-position:left top;border-radius:24px;border:1px solid #333">
          <div style="margin-top:36px;font-size:30px;color:#f5e94b;font-weight:600">${SITE}</div>
        </body>`;
  await page.setViewportSize({ width, height });
  await page.setContent(html);
  await page.waitForTimeout(150);
}

try {
  // 1) Telas e imagens sociais.
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  const composer = await (await browser.newContext()).newPage();
  for (const [slug, title, caption, url, now, action] of SCREENS) {
    await page.clock.install({ time: now });
    await page.goto(BASE + url);
    await page.locator('main').waitFor();
    await page.waitForTimeout(500);
    if (action) await action(page);
    const screen = path.join(mediaDir, 'screens', `${slug}-1920x1080.png`);
    await page.screenshot({ path: screen });
    for (const [name, width, height, mode] of FORMATS) {
      await compose(composer, screen, mode, width, height, title, caption);
      await composer.screenshot({ path: path.join(mediaDir, 'social', `${slug}-${name}.png`) });
    }
    console.log('ok', slug);
  }
  copyFileSync(path.join(mediaDir, 'social', 'calendario-semana-og-1200x630.png'), path.resolve(webRoot, 'public/og.png'));
  await context.close();

  // 2) Vídeos curtos (≤ 15 s), 1280×720.
  const size = { width: 1280, height: 720 };
  async function record(name, now, run) {
    const tmp = path.join(mediaDir, 'videos', `_${name}`);
    const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: tmp, size }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const p = await ctx.newPage();
    p.on('dialog', (d) => void d.accept());
    await p.clock.install({ time: now });
    await run(p);
    const video = p.video();
    await ctx.close();
    renameSync(await video.path(), path.join(mediaDir, 'videos', `${name}.webm`));
    rmSync(tmp, { recursive: true, force: true });
    console.log('vídeo', name);
  }

  await record('modo-foco', STATS_NOW, async (p) => {
    await p.goto(`${BASE}/foco?fixture=stats`);
    await p.waitForTimeout(900);
    const field = p.getByRole('textbox', { name: 'Duração da sessão' });
    await field.click();
    await field.pressSequentially('50', { delay: 220 });
    await field.press('Enter');
    await p.waitForTimeout(700);
    await p.getByRole('button', { name: 'Travar', exact: true }).click();
    await p.waitForTimeout(700);
    await p.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await p.getByRole('button', { name: /Segurar para destravar/ }).waitFor();
    await p.waitForTimeout(3500);
    const hold = p.getByRole('button', { name: /Segurar para destravar/ });
    await hold.focus();
    await p.keyboard.down('Enter');
    await p.waitForTimeout(1400);
    await p.keyboard.up('Enter');
    await p.waitForTimeout(1200);
  });

  await record('habito-heatmap', STATS_NOW, async (p) => {
    await p.goto(`${BASE}/habitos?fixture=habits`);
    await p.waitForTimeout(1200);
    await p.getByRole('button', { name: 'Novo hábito' }).first().click();
    const dialog = p.getByRole('dialog', { name: 'Novo hábito' });
    await dialog.getByLabel('Nome').pressSequentially('Leitura', { delay: 120 });
    await p.waitForTimeout(600);
    await dialog.getByRole('button', { name: 'Criar hábito' }).click();
    await p.waitForTimeout(900);
    const check = p.getByRole('checkbox', { name: 'Leitura: feito hoje' });
    await check.scrollIntoViewIfNeeded();
    await p.waitForTimeout(600);
    await check.click();
    await p.waitForTimeout(2200);
  });

  await record('visoes-calendario', VIEWS_NOW, async (p) => {
    await p.goto(`${BASE}/calendario?fixture=views&visao=dia&data=2026-10-29`);
    await p.waitForTimeout(1500);
    for (const key of ['s', 'm', 'a']) {
      await p.keyboard.press(key);
      await p.waitForTimeout(2200);
    }
  });
} finally {
  await browser.close();
  await server.close();
}
console.log('Mídia gerada em', mediaDir);
