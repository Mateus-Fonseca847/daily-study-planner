/**
 * Auditoria de contraste (WCAG AA) do texto da página do Perfil e do Modo Foco: para cada
 * elemento com texto, lê a cor e o tamanho, e mede o fundo REAL renderizado (texto escondido +
 * captura do pixel). Uso: `node scripts/contrast-audit.mjs [rotulo]` → apps/web/.reports/contrast-<rotulo>.json (pasta ignorada pelo Git)
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const outDir = path.resolve(webRoot, '.reports');
process.env.VITE_SUPABASE_URL ??= 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY ??= 'test-key';
const label = process.argv[2]?.startsWith('--') ? 'audit' : (process.argv[2] ?? 'audit');
/** `--phone`: mede o layout de celular (390×844, toque), inclusive o sheet “Mais” e o menu Criar. */
const phone = process.argv.includes('--phone');
/** `--theme=light|dark`: o tema medido (pelo `prefers-color-scheme`; a instalação nova segue o sistema). */
const theme = /--theme=(light|dark)/.exec(process.argv.join(' '))?.[1] ?? 'dark';
/**
 * `--all`: mede a página inteira (sidebar, topbar, painéis, menus e toasts, não só o `<main>`) e
 * acrescenta estados abertos e de interação no desktop (foco, hover, selecionado, painel, menu, toast).
 */
const all = process.argv.includes('--all');
const DESKTOP_STATES = [
  [
    '/calendario?visao=semana&data=2026-10-29&fixture=views#painel',
    async (p) => p.getByRole('button', { name: 'Nova tarefa' }).first().click(),
  ],
  [
    '/calendario?visao=mes&data=2026-10-29&fixture=views#menu-criar',
    async (p) => p.getByRole('button', { name: 'Criar', exact: true }).first().click(),
  ],
  [
    '/calendario?visao=mes&data=2026-10-29&fixture=views#foco-teclado',
    async (p) => {
      for (let i = 0; i < 6; i += 1) await p.keyboard.press('Tab');
    },
  ],
  [
    '/calendario?visao=mes&data=2026-10-29&fixture=views#hover',
    async (p) =>
      p
        .getByRole('link', { name: /Provas/ })
        .first()
        .hover(),
  ],
  [
    '/tarefas?fixture=views#toast',
    async (p) =>
      p
        .getByRole('button', { name: /^Concluir/ })
        .first()
        .click(),
  ],
  [
    '/perfil?fixture=stats#modal',
    async (p) => p.getByRole('button', { name: 'Registrar tempo' }).first().click(),
  ],
  [
    '/habitos?fixture=habits#dia',
    async (p) => p.locator('[data-date="2026-11-09"]').first().click(),
  ],
];
const PHONE_STATES = [
  [
    '/calendario?visao=mes&data=2026-10-29&fixture=views#mais',
    async (p) => p.getByRole('button', { name: 'Mais', exact: true }).tap(),
  ],
  [
    '/calendario?visao=semana&data=2026-10-29&fixture=views#criar',
    async (p) => p.getByRole('button', { name: 'Criar', exact: true }).tap(),
  ],
  ['/habitos?fixture=habits#dia', async (p) => p.locator('[data-date="2026-11-09"]').first().tap()],
];
const PAGES = [
  '/perfil?fixture=stats',
  '/foco?fixture=stats',
  '/habitos?fixture=habits',
  ...['dia', 'semana', 'mes', 'ano'].map(
    (v) => `/calendario?visao=${v}&data=2026-10-29&fixture=views`,
  ),
];

const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

mkdirSync(outDir, { recursive: true });
const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { port: 5196, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
const results = [];
try {
  const targets = phone
    ? [
        ...PAGES,
        '/provas?fixture=views',
        '/tarefas?fixture=views',
        '/materias?fixture=views',
        '/preferencias?fixture=stats',
        '/entrar',
        '/privacidade',
        ...PHONE_STATES.map(([u]) => u),
      ]
    : all
      ? [
          ...PAGES,
          '/provas?fixture=views',
          '/tarefas?fixture=views',
          '/materias?fixture=views',
          '/preferencias?fixture=stats',
          '/entrar',
          '/privacidade',
          ...DESKTOP_STATES.map(([u]) => u),
        ]
      : PAGES;
  for (const url of targets) {
    const context = await browser.newContext({
      colorScheme: theme,
      ...(phone
        ? {
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
            deviceScaleFactor: 1,
          }
        : { viewport: { width: 1920, height: 1080 } }),
    });
    const page = await context.newPage();
    await page.goto(`http://localhost:5196${url}`);
    await page.waitForTimeout(600);
    const state = (phone ? PHONE_STATES : DESKTOP_STATES).find(([u]) => u === url);
    if (state) {
      await state[1](page);
      await page.waitForTimeout(400);
    }
    // Mostra a página inteira para medir tudo de uma vez.
    const scroller = page.locator('main > div.overflow-y-auto');
    // Páginas com rolagem interna (calendário) são medidas na janela, sem expandir.
    // (Com um estado aberto, a janela fica como está: painéis e menus dependem dela.)
    if (!state && (await scroller.count()) > 0) {
      const height = await scroller.evaluate((el) => el.scrollHeight);
      await page.setViewportSize({ width: phone ? 390 : 1920, height: height + 90 });
    }
    await page.waitForTimeout(300);

    const rootSelector = all ? 'body' : 'main';
    const items = await page.evaluate((rootSelector) => {
      const out = [];
      const walker = document.createTreeWalker(
        document.querySelector(rootSelector),
        NodeFilter.SHOW_TEXT,
      );
      const seen = new Set();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || seen.has(el) || !node.textContent.trim()) continue;
        if (el.closest('.sr-only')) continue;
        seen.add(el);
        // Texto coberto por outro elemento (ex.: rolado para trás do cabeçalho fixo) não é visível.
        {
          const r = document.createRange();
          r.selectNodeContents(node);
          const b = r.getBoundingClientRect();
          const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
          if (!hit || !(el.contains(hit) || hit.contains(el))) continue;
        }
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect(); // só a área do texto, não a do elemento
        if (rect.width === 0 || rect.height === 0) continue;
        // Texto rolado para fora de um contêiner com rolagem (ex.: horas da agenda) não está visível.
        let clipped = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (
            /(auto|scroll)/.test(o.overflowY) &&
            p.scrollHeight > p.clientHeight + 1 &&
            p.tagName !== 'MAIN' &&
            !p.matches('main > div.overflow-y-auto')
          ) {
            const pr = p.getBoundingClientRect();
            if (rect.bottom > pr.bottom + 1 || rect.top < pr.top - 1) clipped = true;
          }
        }
        if (clipped) continue;
        const style = getComputedStyle(el);
        const opacity = Number(style.opacity);
        out.push({
          text: node.textContent.trim().slice(0, 40),
          color: style.color,
          size: parseFloat(style.fontSize),
          weight: Number(style.fontWeight),
          opacity,
          box: { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height },
        });
      }
      return out;
    }, rootSelector);

    // Fundo real: esconde todo o texto e amostra o centro de cada caixa.
    await page.addStyleTag({
      content:
        '* { color: transparent !important; -webkit-text-fill-color: transparent !important; }',
    });
    await page.waitForTimeout(100);
    const shot = await page.screenshot({ fullPage: true });
    const bgs = await page.evaluate(
      async ({ data, boxes }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return boxes.map((b) => {
          const x = Math.round(Math.min(img.width - 1, Math.max(0, b.x + b.width / 2)));
          const y = Math.round(Math.min(img.height - 1, Math.max(0, b.y + b.height / 2)));
          // Amostra 5 pontos ao longo da caixa e usa o pior (mais claro) fundo.
          const pts = [0.1, 0.3, 0.5, 0.7, 0.9].map(
            (t) => ctx.getImageData(Math.round(b.x + b.width * t), y, 1, 1).data,
          );
          void x;
          return pts.map((p) => [p[0], p[1], p[2]]);
        });
      },
      { data: shot.toString('base64'), boxes: items.map((i) => i.box) },
    );

    items.forEach((item, i) => {
      // `rgb(r g b / a)` (0–255) ou `color(srgb r g b / a)` (0–1, o que sai de um color-mix).
      const nums = item.color.match(/[\d.]+/g).map(Number);
      const m = item.color.startsWith('color(')
        ? [...nums.slice(0, 3).map((v) => Math.round(v * 255)), ...nums.slice(3)]
        : nums;
      const alpha = m[3] ?? 1;
      const eff = alpha * item.opacity;
      let worst = Infinity;
      for (const bg of bgs[i]) {
        const fg = [0, 1, 2].map((k) => Math.round(m[k] * eff + bg[k] * (1 - eff)));
        worst = Math.min(worst, ratio(fg, bg));
      }
      const large = item.size >= 24 || (item.size >= 18.66 && item.weight >= 700);
      const min = large ? 3 : 4.5;
      results.push({
        page: url.split('?')[0] + (url.includes('#') ? '#' + url.split('#')[1] : ''),
        text: item.text,
        box: item.box,
        size: Math.round(item.size * 10) / 10,
        color: item.color,
        ratio: Math.round(worst * 100) / 100,
        required: min,
        pass: worst >= min,
      });
    });
    await page.context().close();
  }
} finally {
  await browser.close();
  await server.close();
}
const failing = results.filter((r) => !r.pass).sort((a, b) => a.ratio - b.ratio);
const byPage = {};
for (const r of results) byPage[r.page] = Math.min(byPage[r.page] ?? Infinity, r.ratio);
const lowest = [...results].sort((a, b) => a.ratio - b.ratio).slice(0, 8);
writeFileSync(
  path.join(outDir, `contrast-${label}.json`),
  JSON.stringify({ total: results.length, minRatioByPage: byPage, lowest, failing }, null, 2),
);
console.log('menor razão por página', byPage);
console.log(`total ${results.length}, reprovados ${failing.length}`);
for (const f of failing.slice(0, 25))
  console.log(f.ratio, f.size, f.color, JSON.stringify(f.text), f.page);
