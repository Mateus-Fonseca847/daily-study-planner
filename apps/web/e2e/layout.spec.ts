import { expect, test } from '@playwright/test';

/** Quinta-feira, 29/10/2026. */
const NOW = new Date('2026-10-29T10:30:00');

const ROUTES = [
  ['calendário', '/calendario?fixture=views'],
  ['provas', '/provas?fixture=views'],
  ['tarefas', '/tarefas?fixture=views'],
  ['matérias', '/materias?fixture=views'],
  ['blocos', '/blocos?fixture=views'],
  ['hábitos', '/habitos?fixture=habits'],
  ['foco', '/foco?fixture=focus'],
  ['estatísticas', '/estatisticas?fixture=stats'],
] as const;

/** Os quatro tamanhos pedidos e os equivalentes em CSS px de zoom 67 % e 150 % do navegador. */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1280, height: 500 },
  { width: 2880, height: 1620 },
  { width: 853, height: 480 },
];

interface LayoutMetrics {
  innerHeight: number;
  docScrollHeight: number;
  bodyScrollHeight: number;
  shellBottom: number;
  asideBottom: number | null;
  bottomRowOwners: string[];
  lastBottom: number;
  scrollerBottom: number;
}

test.describe('AppShell preenche a janela', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  for (const [name, url] of ROUTES) {
    test(`/${name}: sidebar até o fim, documento sem rolagem e conteúdo alcançável`, async ({
      page,
    }) => {
      await page.goto(url);
      await page.locator('main').waitFor();

      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(150);
        const label = `${viewport.width}×${viewport.height}`;

        const m = await page.evaluate((): LayoutMetrics => {
          const main = document.querySelector('main')!;
          const shell = main.parentElement!;
          const aside = document.querySelector('aside');

          // Rola todas as áreas roláveis do conteúdo até o fim.
          const scrollers = [main, ...main.querySelectorAll<HTMLElement>('*')].filter((el) => {
            const overflowY = getComputedStyle(el).overflowY;
            return (
              (overflowY === 'auto' || overflowY === 'scroll') &&
              el.scrollHeight > el.clientHeight + 1
            );
          });
          scrollers.forEach((el) => {
            el.scrollTop = el.scrollHeight;
          });

          // Maior área rolável (ou a própria `main`) e o último elemento visível dentro dela.
          const area =
            [...main.querySelectorAll<HTMLElement>('*')]
              .filter((el) => scrollers.includes(el))
              .sort((a, b) => b.clientHeight - a.clientHeight)[0] ?? main;
          let last: Element = area;
          for (;;) {
            const next = [...last.children].reverse().find((child) => {
              const r = child.getBoundingClientRect();
              const position = getComputedStyle(child).position;
              return r.width > 1 && r.height > 1 && position !== 'absolute' && position !== 'fixed';
            });
            if (!next) break;
            last = next;
          }

          // Quem ocupa a última linha de pixels da janela? Nunca html, body ou #root.
          const owners = [0.02, 0.25, 0.5, 0.75, 0.98].map((fraction) => {
            const el = document.elementFromPoint(
              Math.floor(window.innerWidth * fraction),
              window.innerHeight - 1,
            );
            return el ? el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') : 'null';
          });

          return {
            innerHeight: window.innerHeight,
            docScrollHeight: document.documentElement.scrollHeight,
            bodyScrollHeight: document.body.scrollHeight,
            shellBottom: shell.getBoundingClientRect().bottom,
            asideBottom: aside ? aside.getBoundingClientRect().bottom : null,
            bottomRowOwners: owners,
            lastBottom: last.getBoundingClientRect().bottom,
            scrollerBottom: area.getBoundingClientRect().bottom,
          };
        });

        // (a) a sidebar vai até o último pixel (no modo travado do foco ela não existe).
        if (m.asideBottom !== null) {
          expect(m.asideBottom, `${label}: base da sidebar`).toBe(m.innerHeight);
        }
        // (b) o documento não rola.
        expect(m.docScrollHeight, `${label}: scrollHeight do documento`).toBe(m.innerHeight);
        expect(m.bodyScrollHeight, `${label}: scrollHeight do body`).toBe(m.innerHeight);
        // (c) nenhum pixel do fundo do body entre o fim do AppShell e o fim da janela.
        expect(m.shellBottom, `${label}: base do AppShell`).toBe(m.innerHeight);
        for (const owner of m.bottomRowOwners) {
          expect(owner, `${label}: última linha da janela`).not.toMatch(
            /^(html|body|null|div#root)$/,
          );
        }
        // (d) o último item do conteúdo fica visível depois de rolar a área de conteúdo.
        expect(m.lastBottom, `${label}: último item × janela`).toBeLessThanOrEqual(
          m.innerHeight + 1,
        );
        expect(m.lastBottom, `${label}: último item × área rolável`).toBeLessThanOrEqual(
          m.scrollerBottom + 1,
        );
      }
    });
  }

  test('modo travado do Foco: sem sidebar nem topbar, conteúdo preenche e centraliza', async ({
    page,
  }) => {
    await page.goto('/foco?fixture=focus');
    await page.locator('main').waitFor();
    await expect(page.locator('aside')).toHaveCount(0);
    await expect(page.locator('header')).toHaveCount(0);

    for (const viewport of VIEWPORTS.slice(0, 3)) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      const { mainHeight, innerHeight, centerOffset } = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        const block = main.querySelector('.focus-layout')!.getBoundingClientRect();
        return {
          mainHeight: main.getBoundingClientRect().height,
          innerHeight: window.innerHeight,
          centerOffset: Math.abs(block.top + block.height / 2 - window.innerHeight / 2),
        };
      });
      expect(mainHeight).toBe(innerHeight);
      expect(centerOffset).toBeLessThanOrEqual(2);
    }
  });
});
