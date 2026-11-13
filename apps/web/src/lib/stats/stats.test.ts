import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  type FocusSession,
  type WaterLog,
} from '@daily/shared';
import { createDataStore } from '../data/store';
import { timedTask, exam, memoryRepo } from '../data/test-utils';
import {
  buildIndex,
  examPrep,
  focusSecondsByDay,
  nextExam,
  upcomingPreps,
  variation,
  waterOn,
  waterPercent,
  weekDays,
  type StatsData,
} from './derive';
import { formatDays, formatHours, formatLiters, formatVariation, percentOf } from './format';

const TODAY = '2026-11-10'; // terça-feira
const NOW = new Date(2026, 10, 10, 10, 30);

const make = (patch: Partial<StatsData> = {}): StatsData => ({
  events: [],
  habits: [],
  habitLogs: [],
  waterLogs: [],
  focusSessions: [],
  preferences: { ...DEFAULT_PREFERENCES },
  ...patch,
});
const water = (date: string, ml: number, id = `${date}-${ml}`): WaterLog => ({
  id,
  date,
  ml,
  time: '08:00',
});
const session = (
  day: string,
  sec: number,
  status: 'concluida' | 'interrompida' = 'concluida',
): FocusSession => ({
  id: `${day}-${sec}-${status}`,
  startedAt: `${day}T09:00:00`,
  plannedSec: sec,
  actualSec: sec,
  status,
  subjectId: null,
  examId: null,
  origin: 'cronometro' as const,
  note: '',
});
/** Cumpre as 2 metas manuais num dia. */
describe('formatação', () => {
  it('litros em pt-BR, sem zeros sobrando', () => {
    expect(formatLiters(0)).toBe('0 L');
    expect(formatLiters(700)).toBe('0,7 L');
    expect(formatLiters(2000)).toBe('2 L');
    expect(formatLiters(1250)).toBe('1,25 L');
    expect(formatLiters(2500)).toBe('2,5 L');
  });

  it('horas: 0h, minutos, 8h e 8h30', () => {
    expect(formatHours(0)).toBe('0h');
    expect(formatHours(45)).toBe('45min');
    expect(formatHours(60)).toBe('1h');
    expect(formatHours(480)).toBe('8h');
    expect(formatHours(510)).toBe('8h30');
    expect(formatHours(65)).toBe('1h05');
    expect(formatHours(-5)).toBe('0h');
  });

  it('percentuais, dias e variação', () => {
    expect(percentOf(3, 5)).toBe(60);
    expect(percentOf(7, 5)).toBe(100);
    expect(percentOf(7, 5, false)).toBe(140);
    expect(percentOf(1, 0)).toBe(0);
    expect(formatDays(1)).toBe('1 dia');
    expect(formatDays(5)).toBe('5 dias');
    expect(formatVariation(20)).toBe('+20 % vs. período anterior');
    expect(formatVariation(-10)).toBe('−10 % vs. período anterior');
    expect(formatVariation(0)).toBe('sem mudança');
    expect(formatVariation(null)).toBe('sem período anterior');
  });
});

describe('semana e horas', () => {
  it('a semana vai de segunda a domingo, de qualquer dia dela', () => {
    const expected = [
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ];
    expect(weekDays('2026-11-10')).toEqual(expected);
    expect(weekDays('2026-11-09')).toEqual(expected); // segunda
    expect(weekDays('2026-11-15')).toEqual(expected); // domingo
    expect(weekDays('2026-11-16')[0]).toBe('2026-11-16'); // virada de semana
  });


  it('tempo focado por dia soma sessões (concluídas e interrompidas)', () => {
    const sessions = [
      session('2026-11-09', 1500),
      session('2026-11-09', 600, 'interrompida'),
      session('2026-11-20', 900),
    ];
    const rows = focusSecondsByDay(sessions, weekDays(TODAY));
    expect(rows[0]).toEqual({ day: '2026-11-09', seconds: 2100 });
    expect(rows.reduce((t, r) => t + r.seconds, 0)).toBe(2100);
  });
});

describe('água', () => {
  it('soma por dia e calcula a % da meta (limitada a 100)', () => {
    const index = buildIndex(
      make({
        waterLogs: [water(TODAY, 250, 'a'), water(TODAY, 450, 'b'), water('2026-11-09', 2500)],
      }),
    );
    expect(waterOn(index, TODAY)).toBe(700);
    expect(waterOn(index, '2026-11-08')).toBe(0);
    expect(waterPercent(700, 2000)).toBe(35);
    expect(waterPercent(3000, 2000)).toBe(100);
    expect(waterPercent(500, 0)).toBe(0);
  });
});

describe('próxima prova e preparação', () => {
  const soon = (id: string, patch: Record<string, unknown> = {}) =>
    exam(id, 'mat', { start: '2026-11-14T09:30:00', end: '2026-11-14T11:30:00', ...patch });

  it('é a primeira prova futura que não foi cancelada', () => {
    const events = [
      soon('passada', { start: '2026-11-01T09:00:00', end: '2026-11-01T11:00:00' }),
      soon('cancelada', {
        status: 'cancelado',
        start: '2026-11-12T09:00:00',
        end: '2026-11-12T10:00:00',
      }),
      soon('longe', { start: '2026-12-01T09:00:00', end: '2026-12-01T10:00:00' }),
      soon('perto'),
      timedTask('bloco'),
    ];
    expect(nextExam(events, NOW)?.id).toBe('perto');
    expect(upcomingPreps(events, NOW, 5).map((p) => p.exam.id)).toEqual(['perto', 'longe']);
    expect(upcomingPreps(events, NOW, 1)).toHaveLength(1);
  });

  it('sem prova: indefinida; prova em andamento ainda conta', () => {
    expect(nextExam([], NOW)).toBeUndefined();
    expect(
      nextExam([soon('x', { start: '2026-11-10T09:00:00', end: '2026-11-10T12:00:00' })], NOW)?.id,
    ).toBe('x');
  });

  it('preparação: % de conteúdos concluídos; sem conteúdos = 0 % com dica', () => {
    const done = (n: number, total: number) =>
      soon('p', {
        subtasks: Array.from({ length: total }, (_, i) => ({
          id: `c${i}`,
          title: `C${i}`,
          done: i < n,
          order: i,
        })),
      });
    expect(examPrep(done(3, 5))).toMatchObject({ done: 3, total: 5, percent: 60, hint: null });
    expect(examPrep(done(0, 4)).percent).toBe(0);
    expect(examPrep(done(4, 4)).percent).toBe(100);
    expect(examPrep(done(0, 0))).toMatchObject({
      total: 0,
      percent: 0,
      hint: 'Adicione conteúdos',
    });
  });
});

describe('variação', () => {
  it('variação em relação ao período anterior', () => {
    expect(variation(120, 100)).toEqual({ delta: 20, percent: 20 });
    expect(variation(90, 100)).toEqual({ delta: -10, percent: -10 });
    expect(variation(50, 0)).toEqual({ delta: 50, percent: null });
    expect(variation(0, 0)).toEqual({ delta: 0, percent: null });
  });


});


describe('ações de água no store', () => {
  const setup = () => {
    const { repo, storage } = memoryRepo();
    return { store: createDataStore(repo), storage };
  };
  const today = new Date(2026, 10, 10, 9, 5);

  it('adiciona um copo (tamanho das preferências), com data e horário locais, e remove', () => {
    const { store } = setup();
    store.getState().updatePreferences({ cupMl: 300 });
    const log1 = store.getState().addWater(today);
    store.getState().addWater(today);
    expect(log1).toMatchObject({ date: '2026-11-10', ml: 300, time: '09:05' });
    expect(store.getState().waterLogs).toHaveLength(2);
    expect(waterOn(buildIndex({ ...make(), waterLogs: store.getState().waterLogs }), TODAY)).toBe(
      600,
    );

    store.getState().removeWater(log1?.id ?? '');
    expect(store.getState().waterLogs).toHaveLength(1);
  });
});
