import { expect, test, type Page } from '@playwright/test';

/** Celular, tablet e desktop (1280 é o mínimo aceito no desktop). */
const SIZES = [
  { name: 'celular', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

/** Rótulos fixos dos cartões (nunca conteúdo do usuário, que pode truncar com `title`). */
const PAGES = [
  { url: '/habitos?fixture=stats', labels: ['Sequência', 'Melhor', 'Taxa (90 dias)'] },
  {
    url: '/perfil?fixture=stats',
    labels: ['Automático: água do dia', 'Automático: tempo de foco', 'Concluído'],
  },
] as const;

/** Textos visíveis da página que estão cortados (reticências ou estouro horizontal). */
const truncated = (page: Page, labels: readonly string[]) =>
  page.evaluate((wanted) => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('main *')) {
      const text = el.textContent?.trim() ?? '';
      if (!wanted.includes(text) || !el.offsetParent) continue;
      const style = getComputedStyle(el);
      const cut =
        el.scrollWidth > el.clientWidth + 1 &&
        (style.textOverflow === 'ellipsis' || style.overflow === 'hidden');
      if (cut) out.push(text);
    }
    return out;
  }, labels);

for (const size of SIZES) {
  test.describe(`rótulos dos cartões sem truncar (${size.name})`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const { url, labels } of PAGES) {
      test(url, async ({ page }) => {
        await page.clock.install({ time: new Date('2026-11-10T10:30:00') });
        await page.goto(url);
        await expect(page.getByText(labels[0], { exact: true }).first()).toBeVisible();
        expect(await truncated(page, labels)).toEqual([]);
      });
    }
  });
}
