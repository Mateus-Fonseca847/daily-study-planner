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
