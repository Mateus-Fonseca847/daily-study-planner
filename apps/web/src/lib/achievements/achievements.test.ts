import { describe, expect, it } from 'vitest';
import type {
  Achievement,
  FocusSession,
  Habit,
  HabitLog,
  OccurrenceException,
  StudyEvent,
  WaterLog,
} from '@daily/shared';
import { shiftDay } from '../dates';
import { CATALOG, CATALOG_BY_ID, levelName } from './catalog';
import {
  evaluate,
  limitFeatured,
  mergeAchievements,
  progress,
  setFeatured,
  showcase,
  unionAchievements,
} from './evaluate';
import { buildFacts, type AchievementSources } from './facts';
import { preparedChanges } from './prepared';

const NOW = '2026-11-10T10:30:00';
const TODAY = '2026-11-10';

let seq = 0;
const task = (over: Partial<StudyEvent> = {}): StudyEvent => {
  seq += 1;
  const day = over.start?.slice(0, 10) ?? '2026-11-01';
  return {
    id: `t${seq}`,
    type: 'tarefa',
    title: `Tarefa ${seq}`,
    start: `${day}T09:00:00`,
    end: `${day}T10:00:00`,
    subjectId: null,
    status: 'pendente',
    notes: '',
    subtasks: [],
    createdAt: `${day}T08:00:00`,
    ...over,
  };
};
const doneTask = (day: string, over: Partial<StudyEvent> = {}) =>
  task({ start: `${day}T09:00:00`, end: `${day}T10:00:00`, status: 'concluido', ...over });

const habit = (id: string, over: Partial<Habit> = {}): Habit =>
  ({
    id,
    name: id,
    icon: 'target',
    color: 'ciano',
    type: 'check',
    unit: '',
    source: 'manual',
    rules: [
      {
        since: '2026-01-01',
        repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
        target: null,
        time: null,
      },
    ],
    createdAt: '2026-01-01T08:00:00',
    archivedAt: null,
    endsOn: null,
    order: 0,
    ...over,
  }) as Habit;
const logs = (habitId: string, from: string, days: number): HabitLog[] =>
  Array.from({ length: days }, (_, i) => {
    const date = shiftDay(from, i);
    return { id: `${habitId}:${date}`, habitId, date, value: 1, updatedAt: `${date}T20:00:00` };
  });
const session = (
  startedAt: string,
  sec: number,
  over: Partial<FocusSession> = {},
): FocusSession => ({
  id: `s${(seq += 1)}`,
  startedAt,
  plannedSec: sec,
  actualSec: sec,
  status: 'concluida',
  subjectId: null,
  examId: null,
  origin: 'cronometro',
  note: '',
  ...over,
});

const sources = (over: Partial<AchievementSources> = {}): AchievementSources => ({
  events: [],
  exceptions: [],
  focusSessions: [],
  habits: [],
  habitLogs: [],
  waterLogs: [],
  restDays: [],
  preferences: { waterGoalMl: 2000 },
  seededAt: NOW,
  ...over,
});
const facts = (over: Partial<AchievementSources> = {}, now = NOW) => buildFacts(sources(over), now);
const value = (id: string, f: ReturnType<typeof facts>) => CATALOG_BY_ID.get(id)!.measure(f).value;
const levelOf = (id: string, f: ReturnType<typeof facts>) =>
  evaluate(f, [], { retroactive: false }).find((a) => a.id === id)?.level ?? 0;
const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => shiftDay(from, i));

describe('catálogo', () => {
  it('ids únicos, estáveis e no formato; metas crescentes; textos em pt-BR', () => {
    const ids = CATALOG.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'primeiro-passo',
      'rotina',
      'planejado',
      'maos-a-obra',
      'dia-limpo',
      'preparado',
      'ritmo',
      'passo-a-passo',
      'concentrado',
      'sessao-completa',
      'constancia',
      'hidratado',
      'variedade',
    ]);
    for (const def of CATALOG) {
      expect(def.id).toMatch(/^[a-z0-9-]+$/);
      expect(def.levels.length === 1 || def.levels.length === 3).toBe(true);
      expect([...def.levels].sort((a, b) => a - b)).toEqual(def.levels);
      expect(new Set(def.levels).size).toBe(def.levels.length);
      expect(def.description).toMatch(/\.$/);
      expect(def.description).not.toMatch(/\b(the|and|complete)\b/i);
    }
  });

  it('nome do nível: Bronze/Prata/Ouro; nível único não tem nome', () => {
    expect(levelName(CATALOG_BY_ID.get('constancia')!, 2)).toBe('Prata');
    expect(levelName(CATALOG_BY_ID.get('primeiro-passo')!, 1)).toBeNull();
  });

  it('dados vazios: nenhuma medalha e nenhum erro', () => {
    expect(evaluate(facts(), [], { retroactive: true })).toEqual([]);
  });
});

describe('limites exatos de cada medalha (meta − 1, meta, meta + 1)', () => {
  const countCases: [string, (n: number) => Partial<AchievementSources>][] = [
    ['maos-a-obra', (n) => ({ events: days('2026-06-01', n).map((d) => doneTask(d)) })],
    [
      'passo-a-passo',
      (n) => ({
        events: [
          task({
            subtasks: Array.from({ length: n }, (_, i) => ({
              id: `x${i}`,
              title: 'x',
              done: true,
              order: i,
            })),
          }),
        ],
      }),
    ],
    [
      'sessao-completa',
      (n) => ({ focusSessions: days('2026-06-01', n).map((d) => session(`${d}T08:00:00`, 1500)) }),
    ],
    [
      'hidratado',
      (n) => ({
        waterLogs: days('2026-06-01', n).map((d, i): WaterLog => ({
          id: `w${i}`,
          date: d,
          ml: 2000,
          time: '10:00',
        })),
      }),
    ],
  ];
  for (const [id, build] of countCases) {
    const def = CATALOG_BY_ID.get(id)!;
    def.levels.forEach((goal, i) => {
      it(`${id}: nível ${i + 1} em ${goal}`, () => {
        expect(levelOf(id, facts(build(goal - 1)))).toBe(i);
        expect(levelOf(id, facts(build(goal)))).toBe(i + 1);
        expect(levelOf(id, facts(build(goal + 1)))).toBe(i + 1);
      });
    });
  }

  it('concentrado: horas (5 h = bronze; 4 h 59 min não)', () => {
    const h = (sec: number) =>
      facts({ focusSessions: [session('2026-11-01T08:00:00', sec, { origin: 'manual' })] });
    expect(levelOf('concentrado', h(5 * 3600 - 60))).toBe(0);
    expect(levelOf('concentrado', h(5 * 3600))).toBe(1);
    expect(levelOf('concentrado', h(25 * 3600))).toBe(2);
  });

  it('constância: sequência de 7, 30 e 100 dias', () => {
    const run = (n: number) =>
      facts({ habits: [habit('h')], habitLogs: logs('h', shiftDay(TODAY, -n), n) });
    expect(levelOf('constancia', run(6))).toBe(0);
    expect(levelOf('constancia', run(7))).toBe(1);
    expect(levelOf('constancia', run(30))).toBe(2);
    expect(levelOf('constancia', run(100))).toBe(3);
  });

  it('variedade: 3 hábitos ativos com ≥ 7 dias cumpridos (arquivado não conta)', () => {
    const hs = ['a', 'b', 'c'].map((id) => habit(id));
    const all = hs.flatMap((h) => logs(h.id, '2026-10-01', 7));
    expect(levelOf('variedade', facts({ habits: hs, habitLogs: all }))).toBe(1);
    const archived = [hs[0]!, hs[1]!, { ...hs[2]!, archivedAt: '2026-10-20T08:00:00' }];
    expect(levelOf('variedade', facts({ habits: archived, habitLogs: all }))).toBe(0);
    const six = hs.flatMap((h) => logs(h.id, '2026-10-01', h.id === 'c' ? 6 : 7));
    expect(levelOf('variedade', facts({ habits: hs, habitLogs: six }))).toBe(0);
  });

  it('nível único: primeiro passo, rotina e planejado', () => {
    const f = facts({
      events: [
        doneTask('2026-11-02'),
        task({ recurrence: { freq: 'diaria', interval: 1, end: { kind: 'nunca' } } }),
        task({ type: 'prova' }),
      ],
    });
    const got = evaluate(f, [], { retroactive: false }).map((a) => [a.id, a.level]);
    expect(got).toEqual(
      expect.arrayContaining([
        ['primeiro-passo', 1],
        ['rotina', 1],
        ['planejado', 1],
      ]),
    );
  });
});

describe('regras de borda', () => {
  it('só conta o feito: cancelada não; reaberta antes de avaliar não; marcar e desmarcar não soma', () => {
    const events = [
      doneTask('2026-11-01'),
      doneTask('2026-11-02', { status: 'cancelado' }),
      doneTask('2026-11-03', { status: 'pendente' }),
    ];
    expect(value('maos-a-obra', facts({ events }))).toBe(1);
    // “Marcar e desmarcar” várias vezes deixa o mesmo estado: o mesmo valor.
    expect(value('maos-a-obra', facts({ events }))).toBe(1);
  });

  it('prova não conta em “Mãos à obra”; Especial conta', () => {
    const events = [
      doneTask('2026-11-01', { type: 'prova' }),
      doneTask('2026-11-02', { type: 'especial' }),
    ];
    expect(value('maos-a-obra', facts({ events }))).toBe(1);
  });

  it('ocorrências: concluída conta em Ritmo e em Mãos à obra; pulada e cancelada não', () => {
    const series = task({
      id: 'serie',
      start: '2026-11-01T07:00:00',
      end: '2026-11-01T07:30:00',
      recurrence: { freq: 'diaria', interval: 1, end: { kind: 'nunca' } },
      subtasks: [{ id: 'a', title: 'a', done: false, order: 0 }],
    });
    const ex = (date: string, over: Partial<OccurrenceException>): OccurrenceException => ({
      id: `serie@${date}`,
      eventId: 'serie',
      originalDate: date,
      kind: 'alterada',
      ...over,
    });
    const exceptions = [
      ex('2026-11-01', { status: 'concluido', doneSubtasks: ['a', 'apagada'] }),
      ex('2026-11-02', { status: 'cancelado' }),
      ex('2026-11-03', { kind: 'pulada', status: 'concluido' }),
    ];
    const f = facts({ events: [series], exceptions });
    expect(value('ritmo', f)).toBe(1);
    expect(value('maos-a-obra', f)).toBe(1);
    // Subtarefa apagada do modelo não conta.
    expect(value('passo-a-passo', f)).toBe(1);
  });

  it('dia limpo: dia sem tarefas não conta; cancelada não entra; pendente estraga; futuro não conta', () => {
    const events = [
      doneTask('2026-11-01'),
      doneTask('2026-11-01', { status: 'cancelado' }),
      doneTask('2026-11-02'),
      doneTask('2026-11-02', { status: 'pendente' }),
      doneTask('2026-11-03', { status: 'cancelado' }),
      doneTask('2026-11-20'),
    ];
    expect(facts({ events }).cleanDays).toEqual(['2026-11-01T12:00:00']);
  });

  it('dia limpo com série: a ocorrência pendente do dia estraga o dia', () => {
    const series = task({
      id: 'diaria',
      start: '2026-11-08T07:00:00',
      end: '2026-11-08T07:30:00',
      recurrence: { freq: 'diaria', interval: 1, end: { kind: 'nunca' } },
    });
    const exceptions: OccurrenceException[] = [
      {
        id: 'diaria@2026-11-08',
        eventId: 'diaria',
        originalDate: '2026-11-08',
        kind: 'alterada',
        status: 'concluido',
      },
    ];
    expect(facts({ events: [series], exceptions }).cleanDays).toEqual(['2026-11-08T12:00:00']);
  });

  it('descanso não quebra a sequência (nem soma)', () => {
    const from = '2026-10-01';
    const all = logs('h', from, 10).filter((l) => l.date !== '2026-10-05');
    const rest = [{ id: 'rest:h:2026-10-05', habitId: 'h', date: '2026-10-05' }];
    const f = facts({
      habits: [
        habit('h', {
          rules: [
            {
              since: from,
              repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
              target: null,
              time: null,
            },
          ],
        }),
      ],
      habitLogs: all,
      restDays: rest,
    });
    expect(value('constancia', f)).toBe(9);
    const broken = facts({
      habits: [
        habit('h', {
          rules: [
            {
              since: from,
              repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
              target: null,
              time: null,
            },
          ],
        }),
      ],
      habitLogs: all,
    });
    expect(value('constancia', broken)).toBe(5);
  });

  it('sequência atravessa a virada de mês, de ano e o horário de verão (datas locais)', () => {
    const from = '2025-12-20'; // passa por 01/01 e por 08/03 (início do horário de verão nos EUA)
    const span = 100;
    const f = facts(
      {
        habits: [
          habit('h', {
            rules: [
              {
                since: from,
                repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
                target: null,
                time: null,
              },
            ],
          }),
        ],
        habitLogs: logs('h', from, span),
      },
      '2026-03-30T10:00:00',
    );
    expect(value('constancia', f)).toBe(span);
    expect(f.streakReach[6]).toBe('2025-12-26T12:00:00');
    expect(f.streakReach[29]).toBe('2026-01-18T12:00:00');
  });

  it('água: meta do dia pela regra do hábito Água (versionada); sem ele, a preferência', () => {
    const water = habit('agua', {
      source: 'agua',
      type: 'quantidade',
      unit: 'ml',
      rules: [
        {
          since: '2026-01-01',
          repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
          target: 1500,
          time: null,
        },
        {
          since: '2026-06-01',
          repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
          target: 3000,
          time: null,
        },
      ],
    });
    const waterLogs: WaterLog[] = [
      { id: 'a', date: '2026-05-01', ml: 1500, time: '10:00' },
      { id: 'b', date: '2026-07-01', ml: 2000, time: '10:00' },
    ];
    expect(facts({ habits: [water], waterLogs }).waterDays).toEqual(['2026-05-01T12:00:00']);
    // Sem o hábito: a meta das preferências (2000 ml) vale para todos os dias.
    expect(facts({ waterLogs }).waterDays).toEqual(['2026-07-01T12:00:00']);
  });

  it('água em descanso: não quebra a sequência nem dá crédito de hidratação sem a meta', () => {
    const water = habit('agua', {
      source: 'agua',
      type: 'quantidade',
      unit: 'ml',
      rules: [
        {
          since: '2026-11-01',
          repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
          target: 2000,
          time: null,
        },
      ],
    });
    // Meta batida de 01 a 09/11, exceto 05 (nada bebido); hoje (10) ainda em aberto.
    const met = days('2026-11-01', 9).filter((d) => d !== '2026-11-05');
    const waterLogs: WaterLog[] = met.map((date) => ({ id: date, date, ml: 2000, time: '10:00' }));
    const without = facts({ habits: [water], waterLogs });
    const withRest = facts({
      habits: [water],
      waterLogs,
      restDays: [{ id: 'agua:2026-11-05', habitId: 'agua', date: '2026-11-05' }],
    });
    // Sem descanso, o 05 quebra: a maior sequência é de 4 dias (06 a 09).
    expect(without.streakReach).toHaveLength(4);
    // Com descanso no 05, a sequência atravessa o dia: 8 dias seguidos de meta.
    expect(withRest.streakReach).toHaveLength(8);
    // Hidratado conta só os dias com a meta batida; o descanso não soma nem tira.
    expect(withRest.waterDays).toEqual(without.waterDays);
    expect(withRest.waterDays).toHaveLength(8);
  });

  it('foco: registro manual soma horas, mas não é “sessão completa”; interrompida não é completa', () => {
    const f = facts({
      focusSessions: [
        session('2026-11-01T08:00:00', 3600, { origin: 'manual' }),
        session('2026-11-02T08:00:00', 1200, { status: 'interrompida' }),
        session('2026-11-03T08:00:00', 1500),
      ],
    });
    expect(f.completeSessions).toEqual(['2026-11-03T08:00:00']);
    expect(f.focus.reduce((s, x) => s + x.sec, 0)).toBe(6300);
  });
});

describe('preparado', () => {
  const exam = (start: string, done: boolean[], preparedAt?: string) =>
    task({
      type: 'prova',
      start,
      end: start,
      subtasks: done.map((d, i) => ({ id: `c${i}`, title: 'c', done: d, order: i })),
      ...(preparedAt ? { preparedAt } : {}),
    }) as StudyEvent & { preparedAt?: string };

  it('a marca entra quando tudo fica pronto antes do início, sai se desmarcar, e não muda depois', () => {
    expect(preparedChanges([exam('2026-11-20T08:00:00', [true, true])], NOW)).toEqual([
      { id: expect.any(String), preparedAt: NOW },
    ]);
    expect(
      preparedChanges([exam('2026-11-20T08:00:00', [true, false], '2026-11-09T10:00:00')], NOW),
    ).toEqual([{ id: expect.any(String), preparedAt: null }]);
    expect(preparedChanges([exam('2026-11-20T08:00:00', [])], NOW)).toEqual([]);
    expect(preparedChanges([exam('2026-11-01T08:00:00', [true])], NOW)).toEqual([]);
  });

  it('conta a prova marcada; do histórico (antes da concessão), conta a passada com 100 %', () => {
    const marked = exam('2026-11-20T08:00:00', [true], '2026-11-09T10:00:00');
    const historic = exam('2026-10-01T08:00:00', [true]);
    const lateAfterSeed = exam('2026-11-05T08:00:00', [true]);
    const f = facts({ events: [marked, historic, lateAfterSeed], seededAt: '2026-11-01T00:00:00' });
    expect(value('preparado', f)).toBe(2);
  });
});

describe('avaliação', () => {
  it('idempotente: avaliar de novo não devolve nada; só as novas ou as subidas de nível', () => {
    const f = facts({ events: days('2026-06-01', 10).map((d) => doneTask(d)) });
    const first = evaluate(f, [], { retroactive: false });
    expect(first.map((a) => a.id).sort()).toEqual(['dia-limpo', 'maos-a-obra', 'primeiro-passo']);
    const saved = mergeAchievements([], first);
    expect(evaluate(f, saved, { retroactive: false })).toEqual([]);

    const more = facts({ events: days('2026-06-01', 50).map((d) => doneTask(d)) });
    const up = evaluate(more, saved, { retroactive: false });
    expect(up.find((a) => a.id === 'maos-a-obra')).toMatchObject({ level: 2, levels: [NOW, NOW] });
    // 50 dias limpos passam de 7 e de 30: sobe dois níveis de uma vez.
    expect(up.find((a) => a.id === 'dia-limpo')).toMatchObject({
      level: 3,
      levels: [NOW, NOW, NOW],
    });
  });

  it('nunca rebaixa nem remove (histórico apagado)', () => {
    const saved: Achievement[] = [
      { id: 'maos-a-obra', level: 2, levels: [NOW, NOW], featured: true },
    ];
    expect(evaluate(facts(), saved, { retroactive: false })).toEqual([]);
    expect(mergeAchievements(saved, [])).toEqual(saved);
  });

  it('retroativa: cada nível com a data em que o histórico alcançou a meta', () => {
    const f = facts({ events: days('2026-06-01', 12).map((d) => doneTask(d)) });
    const got = evaluate(f, [], { retroactive: true });
    expect(got.find((a) => a.id === 'maos-a-obra')!.levels).toEqual(['2026-06-10T12:00:00']);
    expect(got.find((a) => a.id === 'primeiro-passo')!.levels).toEqual(['2026-06-01T12:00:00']);
  });

  it('retroativa: data de tarefa no futuro (concluída antes) fica em “agora”', () => {
    const f = facts({ events: [doneTask('2026-12-01')] });
    expect(evaluate(f, [], { retroactive: true })[0]!.levels).toEqual([NOW]);
  });

  it('progresso: valor, meta do próximo nível e nível atual', () => {
    const def = CATALOG_BY_ID.get('maos-a-obra')!;
    const f = facts({ events: days('2026-06-01', 17).map((d) => doneTask(d)) });
    expect(progress(def, f)).toEqual({ value: 17, goal: 10, level: 0, nextLevel: 1 });
    const saved: Achievement = { id: 'maos-a-obra', level: 1, levels: [NOW], featured: false };
    expect(progress(def, f, saved)).toEqual({ value: 17, goal: 50, level: 1, nextLevel: 2 });
    const gold: Achievement = {
      id: 'maos-a-obra',
      level: 3,
      levels: [NOW, NOW, NOW],
      featured: false,
    };
    expect(progress(def, f, gold)).toEqual({ value: 17, goal: 200, level: 3, nextLevel: null });
  });

  it('desempenho: 3000 tarefas, série diária de 2 anos e hábitos de 2 anos em menos de 1 s', () => {
    const events = [
      ...Array.from({ length: 3000 }, (_, i) => doneTask(shiftDay('2025-01-01', i % 600))),
      task({
        id: 'longa',
        start: '2024-11-10T07:00:00',
        end: '2024-11-10T07:30:00',
        recurrence: { freq: 'diaria', interval: 1, end: { kind: 'nunca' } },
      }),
    ];
    const hs = ['a', 'b', 'c'].map((id) =>
      habit(id, {
        rules: [
          {
            since: '2024-11-10',
            repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
            target: null,
            time: null,
          },
        ],
      }),
    );
    const habitLogs = hs.flatMap((h) => logs(h.id, '2024-11-10', 700));
    const start = performance.now();
    const f = facts({ events, habits: hs, habitLogs });
    evaluate(f, [], { retroactive: true });
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe('união entre dispositivos e destaques', () => {
  const a = (id: string, levels: string[], featured = false): Achievement => ({
    id,
    level: levels.length,
    levels,
    featured,
  });

  it('nível mais alto vence; cada nível fica com a data mais antiga; o destaque vem da versão escolhida', () => {
    const device = [
      a('constancia', ['2026-03-01T12:00:00'], true),
      a('ritmo', ['2026-05-01T12:00:00']),
    ];
    const cloud = [
      a('constancia', ['2026-02-01T12:00:00', '2026-04-01T12:00:00']),
      a('hidratado', ['2026-01-01T12:00:00'], true),
    ];
    const merged = unionAchievements(device, cloud);
    expect(merged.find((x) => x.id === 'constancia')).toEqual(
      a('constancia', ['2026-02-01T12:00:00', '2026-04-01T12:00:00'], true),
    );
    expect(merged.find((x) => x.id === 'ritmo')).toEqual(a('ritmo', ['2026-05-01T12:00:00']));
    expect(merged.find((x) => x.id === 'hidratado')!.featured).toBe(false);
    // Simétrica quanto às conquistas (não ao destaque).
    const other = unionAchievements(cloud, device);
    expect(other.map((x) => [x.id, x.level, x.levels]).sort()).toEqual(
      merged.map((x) => [x.id, x.level, x.levels]).sort(),
    );
  });

  it('medalha de um app mais novo (id desconhecido) é mantida', () => {
    const merged = unionAchievements([a('futura', [NOW])], []);
    expect(merged.map((x) => x.id)).toEqual(['futura']);
  });

  it('até 3 destaques: o 4º pede troca; trocar tira o escolhido', () => {
    const list = ['a', 'b', 'c', 'd'].map((id, i) => a(id, [NOW], i < 3));
    expect(setFeatured(list, 'd', true)).toBe('limite');
    const swapped = setFeatured(list, 'd', true, 'b');
    expect(swapped).not.toBe('limite');
    expect((swapped as Achievement[]).filter((x) => x.featured).map((x) => x.id)).toEqual([
      'a',
      'c',
      'd',
    ]);
    expect(
      limitFeatured(list.map((x) => ({ ...x, featured: true }))).filter((x) => x.featured),
    ).toHaveLength(3);
  });

  it('vitrine: as destacadas ou, sem escolha, as 3 mais recentes do catálogo', () => {
    const list = [
      a('ritmo', ['2026-01-01T12:00:00']),
      a('constancia', ['2026-03-01T12:00:00']),
      a('hidratado', ['2026-02-01T12:00:00']),
      a('variedade', ['2026-04-01T12:00:00']),
      a('futura', ['2026-12-01T12:00:00']),
    ];
    expect(showcase(list).map((x) => x.id)).toEqual(['variedade', 'constancia', 'hidratado']);
    expect(showcase([...list, a('maos-a-obra', [NOW], true)]).map((x) => x.id)).toEqual([
      'maos-a-obra',
    ]);
  });
});
