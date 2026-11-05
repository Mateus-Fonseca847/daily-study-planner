import { describe, expect, it } from 'vitest';
import { createDataStore } from '../data/store';
import { memoryRepo } from '../data/test-utils';
import { logsOfDay, planDayTotal, totalMl } from './day';

const setup = () => createDataStore(memoryRepo().repo);
const DAY = '2026-11-10';

describe('setWaterDay', () => {
  it('cria, atualiza e remove registros só do dia pedido', () => {
    const store = setup();
    store.getState().setWaterDay(DAY, [
      { date: DAY, ml: 250, time: '08:00' },
      { date: DAY, ml: 500, time: '12:00' },
    ]);
    store.getState().setWaterDay('2026-11-09', [{ date: '2026-11-09', ml: 300, time: '10:00' }]);
    const [a, b] = logsOfDay(store.getState().waterLogs, DAY);
    expect(totalMl(logsOfDay(store.getState().waterLogs, DAY))).toBe(750);

    // Edita o primeiro, remove o segundo, acrescenta um novo.
    store.getState().setWaterDay(DAY, [
      { ...a!, ml: 300 },
      { date: DAY, ml: 200, time: '18:00' },
    ]);
    const after = logsOfDay(store.getState().waterLogs, DAY);
    expect(after.map((l) => l.ml)).toEqual([300, 200]);
    expect(after.map((l) => l.id)).not.toContain(b!.id);
    expect(after[0]!.id).toBe(a!.id); // mesmo id: edição, não recriação
    expect(logsOfDay(store.getState().waterLogs, '2026-11-09')).toHaveLength(1);
  });

  it('desfazer: reenviar o estado anterior devolve os mesmos registros e ids', () => {
    const store = setup();
    store.getState().setWaterDay(DAY, [
      { date: DAY, ml: 250, time: '08:00' },
      { date: DAY, ml: 250, time: '12:00' },
      { date: DAY, ml: 250, time: '18:00' },
    ]);
    const before = logsOfDay(store.getState().waterLogs, DAY);
    const plan = planDayTotal(before, DAY, 250, '20:00');
    store.getState().setWaterDay(DAY, plan.next);
    expect(totalMl(logsOfDay(store.getState().waterLogs, DAY))).toBe(250);

    store.getState().setWaterDay(DAY, before);
    expect(logsOfDay(store.getState().waterLogs, DAY)).toEqual(before);
  });

  it('o total entra no contexto dos hábitos: o hábito de água recalcula', async () => {
    const { buildHabitContext } = await import('../habits/context');
    const store = setup();
    store.getState().setWaterDay(DAY, [{ date: DAY, ml: 1500, time: '09:00' }]);
    const s = store.getState();
    const ctx = buildHabitContext(
      {
        habitLogs: s.habitLogs,
        waterLogs: s.waterLogs,
        focusSessions: s.focusSessions,
        events: s.events,
      },
      DAY,
    );
    expect(ctx.waterMl.get(DAY)).toBe(1500);
    store.getState().setWaterDay(DAY, []);
    const t = store.getState();
    const empty = buildHabitContext(
      {
        habitLogs: t.habitLogs,
        waterLogs: t.waterLogs,
        focusSessions: t.focusSessions,
        events: t.events,
      },
      DAY,
    );
    expect(empty.waterMl.get(DAY) ?? 0).toBe(0);
  });
});
