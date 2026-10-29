import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  type FocusSession,
  type StudyEvent,
  type WaterLog,
} from '@daily/shared';
import { createDataStore } from '../data/store';
import { block, exam, memoryRepo, subject } from '../data/test-utils';
import { focusAnalysis, hoursAnalysis, hoursBySubject, bucketsFor, periodRange } from './analysis';
import {
  buildIndex,
  examPrep,
  focusSecondsByDay,
  nextExam,
  studyHoursByDay,
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
const ev = (id: string, patch: Record<string, unknown>): StudyEvent =>
  ({
    id,
    type: 'estudo',
    title: id,
    start: `${TODAY}T10:00:00`,
    end: `${TODAY}T11:00:00`,
    subjectId: null,
    status: 'pendente',
    notes: '',
    examId: null,
    ...patch,
  }) as StudyEvent;
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
  blockId: null,
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

  it('planejado vs concluído conta estudo e revisão; ignora cancelados, provas e tarefas', () => {
    const events = [
      ev('a', { start: '2026-11-09T14:00:00', end: '2026-11-09T16:00:00', status: 'concluido' }),
      ev('b', {
        type: 'revisao',
        start: '2026-11-09T19:00:00',
        end: '2026-11-09T19:30:00',
        status: 'pendente',
      }),
      ev('c', { start: '2026-11-09T20:00:00', end: '2026-11-09T21:00:00', status: 'cancelado' }),
      exam('prova'),
      ev('d', { type: 'entrega', start: '2026-11-09T09:00:00', end: '2026-11-09T09:00:00' }),
      ev('fora', { start: '2026-11-23T10:00:00', end: '2026-11-23T11:00:00', status: 'concluido' }),
    ];
    const days = studyHoursByDay(events, weekDays(TODAY));
    expect(days[0]).toEqual({ day: '2026-11-09', plannedMin: 150, doneMin: 120 });
    expect(days.slice(1).every((d) => d.plannedMin === 0 && d.doneMin === 0)).toBe(true);
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
      block('bloco'),
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
        contents: Array.from({ length: total }, (_, i) => ({
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

describe('variação e períodos', () => {
  it('variação em relação ao período anterior', () => {
    expect(variation(120, 100)).toEqual({ delta: 20, percent: 20 });
    expect(variation(90, 100)).toEqual({ delta: -10, percent: -10 });
    expect(variation(50, 0)).toEqual({ delta: 50, percent: null });
    expect(variation(0, 0)).toEqual({ delta: 0, percent: null });
  });

  it('períodos terminam hoje e o anterior vem logo antes, com o mesmo tamanho', () => {
    const { days, previous } = periodRange('semana', TODAY);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(TODAY);
    expect(days[0]).toBe('2026-11-04');
    expect(previous).toHaveLength(7);
    expect(previous[6]).toBe('2026-11-03');
    expect(periodRange('mes', TODAY).days).toHaveLength(30);
    expect(periodRange('90d', TODAY).days).toHaveLength(90);
  });

  it('90 dias agrupa por semana; semana e mês, por dia', () => {
    expect(bucketsFor('semana', periodRange('semana', TODAY).days)).toHaveLength(7);
    expect(bucketsFor('mes', periodRange('mes', TODAY).days)).toHaveLength(30);
    const weekly = bucketsFor('90d', periodRange('90d', TODAY).days);
    expect(weekly).toHaveLength(13);
    expect(weekly.reduce((t, b) => t + b.days.length, 0)).toBe(90);
  });
});

describe('análises', () => {
  it('horas estudadas: totais e variação contra o período anterior', () => {
    const events = [
      ev('atual', {
        start: '2026-11-09T10:00:00',
        end: '2026-11-09T12:00:00',
        status: 'concluido',
      }),
      ev('plan', { start: '2026-11-10T10:00:00', end: '2026-11-10T11:00:00' }),
      ev('antes', {
        start: '2026-11-01T10:00:00',
        end: '2026-11-01T11:00:00',
        status: 'concluido',
      }),
    ];
    const result = hoursAnalysis(events, 'semana', TODAY);
    expect(result).toMatchObject({ doneMin: 120, plannedMin: 180 });
    expect(result.variation).toEqual({ delta: 60, percent: 100 });
    expect(result.items).toHaveLength(7);
    expect(hoursAnalysis([], 'mes', TODAY)).toMatchObject({ doneMin: 0, plannedMin: 0 });
  });

  it('tempo focado: total do período, concluídas vs interrompidas', () => {
    const sessions = [
      session('2026-11-09', 1500),
      session('2026-11-10', 600, 'interrompida'),
      session('2026-10-01', 900),
    ];
    const week = focusAnalysis(sessions, 'semana', TODAY);
    expect(week).toMatchObject({ totalSec: 2100, concluded: 1, interrupted: 1 });
    expect(focusAnalysis(sessions, '90d', TODAY).totalSec).toBe(3000);
    expect(focusAnalysis([], 'semana', TODAY).items.every((i) => i.value === 0)).toBe(true);
  });

  it('horas por matéria: só blocos de estudo concluídos, da maior para a menor', () => {
    const events = [
      ev('a', {
        subjectId: 'mat',
        status: 'concluido',
        start: '2026-11-09T10:00:00',
        end: '2026-11-09T12:00:00',
      }),
      ev('b', {
        subjectId: 'fis',
        status: 'concluido',
        start: '2026-11-09T14:00:00',
        end: '2026-11-09T14:30:00',
      }),
      ev('c', { subjectId: 'fis', status: 'pendente' }),
      ev('d', { type: 'revisao', subjectId: 'fis', status: 'concluido' }),
    ];
    const rows = hoursBySubject(
      events,
      [subject('mat'), subject('fis'), subject('qui')],
      weekDays(TODAY),
    );
    expect(rows.map((r) => [r.subject.id, r.minutes])).toEqual([
      ['mat', 120],
      ['fis', 30],
    ]);
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
