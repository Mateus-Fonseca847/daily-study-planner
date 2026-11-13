import { expect, type Page } from '@playwright/test';

/**
 * Começa com os dados vazios **sem** o hábito “Água” automático (marca de primeiro uso já
 * cumprida). Para testes que precisam do estado vazio de Hábitos ou de uma lista exata.
 */
export async function withoutAutoWater(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem('daily:v4')) return;
    localStorage.setItem(
      'daily:v4',
      JSON.stringify({
        app: 'daily',
        version: 4,
        savedAt: '2026-11-01T00:00:00.000Z',
        data: {
          subjects: [],
          events: [],
          preferences: {
            name: '',
            waterGoalMl: 2000,
            cupMl: 250,
            focusDurationSec: 1500,
            lockByDefault: false,
          },
          habits: [],
          habitLogs: [],
          waterLogs: [],
          focusSessions: [],
          restDays: [],
          onboarding: { waterHabitCreated: true },
        },
      }),
    );
  });
}

/** Grava um snapshot v4 antes de o app carregar (só se ainda não houver dados). */
export async function seedSnapshot(page: Page, data: Record<string, unknown>): Promise<void> {
  await page.addInitScript((patch) => {
    if (localStorage.getItem('daily:v4')) return;
    const base = {
      subjects: [],
      events: [],
      preferences: {
        name: '',
        waterGoalMl: 2000,
        cupMl: 250,
        focusDurationSec: 1500,
        lockByDefault: false,
      },
      habits: [],
      habitLogs: [],
      waterLogs: [],
      focusSessions: [],
      restDays: [],
      onboarding: { waterHabitCreated: true },
    };
    localStorage.setItem(
      'daily:v4',
      JSON.stringify({ app: 'daily', version: 4, savedAt: 'x', data: { ...base, ...patch } }),
    );
  }, data);
}

/** Hábito manual de check, todo dia desde 01/11/2026, pronto para `seedSnapshot`. */
export const manualHabit = (id: string, name: string, order: number) => ({
  id,
  name,
  icon: 'target',
  color: 'ciano',
  type: 'check',
  unit: '',
  source: 'manual',
  rules: [
    {
      since: '2026-11-01',
      repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
      target: null,
      time: null,
    },
  ],
  createdAt: '2026-11-01T08:00:00',
  archivedAt: null,
  endsOn: null,
  order,
});

/** Caixa onde o anel de foco é desenhado e a área visível do corpo rolável que o contém. */
export interface RingFit {
  focused: string;
  focusVisible: boolean;
  ring: { top: number; right: number; bottom: number; left: number };
  scroller: { top: number; right: number; bottom: number; left: number };
}

/**
 * Mede o anel de foco do elemento focado: retângulo do elemento ajustado por
 * `outline-width + outline-offset` (negativo = anel interno), comparado à área visível do
 * ancestral mais próximo que corta o excesso (`overflow` diferente de `visible`).
 */
export async function focusRingFit(page: Page): Promise<RingFit> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = getComputedStyle(el);
    const grow = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    const r = el.getBoundingClientRect();
    let scroller: HTMLElement | null = el.parentElement;
    while (scroller && getComputedStyle(scroller).overflowY === 'visible') {
      scroller = scroller.parentElement;
    }
    const s = (scroller ?? document.documentElement).getBoundingClientRect();
    return {
      focused:
        (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ||
        el.getAttribute('aria-label') ||
        el.textContent?.trim().slice(0, 30) ||
        el.tagName,
      focusVisible: el.matches(':focus-visible'),
      ring: {
        top: r.top - grow,
        right: r.right + grow,
        bottom: r.bottom + grow,
        left: r.left - grow,
      },
      scroller: { top: s.top, right: s.right, bottom: s.bottom, left: s.left },
    };
  });
}

/** O anel de foco de cada campo cabe na área visível do corpo do painel (nada cortado). */
/**
 * Percorre um diálogo pelo teclado (Tab) e confere que o anel de foco de cada controle fica dentro
 * da área visível do corpo rolável: sem corte no topo, nos lados nem embaixo.
 */
export async function expectRingsInsideDialog(
  page: Page,
  dialog: ReturnType<Page['getByRole']>,
  tabs = 10,
): Promise<string[]> {
  await expect(dialog).toBeVisible();
  const seen: string[] = [];
  for (let i = 0; i < tabs; i += 1) {
    const fit = await focusRingFit(page);
    if (fit.focusVisible && (await dialog.locator(':focus').count()) > 0) {
      seen.push(fit.focused);
      const at = (side: string) => `${side} do anel de “${fit.focused}”`;
      expect.soft(fit.ring.top, at('topo')).toBeGreaterThanOrEqual(fit.scroller.top);
      expect.soft(fit.ring.left, at('esquerda')).toBeGreaterThanOrEqual(fit.scroller.left);
      expect.soft(fit.ring.right, at('direita')).toBeLessThanOrEqual(fit.scroller.right);
      expect.soft(fit.ring.bottom, at('base')).toBeLessThanOrEqual(fit.scroller.bottom);
    }
    await page.keyboard.press('Tab');
  }
  return seen;
}

/** Painel “Nova tarefa”: anéis dentro da área visível e Descrição/rodapé com a margem do conteúdo. */
export async function expectRingsInsidePanel(page: Page) {
  const panel = page.getByRole('dialog', { name: 'Nova tarefa' });
  await expect(panel).toBeVisible();
  const title = panel.getByLabel('Título', { exact: true });
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute('placeholder', 'Título');

  // Título (o primeiro campo, colado ao cabeçalho) e os seguintes, pelo teclado.
  const seen = await expectRingsInsideDialog(page, panel, 8);
  expect(seen[0]).toBe('Título');
  expect(seen.length).toBeGreaterThanOrEqual(4);

  // Descrição e rodapé com a mesma margem lateral do conteúdo (nada encosta na borda).
  const box = (await panel.boundingBox())!;
  const titleBox = (await title.boundingBox())!;
  const margin = box.x + box.width - (titleBox.x + titleBox.width);
  expect(margin).toBeGreaterThan(8);
  for (const target of [
    panel.getByLabel('Descrição'),
    panel.getByRole('button', { name: 'Criar tarefa' }),
  ]) {
    const b = (await target.boundingBox())!;
    expect(Math.abs(box.x + box.width - (b.x + b.width) - margin)).toBeLessThanOrEqual(1);
  }
}
