import { describe, expect, it } from 'vitest';
import { EVERY_DAY, habitLogId, habitSchema, restDayId, type Habit } from '@daily/shared';
import { createDataStore } from '../data/store';
import { memoryRepo } from '../data/test-utils';
import { shiftDay } from '../dates';
import { focusSecondsByDay, manualFocusSession } from '../focus/manual';
import { buildHabitContext, isRestDay } from './context';
import { dayState, rate, scheduledToday, streaks } from './engine';

const TODAY = '2026-11-10';
const NOW = new Date(2026, 10, 10, 9, 0);

const habit = (id = 'h'): Habit =>
  habitSchema.parse({
    id,
    name: 'Leitura',
    icon: 'book-open',
    color: 'ciano',
    type: 'check',
    unit: '',
    source: 'manual',
    rules: [{ since: '2026-11-01', repeat: EVERY_DAY, target: null, time: null }],
    createdAt: '2026-11-01T08:00:00',
    order: 0,
  });

const done = (h: Habit, date: string) => ({
  id: habitLogId(h.id, date),
  habitId: h.id,
  date,
  value: 1,
  updatedAt: `${date}T09:00:00`,
});
const rest = (habitId: string | null, date: string) => ({
  id: restDayId(habitId, date),
  habitId,
  date,
});

describe('dias de descanso', () => {
  const h = habit();
  // Feito de 01 a 09, exceto 05 (sem registro), e nada hoje.
  const days = ['01', '02', '03', '04', '06', '07', '08', '09'].map((d) => `2026-11-${d}`);
  const ctxWith = (restDays: ReturnType<typeof rest>[]) =>
    buildHabitContext(
      { habitLogs: days.map((d) => done(h, d)), waterLogs: [], focusSessions: [], restDays },
      TODAY,
    );

  it('sem descanso, o dia sem registro quebra a sequência', () => {
    expect(streaks(h, ctxWith([]))).toEqual({ current: 4, best: 4 });
  });

  it('descanso (deste hábito ou de todos) não quebra a sequência nem entra na taxa', () => {
    for (const r of [rest('h', '2026-11-05'), rest(null, '2026-11-05')]) {
      const ctx = ctxWith([r]);
      expect(isRestDay(ctx, 'h', '2026-11-05')).toBe(true);
      expect(dayState(h, '2026-11-05', ctx)).toBe('descanso');
      expect(streaks(h, ctx)).toEqual({ current: 8, best: 8 });
      expect(rate(h, ctx, 30)).toMatchObject({ done: 8, scheduled: 8, percent: 100 });
    }
  });

  it('descanso de outro hábito não vale para este', () => {
    expect(dayState(h, '2026-11-05', ctxWith([rest('outro', '2026-11-05')]))).toBe('perdido');
  });

  it('cumprir num dia de descanso conta como feito', () => {
    const ctx = buildHabitContext(
      {
        habitLogs: [done(h, '2026-11-09')],
        waterLogs: [],
        focusSessions: [],
        restDays: [rest('h', '2026-11-09')],
      },
      TODAY,
    );
    expect(dayState(h, '2026-11-09', ctx)).toBe('feito');
  });

  it('descanso hoje tira o hábito da lista de hoje; descanso futuro aparece como descanso', () => {
    const ctx = ctxWith([rest(null, TODAY), rest('h', shiftDay(TODAY, 3))]);
    expect(scheduledToday([h], ctx)).toEqual([]);
    expect(dayState(h, shiftDay(TODAY, 3), ctx)).toBe('descanso');
  });

  it('store: marca os próximos 30 dias, desfaz e remove os descansos do hábito excluído', () => {
    const { repo } = memoryRepo();
    const store = createDataStore(repo);
    const created = store.getState().createHabit(
      {
        name: 'Leitura',
        icon: 'book-open',
        color: 'ciano',
        type: 'check',
        unit: '',
        source: 'manual',
        repeat: EVERY_DAY,
        target: null,
        time: null,
        endsOn: null,
      },
      NOW,
    );
    const id = created!.id;
    const next30 = Array.from({ length: 30 }, (_, i) => shiftDay(TODAY, i));
    store.getState().setRestDays(id, next30, true);
    store.getState().setRestDays(id, next30, true); // idempotente
    expect(store.getState().restDays).toHaveLength(30);
    store.getState().setRestDays(id, [TODAY], false);
    expect(store.getState().restDays).toHaveLength(29);
    store.getState().setRestDays(null, [TODAY], true);
    store.getState().deleteHabit(id);
    expect(store.getState().restDays.map((r) => r.habitId)).toEqual([null]);
  });
});

describe('descanso no hábito de água', () => {
  const water = habitSchema.parse({
    id: 'agua',
    name: 'Água',
    icon: 'droplets',
    color: 'ciano',
    type: 'quantidade',
    unit: 'ml',
    source: 'agua',
    rules: [{ since: '2026-11-01', repeat: EVERY_DAY, target: 2000, time: null }],
    createdAt: '2026-11-01T08:00:00',
    order: 0,
  });
  const met = ['01', '02', '03', '04', '06', '07', '08', '09'].map((d) => `2026-11-${d}`);
  const ctxWith = (restDays: ReturnType<typeof rest>[], extra: string[] = []) =>
    buildHabitContext(
      {
        habitLogs: [],
        waterLogs: [...met, ...extra].map((date) => ({ id: date, date, ml: 2000, time: '10:00' })),
        focusSessions: [],
        restDays,
      },
      TODAY,
    );

  it('mesma regra dos outros: o dia de descanso não quebra a sequência nem entra na taxa', () => {
    expect(streaks(water, ctxWith([]))).toEqual({ current: 4, best: 4 });
    const ctx = ctxWith([rest('agua', '2026-11-05')]);
    expect(dayState(water, '2026-11-05', ctx)).toBe('descanso');
    expect(streaks(water, ctx)).toEqual({ current: 8, best: 8 });
    expect(rate(water, ctx, 30)).toMatchObject({ done: 8, scheduled: 8, percent: 100 });
  });

  it('descanso de todos os hábitos também vale para a água; bater a meta no descanso conta', () => {
    expect(dayState(water, '2026-11-05', ctxWith([rest(null, '2026-11-05')]))).toBe('descanso');
    const drank = ctxWith([rest('agua', '2026-11-05')], ['2026-11-05']);
    expect(dayState(water, '2026-11-05', drank)).toBe('feito');
  });
});

describe('hábito de água automático', () => {
  it('primeiro uso (dados vazios): cria uma vez, com a meta de água das preferências', () => {
    const { repo } = memoryRepo();
    const store = createDataStore(repo);
    store.getState().updatePreferences({ waterGoalMl: 2750 });
    store.getState().ensureWaterHabit(NOW);
    store.getState().ensureWaterHabit(NOW);
    const habits = store.getState().habits;
    expect(habits).toHaveLength(1);
    expect(habits[0]).toMatchObject({ name: 'Água', source: 'agua', type: 'quantidade' });
    expect(habits[0]?.rules[0]?.target).toBe(2750);
    expect(store.getState().onboarding.waterHabitCreated).toBe(true);
  });

  it('excluir não recria', () => {
    const { repo } = memoryRepo();
    const store = createDataStore(repo);
    store.getState().ensureWaterHabit(NOW);
    store.getState().deleteHabit(store.getState().habits[0]!.id);
    store.getState().ensureWaterHabit(NOW);
    expect(store.getState().habits).toEqual([]);
  });

  it('conta que já tem dados: só marca a flag, não cria', () => {
    const { repo } = memoryRepo();
    const store = createDataStore(repo);
    store.getState().createSubject({ name: 'Matemática', color: 'ciano' });
    store.getState().ensureWaterHabit(NOW);
    expect(store.getState().habits).toEqual([]);
    expect(store.getState().onboarding.waterHabitCreated).toBe(true);
  });

  it('conta nova (nuvem vazia): o local vazio ganha a água uma vez', () => {
    const { repo } = memoryRepo();
    const store = createDataStore(repo);
    store.getState().replaceAll(store.getState().snapshot());
    store.getState().ensureWaterHabit(NOW);
    expect(store.getState().habits).toHaveLength(1);
  });
});

describe('tempo de foco manual', () => {
  it('registra no dia escolhido, com nota e origem manual', () => {
    expect(manualFocusSession({ date: '2026-11-08', minutes: 45, note: ' Leitura ' })).toEqual({
      startedAt: '2026-11-08T12:00:00',
      plannedSec: 2700,
      actualSec: 2700,
      status: 'concluida',
      subjectId: null,
      examId: null,
      origin: 'manual',
      note: 'Leitura',
    });
  });

  it('soma cronômetro e manual por dia', () => {
    const { repo } = memoryRepo();
    const store = createDataStore(repo);
    store.getState().addFocusSession({
      id: 's1',
      startedAt: '2026-11-08T09:00:00',
      plannedSec: 1500,
      actualSec: 1500,
      status: 'concluida',
      subjectId: null,
      examId: null,
      origin: 'cronometro',
      note: '',
    });
    store.getState().addManualFocus({ date: '2026-11-08', minutes: 30, note: '' });
    store.getState().addManualFocus({ date: '2026-11-09', minutes: 10, note: '' });
    const byDay = focusSecondsByDay(store.getState().focusSessions);
    expect(byDay.get('2026-11-08')).toBe(1500 + 1800);
    expect(byDay.get('2026-11-09')).toBe(600);
  });
});
