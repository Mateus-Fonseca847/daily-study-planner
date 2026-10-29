import { describe, expect, it } from 'vitest';
import {
  defaultGoals,
  goalLogId,
  DEFAULT_PREFERENCES,
  type Goal,
  type GoalLog,
  type FocusSession,
  type StudyEvent,
  type WaterLog,
} from '@daily/shared';
import { createDataStore } from '../data/store';
import { LocalStorageRepository } from '../data/local-storage-repository';
import { block, exam, memoryRepo, subject } from '../data/test-utils';
import {
  focusAnalysis,
  goalsHeatmap,
  hoursAnalysis,
  hoursBySubject,
  bucketsFor,
  periodRange,
  waterAnalysis,
} from './analysis';
import {
  buildIndex,
  computeStreaks,
  examPrep,
  focusSecondsByDay,
  goalsSummary,
  goalStates,
  isGoalActiveOn,
  MAX_STREAK_LOOKBACK_DAYS,
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
const CREATED = '2026-01-01T08:00:00';

const goals = (): Goal[] => defaultGoals(CREATED);
const make = (patch: Partial<StatsData> = {}): StatsData => ({
  events: [],
  goals: goals(),
  goalLogs: [],
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
const log = (goalId: string, date: string, done = true): GoalLog => ({
  id: goalLogId(goalId, date),
  goalId,
  date,
  done,
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
const manualDone = (day: string): GoalLog[] => [log('goal-sleep', day), log('goal-exercise', day)];

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

describe('metas do dia', () => {
  it('automática de água: cumpre ao atingir a meta (o valor vem das preferências)', () => {
    const states = (ml: number, goalMl = 2000) =>
      goalStates(
        buildIndex(
          make({
            waterLogs: [water(TODAY, ml)],
            preferences: { ...DEFAULT_PREFERENCES, waterGoalMl: goalMl },
          }),
        ),
        TODAY,
      ).find((s) => s.goal.kind === 'auto-agua');
    expect(states(1999)?.done).toBe(false);
    expect(states(2000)?.done).toBe(true);
    expect(states(1500, 1500)?.done).toBe(true);
  });

  it('automática de estudo: some sem blocos hoje; cumpre só com todos concluídos; cancelados não contam', () => {
    const study = (events: StudyEvent[]) =>
      goalStates(buildIndex(make({ events })), TODAY).find((s) => s.goal.kind === 'auto-estudo');
    expect(study([])?.hidden).toBe(true);
    expect(study([ev('x', { status: 'cancelado' })])?.hidden).toBe(true);
    expect(study([ev('x', { status: 'concluido' }), ev('y', {})])).toMatchObject({
      hidden: false,
      done: false,
    });
    expect(
      study([
        ev('x', { status: 'concluido' }),
        ev('y', { status: 'concluido' }),
        ev('z', { status: 'cancelado' }),
      ]),
    ).toMatchObject({ hidden: false, done: true });
    // Revisão e blocos de outro dia não contam.
    expect(
      study([
        ev('r', { type: 'revisao' }),
        ev('o', { start: '2026-11-11T10:00:00', end: '2026-11-11T11:00:00' }),
      ])?.hidden,
    ).toBe(true);
  });

  it('% de metas: ignora as ocultas e conta as manuais pelos registros', () => {
    const none = goalsSummary(buildIndex(make()), TODAY);
    expect(none).toMatchObject({ done: 0, total: 3, percent: 0 }); // 4 metas − estudo oculto

    const two = goalsSummary(buildIndex(make({ goalLogs: manualDone(TODAY) })), TODAY);
    expect(two).toMatchObject({ done: 2, total: 3, percent: 67 });

    const withBlocks = goalsSummary(
      buildIndex(make({ goalLogs: manualDone(TODAY), events: [ev('x', {})] })),
      TODAY,
    );
    expect(withBlocks).toMatchObject({ done: 2, total: 4, percent: 50 });

    const undone = goalsSummary(
      buildIndex(make({ goalLogs: [log('goal-sleep', TODAY, false)] })),
      TODAY,
    );
    expect(undone.done).toBe(0);
  });

  it('uma meta vale do dia da criação até o dia anterior ao arquivamento', () => {
    const goal = {
      ...goals()[0],
      createdAt: '2026-11-05T09:00:00',
      archivedAt: '2026-11-08T20:00:00',
    } as Goal;
    expect(isGoalActiveOn(goal, '2026-11-04')).toBe(false);
    expect(isGoalActiveOn(goal, '2026-11-05')).toBe(true);
    expect(isGoalActiveOn(goal, '2026-11-07')).toBe(true);
    expect(isGoalActiveOn(goal, '2026-11-08')).toBe(false);
    expect(isGoalActiveOn({ ...goal, archivedAt: null }, '2030-01-01')).toBe(true);
  });
});

describe('sequência', () => {
  /** Dias fechados: metas manuais cumpridas, 2000 ml e (sem blocos) o estudo oculto. */
  const closedDays = (days: string[]) => ({
    goalLogs: days.flatMap(manualDone),
    waterLogs: days.map((d) => water(d, 2000)),
  });
  const streak = (patch: Partial<StatsData>, today = TODAY) =>
    computeStreaks(buildIndex(make(patch)), today);

  it('sem nenhum dia fechado: 0', () => {
    expect(streak({})).toEqual({ current: 0, best: 0 });
  });

  it('conta até hoje quando hoje fechou', () => {
    expect(streak(closedDays(['2026-11-08', '2026-11-09', TODAY])).current).toBe(3);
  });

  it('se hoje ainda não fechou, conta até ontem (hoje não quebra a sequência)', () => {
    expect(streak(closedDays(['2026-11-07', '2026-11-08', '2026-11-09'])).current).toBe(3);
  });

  it('um dia sem fechar no meio quebra a sequência; a melhor continua', () => {
    const days = [
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-06',
      '2026-11-07',
    ];
    expect(streak(closedDays(days))).toEqual({ current: 0, best: 4 }); // 8 e 9 abertos → atual 0
    expect(streak(closedDays([...days, '2026-11-08', '2026-11-09']))).toEqual({
      current: 4,
      best: 4,
    });
  });

  it('virada de dia: a mesma história vista de amanhã perde a sequência de hoje', () => {
    const data = closedDays(['2026-11-09', TODAY]);
    expect(streak(data, TODAY).current).toBe(2);
    expect(streak(data, '2026-11-11').current).toBe(2); // amanhã ainda aberto: conta até hoje
    expect(streak(data, '2026-11-12').current).toBe(0); // depois de um dia inteiro sem fechar
  });

  it('um dia só de blocos pendentes não fecha (estudo automático não cumprido)', () => {
    const data = {
      ...closedDays(['2026-11-09']),
      events: [ev('p', { start: '2026-11-09T10:00:00', end: '2026-11-09T11:00:00' })],
    };
    expect(streak(data).current).toBe(0);
  });

  it('metas arquivadas: dias passados usam só as metas que existiam, e a meta nova só vale depois', () => {
    // “Exercício” foi arquivado em 05/11; até 04/11 ele exigia registro, depois não.
    const allGoals = goals().map((g) =>
      g.id === 'goal-exercise' ? { ...g, archivedAt: '2026-11-05T12:00:00' } : g,
    );
    const sleepOnly = ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'].map(
      (d) => log('goal-sleep', d),
    );
    const withExercise = ['2026-11-03', '2026-11-04'].flatMap(manualDone);
    const data = {
      goals: allGoals,
      goalLogs: [...sleepOnly, ...withExercise],
      waterLogs: [
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
        '2026-11-06',
        '2026-11-07',
        '2026-11-08',
        '2026-11-09',
      ].map((d) => water(d, 2000)),
    };
    expect(streak(data).current).toBe(7); // 03/11 → 09/11 atravessando o arquivamento
    // Sem a regra, 05–09 falhariam por falta de “Exercício”.
    expect(streak({ ...data, goals: goals() }).current).toBe(0);
  });

  it('dias anteriores à criação das metas não fecham (não há o que cumprir)', () => {
    const young = goals().map((g) => ({ ...g, createdAt: '2026-11-09T08:00:00' }));
    const data = { goals: young, ...closedDays(['2026-11-08', '2026-11-09']) };
    expect(streak(data).current).toBe(1); // 08/11 é anterior às metas
  });

  it('respeita o limite de busca (constante nomeada)', () => {
    expect(MAX_STREAK_LOOKBACK_DAYS).toBe(365);
    const old = goals().map((g) => ({ ...g, createdAt: '2020-01-01T00:00:00' }));
    const days = Array.from({ length: 400 }, (_, i) =>
      new Date(Date.UTC(2026, 10, 10) - i * 86_400_000).toISOString().slice(0, 10),
    );
    const result = streak({ goals: old, ...closedDays(days) });
    expect(result.current).toBe(MAX_STREAK_LOOKBACK_DAYS + 1); // hoje + 365 dias para trás
    expect(result.best).toBe(MAX_STREAK_LOOKBACK_DAYS + 1);
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

  it('mapa de calor: 12 semanas × 7 dias, futuro e dias sem metas ficam vazios', () => {
    const index = buildIndex(
      make({ goalLogs: manualDone(TODAY), waterLogs: [water(TODAY, 2000)] }),
    );
    const map = goalsHeatmap(index, TODAY);
    expect(map).toHaveLength(12);
    expect(map.every((week) => week.length === 7)).toBe(true);
    const flat = map.flat();
    expect(flat.find((c) => c.day === TODAY)?.percent).toBe(100);
    expect(flat.find((c) => c.day === '2026-11-11')?.percent).toBeNull(); // futuro
    expect(map[11]?.[0]?.day).toBe('2026-11-09'); // última coluna começa na segunda da semana atual
  });

  it('água: média diária, dias com a meta batida e os últimos 14 dias', () => {
    const logs = [water('2026-11-10', 2000), water('2026-11-09', 1000), water('2026-11-08', 2500)];
    const result = waterAnalysis(buildIndex(make({ waterLogs: logs })), 'semana', TODAY);
    expect(result.daysMet).toBe(2);
    expect(result.averageMl).toBe(Math.round(5500 / 7));
    expect(result.recent).toHaveLength(14);
    expect(result.recent.at(-1)).toMatchObject({ day: TODAY, ml: 2000 });
    expect(waterAnalysis(buildIndex(make()), '90d', TODAY)).toMatchObject({
      averageMl: 0,
      daysMet: 0,
      totalDays: 90,
    });
  });
});

describe('ações de água e metas no store', () => {
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

  it('marca e desmarca metas manuais (um registro por meta e dia)', () => {
    const { store } = setup();
    store.getState().setGoalDone('goal-sleep', TODAY, true);
    store.getState().setGoalDone('goal-sleep', TODAY, true);
    expect(store.getState().goalLogs).toEqual([log('goal-sleep', TODAY, true)]);
    store.getState().setGoalDone('goal-sleep', TODAY, false);
    expect(store.getState().goalLogs).toEqual([log('goal-sleep', TODAY, false)]);
  });

  it('cria, renomeia, reordena e arquiva metas, e persiste', () => {
    const { store, storage } = setup();
    const created = store
      .getState()
      .createGoal(today, { title: 'Ler 20 páginas', icon: 'book-open' });
    expect(created).toMatchObject({
      kind: 'manual',
      order: 4,
      createdAt: '2026-11-10T09:05:00',
      archivedAt: null,
    });

    store.getState().updateGoal(created?.id ?? '', { title: 'Ler 30 páginas' });
    const ids = store.getState().goals.map((g) => g.id);
    store.getState().reorderGoals([...ids].reverse());
    expect(store.getState().goals.map((g) => g.order)).toEqual([4, 3, 2, 1, 0]);
    store.getState().archiveGoal('goal-exercise', today);

    const reopened = createDataStore(new LocalStorageRepository(storage));
    const goalsAfter = reopened.getState().goals;
    expect(goalsAfter.find((g) => g.id === created?.id)?.title).toBe('Ler 30 páginas');
    expect(goalsAfter.find((g) => g.id === 'goal-exercise')?.archivedAt).toBe(
      '2026-11-10T09:05:00',
    );
  });

  it('rejeita título vazio ao criar meta', () => {
    const { store } = setup();
    expect(() => store.getState().createGoal(today, { title: '   ', icon: 'target' })).toThrow();
  });
});
