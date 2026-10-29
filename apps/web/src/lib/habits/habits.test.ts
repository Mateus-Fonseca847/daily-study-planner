import { describe, expect, it } from 'vitest';
import {
  EVERY_DAY,
  habitLogId,
  habitSchema,
  type FocusSession,
  type Habit,
  type HabitLog,
  type Repeat,
  type StudyEvent,
  type WaterLog,
} from '@daily/shared';
import {
  aggregateMatrix,
  buildHabitContext,
  dayConsistency,
  dayState,
  describeRepeat,
  formatTimeOfDay,
  generalRate,
  generalStreaks,
  heatmapMatrix,
  isScheduled,
  levelOfRatio,
  levelOn,
  occursOn,
  pendingToday,
  rate,
  ruleOn,
  scheduledToday,
  streaks,
  targetOn,
  valueOn,
  weekColumns,
  type HabitSources,
} from './index';

const TODAY = '2026-11-10'; // terça-feira

let seq = 0;
function habit(
  overrides: Partial<Habit> = {},
  repeat: Repeat = EVERY_DAY,
  since = '2026-10-01',
): Habit {
  seq += 1;
  return habitSchema.parse({
    id: `h${seq}`,
    name: 'Hábito',
    icon: 'target',
    color: 'amarelo',
    type: 'check',
    unit: '',
    source: 'manual',
    rules: [{ since, repeat, target: null, time: null }],
    createdAt: `${since}T08:00:00`,
    order: seq,
    ...overrides,
  });
}

const log = (h: Habit, date: string, value = 1): HabitLog => ({
  id: habitLogId(h.id, date),
  habitId: h.id,
  date,
  value,
  updatedAt: `${date}T09:00:00`,
});

const ctxOf = (sources: Partial<HabitSources> = {}, today = TODAY) =>
  buildHabitContext(
    { habitLogs: [], waterLogs: [], focusSessions: [], events: [], ...sources },
    today,
  );

const week = (days: number[]): Repeat => ({ kind: 'dias-da-semana', days });
const block = (
  id: string,
  start: string,
  status: StudyEvent['status'] = 'pendente',
): StudyEvent => ({
  id,
  type: 'estudo',
  title: id,
  start: `${start}T14:00:00`,
  end: `${start}T15:00:00`,
  subjectId: null,
  examId: null,
  status,
  notes: '',
});
const water = (date: string, ml: number): WaterLog => ({
  id: `${date}-${ml}`,
  date,
  ml,
  time: '10:00',
});
const session = (startedAt: string, actualSec: number): FocusSession => ({
  id: startedAt,
  startedAt,
  plannedSec: 1500,
  actualSec,
  status: 'concluida',
  subjectId: null,
  examId: null,
  blockId: null,
});

describe('repetição', () => {
  it('dias da semana (0 = domingo) e a partir da âncora', () => {
    const repeat = week([1, 3, 5]);
    expect(occursOn(repeat, '2026-11-01', '2026-11-02')).toBe(true); // segunda
    expect(occursOn(repeat, '2026-11-01', '2026-11-03')).toBe(false); // terça
    expect(occursOn(repeat, '2026-11-04', '2026-11-02')).toBe(false); // antes da âncora
  });

  it('a cada N dias usa a âncora, também na virada de mês e de ano', () => {
    const repeat: Repeat = { kind: 'a-cada-n-dias', interval: 3 };
    expect(occursOn(repeat, '2026-12-30', '2026-12-30')).toBe(true);
    expect(occursOn(repeat, '2026-12-30', '2026-12-31')).toBe(false);
    expect(occursOn(repeat, '2026-12-30', '2027-01-02')).toBe(true);
    expect(occursOn(repeat, '2028-02-27', '2028-03-01')).toBe(true); // 2028 é bissexto: 27, 28, 29, 1
  });

  it('descreve a repetição e o horário', () => {
    expect(describeRepeat(EVERY_DAY)).toBe('Todo dia');
    expect(describeRepeat(week([1, 3, 5]))).toBe('Seg, qua e sex');
    expect(describeRepeat(week([2]))).toBe('Ter');
    expect(describeRepeat({ kind: 'a-cada-n-dias', interval: 4 })).toBe('A cada 4 dias');
    expect(formatTimeOfDay('19:00')).toBe('19h');
    expect(formatTimeOfDay('07:30')).toBe('7h30');
  });
});

describe('agendado e regras versionadas', () => {
  it('usa a regra vigente em cada data e preserva o passado', () => {
    const h = habit({}, week([1, 3, 5]), '2026-10-01');
    const edited = habitSchema.parse({
      ...h,
      rules: [...h.rules, { since: '2026-11-10', repeat: week([2, 4]), target: null, time: null }],
    });
    const ctx = ctxOf();
    expect(ruleOn(edited, '2026-11-09')?.since).toBe('2026-10-01');
    expect(isScheduled(edited, '2026-11-09', ctx)).toBe(true); // segunda: regra antiga
    expect(isScheduled(edited, '2026-11-10', ctx)).toBe(true); // terça: regra nova
    expect(isScheduled(edited, '2026-11-11', ctx)).toBe(false); // quarta: já não
    expect(isScheduled(edited, '2026-09-30', ctx)).toBe(false); // antes da primeira regra
  });

  it('arquivar: o próprio dia conta, os seguintes não', () => {
    const h = habit({ archivedAt: '2026-11-05T10:00:00' });
    const ctx = ctxOf();
    expect(isScheduled(h, '2026-11-05', ctx)).toBe(true);
    expect(isScheduled(h, '2026-11-06', ctx)).toBe(false);
  });

  it('fim opcional (endsOn) encerra a agenda sem arquivar', () => {
    const h = habit({ endsOn: '2026-11-03' });
    expect(isScheduled(h, '2026-11-03', ctxOf())).toBe(true);
    expect(isScheduled(h, '2026-11-04', ctxOf())).toBe(false);
  });

  it('fonte blocos: sem blocos no dia não está agendado; cancelados não contam', () => {
    const h = habit({ source: 'blocos' });
    const ctx = ctxOf({
      events: [block('a', '2026-11-09'), block('b', '2026-11-08', 'cancelado')],
    });
    expect(isScheduled(h, '2026-11-09', ctx)).toBe(true);
    expect(isScheduled(h, '2026-11-08', ctx)).toBe(false);
    expect(isScheduled(h, '2026-11-07', ctx)).toBe(false);
  });
});

describe('valor, estado e nível do dia', () => {
  it('manual lê o registro; água e foco são derivados; blocos é proporção', () => {
    const manual = habit();
    const agua = habit({
      type: 'quantidade',
      unit: 'ml',
      source: 'agua',
      rules: [{ since: '2026-10-01', repeat: EVERY_DAY, target: 2000, time: null }],
    });
    const foco = habit({
      type: 'quantidade',
      unit: 'min',
      source: 'foco',
      rules: [{ since: '2026-10-01', repeat: EVERY_DAY, target: 60, time: null }],
    });
    const blocos = habit({ source: 'blocos' });
    const ctx = ctxOf({
      habitLogs: [log(manual, '2026-11-09')],
      waterLogs: [water('2026-11-09', 500), water('2026-11-09', 750)],
      focusSessions: [session('2026-11-09T09:00:00', 1500), session('2026-11-09T11:00:00', 1500)],
      events: [block('a', '2026-11-09', 'concluido'), block('b', '2026-11-09')],
    });
    expect(valueOn(manual, '2026-11-09', ctx)).toBe(1);
    expect(valueOn(manual, '2026-11-08', ctx)).toBe(0);
    expect(valueOn(agua, '2026-11-09', ctx)).toBe(1250);
    expect(valueOn(foco, '2026-11-09', ctx)).toBe(50);
    expect(valueOn(blocos, '2026-11-09', ctx)).toBe(0.5);
    expect(targetOn(agua, '2026-11-09')).toBe(2000);
    expect(targetOn(manual, '2026-11-09')).toBe(1);
  });

  it('estados: futuro, não agendado, feito, parcial, perdido e pendente', () => {
    const qtd = habit({
      type: 'quantidade',
      unit: 'vezes',
      rules: [{ since: '2026-10-01', repeat: week([1, 2, 3, 4]), target: 4, time: null }],
    });
    const ctx = ctxOf({
      habitLogs: [log(qtd, '2026-11-02', 4), log(qtd, '2026-11-03', 2)],
    });
    expect(dayState(qtd, '2026-11-11', ctx)).toBe('futuro');
    expect(dayState(qtd, '2026-11-07', ctx)).toBe('nao-agendado'); // sábado
    expect(dayState(qtd, '2026-11-02', ctx)).toBe('feito');
    expect(dayState(qtd, '2026-11-03', ctx)).toBe('parcial');
    expect(dayState(qtd, '2026-11-04', ctx)).toBe('perdido');
    expect(dayState(qtd, TODAY, ctx)).toBe('pendente'); // terça, hoje, não cumprido
  });

  it('nível: check é 0 ou 4; quantidade segue a proporção da meta', () => {
    expect([0, 0.1, 0.25, 0.26, 0.5, 0.51, 0.99, 1, 1.5].map(levelOfRatio)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
    const check = habit();
    const qtd = habit({
      type: 'quantidade',
      unit: 'min',
      rules: [{ since: '2026-10-01', repeat: EVERY_DAY, target: 100, time: null }],
    });
    const ctx = ctxOf({
      habitLogs: [log(check, '2026-11-09'), log(qtd, '2026-11-09', 60), log(qtd, '2026-11-08', 20)],
    });
    expect(levelOn(check, '2026-11-09', ctx)).toBe(4);
    expect(levelOn(check, '2026-11-08', ctx)).toBe(0);
    expect(levelOn(qtd, '2026-11-09', ctx)).toBe(3);
    expect(levelOn(qtd, '2026-11-08', ctx)).toBe(1);
    expect(levelOn(qtd, '2026-11-12', ctx)).toBe(0); // futuro
  });
});

describe('sequências e taxa', () => {
  it('hoje pendente não quebra: a sequência conta até ontem', () => {
    const h = habit();
    const ctx = ctxOf({
      habitLogs: ['2026-11-07', '2026-11-08', '2026-11-09'].map((d) => log(h, d)),
    });
    expect(streaks(h, ctx)).toEqual({ current: 3, best: 3 });
    const done = ctxOf({
      habitLogs: ['2026-11-07', '2026-11-08', '2026-11-09', TODAY].map((d) => log(h, d)),
    });
    expect(streaks(h, done).current).toBe(4);
  });

  it('um dia perdido zera a atual e a melhor guarda o recorde', () => {
    const h = habit();
    const ctx = ctxOf({
      habitLogs: [
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-06',
        '2026-11-07',
      ].map((d) => log(h, d)),
    });
    // 05 e 08 e 09 perdidos
    expect(streaks(h, ctx)).toEqual({ current: 0, best: 4 });
  });

  it('dias não agendados no meio não quebram nem somam', () => {
    const h = habit({}, week([1, 3, 5]), '2026-10-01'); // seg, qua, sex
    const ctx = ctxOf({
      habitLogs: ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'].map((d) => log(h, d)),
    });
    // 03, 05, 07, 08 não agendados; hoje (terça) também não
    expect(streaks(h, ctx)).toEqual({ current: 4, best: 4 });
    expect(dayState(h, TODAY, ctx)).toBe('nao-agendado');
  });

  it('atravessa a virada de ano e o 29 de fevereiro', () => {
    const h = habit({}, EVERY_DAY, '2027-12-25');
    const days = ['2027-12-30', '2027-12-31', '2028-01-01', '2028-01-02'];
    const ctx = ctxOf(
      { habitLogs: [...days, '2027-12-29', '2027-12-28'].map((d) => log(h, d)) },
      '2028-01-02',
    );
    expect(streaks(h, ctx).current).toBe(6);
    const leap = habit({}, EVERY_DAY, '2028-02-27');
    const ctxLeap = ctxOf(
      {
        habitLogs: ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01'].map((d) =>
          log(leap, d),
        ),
      },
      '2028-03-01',
    );
    expect(streaks(leap, ctxLeap).current).toBe(4);
  });

  it('a cada N dias: só as datas da âncora contam', () => {
    const h = habit({}, { kind: 'a-cada-n-dias', interval: 3 }, '2026-11-01');
    const ctx = ctxOf({
      habitLogs: ['2026-11-01', '2026-11-04', '2026-11-07'].map((d) => log(h, d)),
    });
    expect(streaks(h, ctx)).toEqual({ current: 3, best: 3 });
    expect(dayState(h, '2026-11-10', ctx)).toBe('pendente'); // 1 + 3·3
  });

  it('taxa: dias cumpridos ÷ agendados na janela (hoje pendente fica de fora)', () => {
    const h = habit();
    const ctx = ctxOf({
      habitLogs: ['2026-11-09', '2026-11-08', '2026-11-06'].map((d) => log(h, d)),
    });
    // janela de 5 dias: 06..10 → 06 feito, 07 perdido, 08 feito, 09 feito, 10 pendente (fora)
    expect(rate(h, ctx, 5)).toEqual({ done: 3, scheduled: 4, percent: 75 });
    expect(rate(habit({}, week([6]), '2026-11-11'), ctx, 30)).toEqual({
      done: 0,
      scheduled: 0,
      percent: null,
    });
  });
});

describe('matriz do heatmap', () => {
  it('colunas de domingo a sábado cobrindo o intervalo', () => {
    const columns = weekColumns('2026-11-04', '2026-11-10'); // quarta → terça
    expect(columns).toHaveLength(2);
    expect(columns[0]?.[0]).toBe('2026-11-01'); // domingo
    expect(columns[1]?.[6]).toBe('2026-11-14');
  });

  it('marca o que está dentro do intervalo, o futuro e os níveis', () => {
    const h = habit();
    const ctx = ctxOf({ habitLogs: [log(h, '2026-11-09')] });
    const matrix = heatmapMatrix(h, '2026-11-04', TODAY, ctx);
    const cells = matrix.flat();
    expect(cells.find((c) => c.date === '2026-11-02')?.inRange).toBe(false);
    expect(cells.find((c) => c.date === '2026-11-09')).toMatchObject({
      state: 'feito',
      level: 4,
      inRange: true,
    });
    expect(cells.find((c) => c.date === '2026-11-12')).toMatchObject({
      state: 'futuro',
      inRange: false,
    });
    expect(cells.every((_, i) => i < 14)).toBe(true);
  });
});

describe('agregado', () => {
  it('consistência do dia: % dos agendados cumpridos; sem hábitos agendados é neutro', () => {
    const a = habit();
    const b = habit({}, week([1]), '2026-10-01'); // só segunda
    const ctx = ctxOf({ habitLogs: [log(a, '2026-11-09'), log(a, '2026-11-08')] });
    expect(dayConsistency([a, b], '2026-11-09', ctx)).toEqual({
      scheduled: 2,
      done: 1,
      percent: 50,
    });
    expect(dayConsistency([a, b], '2026-11-08', ctx)).toEqual({
      scheduled: 1,
      done: 1,
      percent: 100,
    });
    expect(dayConsistency([b], '2026-11-08', ctx)).toEqual({
      scheduled: 0,
      done: 0,
      percent: null,
    });
    expect(dayConsistency([], '2026-11-08', ctx).percent).toBeNull();
  });

  it('sequência geral: dias neutros pulam, dia incompleto quebra, hoje incompleto não', () => {
    const a = habit();
    const b = habit({}, week([1]), '2026-10-01');
    const logs = [
      log(a, '2026-11-05'),
      log(a, '2026-11-06'),
      log(a, '2026-11-07'),
      log(a, '2026-11-08'),
      log(a, '2026-11-09'),
      log(b, '2026-11-09'),
    ];
    const ctx = ctxOf({ habitLogs: logs });
    expect(generalStreaks([a, b], ctx)).toMatchObject({ current: 5 }); // hoje (terça) incompleto: não quebra
    expect(generalStreaks([], ctx)).toEqual({ current: 0, best: 0 });
    const missed = ctxOf({ habitLogs: logs.filter((l) => l.date !== '2026-11-07') });
    expect(generalStreaks([a, b], missed).current).toBe(2);
    expect(generalStreaks([a, b], missed).best).toBeGreaterThanOrEqual(2);
  });

  it('matriz agregada e taxa geral', () => {
    const a = habit();
    const ctx = ctxOf({ habitLogs: [log(a, '2026-11-09')] });
    const cells = aggregateMatrix([a], '2026-11-04', TODAY, ctx).flat();
    expect(cells.find((c) => c.date === '2026-11-09')).toMatchObject({
      percent: 100,
      level: 4,
      future: false,
    });
    expect(cells.find((c) => c.date === '2026-11-08')).toMatchObject({ percent: 0, level: 0 });
    expect(cells.find((c) => c.date === '2026-11-12')).toMatchObject({
      percent: null,
      future: true,
    });
    expect(generalRate([a], ctx, 3)).toBe(Math.round((1 / 3) * 100)); // 08, 09 e hoje
    expect(generalRate([], ctx, 30)).toBeNull();
  });
});

describe('hoje', () => {
  it('lista agendados e pendentes, ignorando arquivados', () => {
    const a = habit();
    const done = habit();
    const archived = habit({ archivedAt: '2026-11-01T10:00:00' });
    const ctx = ctxOf({ habitLogs: [log(done, TODAY)] });
    expect(scheduledToday([a, done, archived], ctx)).toEqual([a, done]);
    expect(pendingToday([a, done, archived], ctx)).toEqual([a]);
  });
});

describe('schema do hábito', () => {
  it('exige meta nos de quantidade, regras em ordem e fontes coerentes', () => {
    const base = {
      id: 'x',
      name: 'Teste',
      icon: 'target',
      color: 'azul',
      type: 'quantidade',
      unit: 'min',
      source: 'manual',
      rules: [{ since: '2026-11-01', repeat: EVERY_DAY, target: null, time: null }],
      createdAt: '2026-11-01T08:00:00',
      order: 0,
    };
    expect(habitSchema.safeParse(base).success).toBe(false);
    expect(
      habitSchema.safeParse({ ...base, rules: [{ ...base.rules[0], target: 30 }] }).success,
    ).toBe(true);
    expect(
      habitSchema.safeParse({
        ...base,
        type: 'check',
        rules: [base.rules[0], { ...base.rules[0], since: '2026-10-01' }],
      }).success,
    ).toBe(false);
    expect(habitSchema.safeParse({ ...base, type: 'check', source: 'agua' }).success).toBe(false);
    expect(
      habitSchema.safeParse({
        ...base,
        type: 'quantidade',
        source: 'blocos',
        rules: [{ ...base.rules[0], target: 1 }],
      }).success,
    ).toBe(false);
    expect(habitSchema.safeParse({ ...base, name: '  ', type: 'check' }).success).toBe(false);
  });

  it('normaliza os dias da semana e rejeita intervalo menor que 2', () => {
    const parsed = habitSchema.parse({
      id: 'x',
      name: 'Teste',
      icon: 'target',
      color: 'azul',
      type: 'check',
      source: 'manual',
      rules: [{ since: '2026-11-01', repeat: { kind: 'dias-da-semana', days: [5, 1, 1, 3] } }],
      createdAt: '2026-11-01T08:00:00',
      order: 0,
    });
    expect(parsed.rules[0]?.repeat).toEqual({ kind: 'dias-da-semana', days: [1, 3, 5] });
    expect(
      habitSchema.safeParse({
        ...parsed,
        rules: [{ ...parsed.rules[0], repeat: { kind: 'a-cada-n-dias', interval: 1 } }],
      }).success,
    ).toBe(false);
  });
});
