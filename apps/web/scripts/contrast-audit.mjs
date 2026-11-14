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
/**
 * `--social`: mede as telas do perfil social (Preferências → Perfil social e o assistente) e das
 * amizades (`/amigos`, a busca, os pedidos, os bloqueados e a denúncia) com uma sessão e um
 * Supabase simulados por interceptação (nunca um banco real).
 */
const social = process.argv.includes('--social');
/**
 * `--palette`: semeia um hábito e uma matéria para cada cor conhecida (13: as 8 do seletor e as da v4) e mede
 * Hábitos, Matérias, Perfil e a Semana do calendário (chips, pílulas, blocos, heatmap e anel).
 */
const paletteMode = process.argv.includes('--palette');
const PALETTE_KEYS = [
  'ciano',
  'petroleo',
  'gelo',
  'lilas',
  'fucsia',
  'rosa',
  'cinza',
  'vermelho',
  'laranja',
  'amarelo',
  'lima',
  'verde',
  'azul',
];
function paletteSnapshot() {
  const today = new Date();
  const key = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const since = key(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20));
  const habits = PALETTE_KEYS.map((color, order) => ({
    id: `h-${color}`,
    name: `Hábito ${color}`,
    icon: 'target',
    color,
    type: 'check',
    unit: '',
    source: 'manual',
    rules: [
      {
        since,
        repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
        target: null,
        time: null,
      },
    ],
    createdAt: `${since}T08:00:00`,
    archivedAt: null,
    endsOn: null,
    order,
  }));
  const habitLogs = [];
  for (const h of habits)
    for (let i = 1; i <= 14; i += 1) {
      if ((i + h.order) % 3 === 0) continue;
      const date = key(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
      habitLogs.push({
        id: `${h.id}:${date}`,
        habitId: h.id,
        date,
        value: 1,
        updatedAt: `${date}T09:00:00`,
      });
    }
  return {
    app: 'daily',
    version: 6,
    savedAt: today.toISOString(),
    data: {
      subjects: PALETTE_KEYS.map((color) => ({
        id: `s-${color}`,
        name: `Matéria ${color}`,
        color,
      })),
      events: [],
      preferences: {
        name: 'Ana',
        waterGoalMl: 2000,
        cupMl: 250,
        focusDurationSec: 1500,
        lockByDefault: false,
      },
      habits,
      habitLogs,
      waterLogs: [],
      focusSessions: [],
      restDays: [],
      exceptions: [],
      achievements: [],
      onboarding: { waterHabitCreated: true, achievementsSeededAt: '2026-01-01T00:00:00' },
    },
  };
}
const SOCIAL_USER = '11111111-1111-4111-8111-111111111111';
const SOCIAL_PROFILE = {
  user_id: SOCIAL_USER,
  username: 'ana.lima',
  display_name: 'Ana Lima',
  avatar_path: null,
  avatar_version: 0,
  discoverable: false,
  show_achievements: true,
  show_streaks: false,
  show_stats: false,
  created_at: '2026-11-15T10:00:00Z',
  social_enabled_at: '2026-11-15T10:00:00Z',
  disabled_at: null,
  username_changed_at: null,
};
async function socialContext(context, withProfile) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 365;
  const session = {
    access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: SOCIAL_USER, exp })}.x`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: 'r',
    user: {
      id: SOCIAL_USER,
      aud: 'authenticated',
      email: 'ana@teste.local',
      user_metadata: { full_name: 'Ana Lima' },
      app_metadata: {},
    },
  };
  await context.addInitScript((value) => {
    localStorage.setItem('sb-localhost-auth-token', value);
  }, JSON.stringify(session));
  await context.route('http://localhost:54321/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = (v) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) });
    if (path === '/rest/v1/profiles') return body(withProfile ? [SOCIAL_PROFILE] : []);
    if (path === '/rest/v1/profile_private')
      return body(withProfile ? [{ birth_month: '2000-05-01' }] : []);
    if (path === '/rest/v1/rpc/social_username_status') return body('ok');
    const pessoa = (id, username, nome) => ({ id, pessoa: id, username, nome });
    const BIA = pessoa('22222222-2222-4222-8222-222222222222', 'bia', 'Bia Souza');
    const CAIO = pessoa('33333333-3333-4333-8333-333333333333', 'caio', 'Caio Lima');
    const DUDA = pessoa('44444444-4444-4444-8444-444444444444', 'duda', 'Duda Reis');
    const EDU = pessoa('55555555-5555-4555-8555-555555555555', 'edu', 'Edu Alves');
    const FRIENDS = {
      '/rest/v1/rpc/social_listar_amigos': {
        status: 'ok',
        itens: [
          { ...BIA, tem_foto: false, versao_foto: 0, desde: '2026-11-15T10:00:00Z' },
          { ...EDU, tem_foto: false, versao_foto: 0, desde: '2026-11-15T10:00:00Z' },
        ],
      },
      '/rest/v1/rpc/social_listar_solicitacoes': {
        status: 'ok',
        recebidas: [{ ...CAIO, id: 7, criada: '2026-11-15T09:00:00Z' }],
        enviadas: [{ ...DUDA, id: 8, criada: '2026-11-15T09:00:00Z' }],
      },
      '/rest/v1/rpc/social_listar_bloqueados': {
        status: 'ok',
        itens: [{ id: 'z', username: 'zeca', nome: 'Zeca Dias', desde: '2026-11-15T10:00:00Z' }],
      },
      '/rest/v1/rpc/social_contar_solicitacoes_recebidas': { status: 'ok', total: 1 },
      '/rest/v1/rpc/social_buscar_perfis': {
        status: 'ok',
        itens: [
          { ...BIA, relacao: 'amigos' },
          { ...pessoa('6', 'bianca', 'Bianca Melo'), relacao: 'nenhuma' },
          { ...pessoa('7', 'bianor', 'Bianor Reis'), relacao: 'enviada' },
          { ...pessoa('8', 'bibi', 'Bibi Luz'), relacao: 'recebida' },
        ],
      },
    };
    if (withProfile && FRIENDS[path]) return body(FRIENDS[path]);
    if (path === '/rest/v1/user_data') return body([]);
    return body({});
  });
}
/** [rota, perfil já ativo?, ação] — a ação abre o estado medido. */
const SOCIAL_STATES = [
  [
    '/preferencias#gerenciar',
    true,
    async (p) => p.locator('#perfil-social').scrollIntoViewIfNeeded(),
  ],
  [
    '/preferencias#ativar',
    false,
    async (p) => p.locator('#perfil-social').scrollIntoViewIfNeeded(),
  ],
  [
    '/preferencias#termo',
    false,
    async (p) => {
      await p.getByRole('button', { name: 'Ativar perfil social' }).click();
      const w = p.getByRole('dialog', { name: 'Ativar perfil social' });
      await w.getByLabel('Data de nascimento').fill('2010-03-10');
      await w.getByRole('button', { name: 'Continuar' }).click();
    },
  ],
  [
    '/preferencias#arroba',
    false,
    async (p) => {
      await p.getByRole('button', { name: 'Ativar perfil social' }).click();
      const w = p.getByRole('dialog', { name: 'Ativar perfil social' });
      await w.getByLabel('Data de nascimento').fill('2000-03-10');
      await w.getByRole('button', { name: 'Continuar' }).click();
      await w.getByRole('checkbox', { name: /Li e concordo/ }).check({ force: true });
      await w.getByRole('button', { name: 'Continuar' }).click();
      await w.getByLabel('Seu @').fill('ana.lima');
      await p.waitForTimeout(900);
    },
  ],
  [
    '/preferencias#excluir',
    true,
    async (p) => {
      await p.getByRole('button', { name: 'Excluir perfil social' }).click();
    },
  ],
];
SOCIAL_STATES.push(
  ['/amigos#amigos', true, async (p) => p.getByRole('list', { name: 'Amigos' }).waitFor()],
  ['/amigos#solicitacoes', true, async (p) => p.getByRole('tab', { name: /Solicitações/ }).click()],
  ['/amigos#bloqueados', true, async (p) => p.getByRole('tab', { name: 'Bloqueados' }).click()],
  ['/amigos#convite', false, async (p) => p.getByText('Ative seu perfil social').waitFor()],
  [
    '/amigos#busca',
    true,
    async (p) => {
      await p.getByRole('button', { name: 'Buscar pessoas' }).first().click();
      await p.getByLabel('Buscar pelo @').fill('bi');
      await p.getByLabel('Buscar pelo @').fill('bia');
      await p.getByRole('list', { name: 'Resultados da busca' }).waitFor();
    },
  ],
  [
    '/amigos#denunciar',
    true,
    async (p) => {
      await p.getByRole('button', { name: 'Mais ações para @bia' }).click();
      await p.getByRole('menuitem', { name: 'Denunciar' }).click();
      await p.getByLabel('Assédio ou ameaça').check();
    },
  ],
  [
    '/amigos#bloquear',
    true,
    async (p) => {
      await p.getByRole('button', { name: 'Mais ações para @bia' }).click();
      await p.getByRole('menuitem', { name: 'Bloquear' }).click();
    },
  ],
);
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
  [
    '/perfil?fixture=stats#medalha',
    async (p) => p.locator('[data-achievement="maos-a-obra"]').click(),
  ],
  [
    '/perfil?fixture=stats#conquistas-filtro',
    async (p) => {
      await p.locator('#conquistas').scrollIntoViewIfNeeded();
      await p.getByRole('radio', { name: 'Em andamento' }).click();
    },
  ],
];
const PHONE_STATES = [
  [
    '/perfil?fixture=stats#medalha',
    async (p) => p.locator('[data-achievement="maos-a-obra"]').tap(),
  ],
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
  const targets = paletteMode
    ? ['/habitos', '/materias', '/perfil', `/calendario?visao=semana`]
    : social
      ? SOCIAL_STATES.map(([u]) => u)
      : phone
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
    const socialState = social ? SOCIAL_STATES.find(([u]) => u === url) : null;
    if (socialState) await socialContext(context, socialState[1]);
    if (paletteMode)
      await context.addInitScript(
        (snap) => {
          localStorage.setItem('daily:v6', JSON.stringify(snap.data));
          localStorage.setItem('daily:theme', snap.theme);
        },
        { data: paletteSnapshot(), theme: theme === 'light' ? 'claro' : 'escuro' },
      );
    const page = await context.newPage();
    await page.goto(`http://localhost:5196${url}`);
    if (socialState) {
      await page.waitForTimeout(800);
      await socialState[2](page);
      await page.waitForTimeout(400);
    }
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

    const rootSelector = all || social ? 'body' : 'main';
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
        // Controle desabilitado: a WCAG (1.4.3) isenta componentes inativos do contraste mínimo.
        if (el.closest(':disabled, [aria-disabled="true"]')) continue;
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
