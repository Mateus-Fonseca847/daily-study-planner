import type { Page } from '@playwright/test';

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
