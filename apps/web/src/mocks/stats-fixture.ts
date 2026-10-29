import {
  createInitialSnapshot,
  dataSnapshotSchema,
  EVERY_DAY,
  habitLogId,
  habitSchema,
  studyEventSchema,
  type ActiveFocus,
  type DataSnapshot,
  type FocusSession,
  type Habit,
  type HabitLog,
  type StudyEvent,
  type WaterLog,
} from '@daily/shared';
import { dayKey, shiftDay } from '../lib/dates';
import { STATS_NOW } from '../lib/fixture';
import { createIdleSession, iniciar, NO_LINK } from '../lib/focus/session';
import { TAB_ID } from '../lib/tab-id';
import { SUBJECTS } from './subjects';

/** Gerador pseudoaleatório determinístico (LCG): a fixture é sempre igual. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const at = (day: string, hour: number, minute = 0) => `${day}T${pad(hour)}:${pad(minute)}:00`;

/** Quantos dias de histórico a fixture gera antes de “hoje”. */
const HISTORY_DAYS = 150;
/** Dias recentes em que todos os hábitos agendados foram cumpridos (sequência atual). */
const CURRENT_STREAK_DAYS = 6;
/** Uma sequência antiga e mais longa (melhor sequência): de `OLD_RUN_START` a `OLD_RUN_START − 8`. */
const OLD_RUN_START = 30;
const OLD_RUN_LENGTH = 9;

export function statsSnapshot(now: Date = STATS_NOW): DataSnapshot {
  const today = dayKey(now);
  const random = rng(42);
  const events: StudyEvent[] = [];
  const habitLogs: HabitLog[] = [];
  const waterLogs: WaterLog[] = [];
  const focusSessions: FocusSession[] = [];
  let uid = 0;
  const id = (prefix: string) => `${prefix}-${++uid}`;

  const pushEvent = (event: Record<string, unknown>) =>
    events.push(studyEventSchema.parse({ notes: '', subjectId: 'mat', ...event }));

  // ── Próximas provas (a primeira: 3/5 conteúdos, em 4 dias) ──
  const contents = (prefix: string, titles: string[], done: number) =>
    titles.map((title, order) => ({ id: `${prefix}-c${order}`, title, done: order < done, order }));
  pushEvent({
    id: 'fx-exam-1',
    type: 'prova',
    title: 'Prova de Cálculo II',
    start: at(shiftDay(today, 4), 9, 30),
    end: at(shiftDay(today, 4), 11, 30),
    status: 'pendente',
    contents: contents(
      'e1',
      ['Limites', 'Derivadas', 'Regra da cadeia', 'Integrais', 'Aplicações'],
      3,
    ),
  });
  pushEvent({
    id: 'fx-exam-2',
    type: 'prova',
    title: 'Prova de Química Orgânica',
    subjectId: 'qui',
    start: at(shiftDay(today, 10), 14),
    end: at(shiftDay(today, 10), 16),
    status: 'pendente',
    contents: contents('e2', ['Funções orgânicas', 'Isomeria', 'Reações', 'Nomenclatura'], 1),
  });
  pushEvent({
    id: 'fx-exam-3',
    type: 'prova',
    title: 'Prova de História Moderna',
    subjectId: 'his',
    start: at(shiftDay(today, 17), 8),
    end: at(shiftDay(today, 17), 10),
    status: 'pendente',
    contents: [],
  });

  // ── Hoje: eventos às 10h e 11h ──
  pushEvent({
    id: 'fx-today-1',
    type: 'estudo',
    title: 'Lista de limites',
    start: at(today, 10),
    end: at(today, 11),
    status: 'em-andamento',
  });
  pushEvent({
    id: 'fx-today-2',
    type: 'revisao',
    title: 'Revisar fichamento',
    subjectId: 'his',
    start: at(today, 11),
    end: at(today, 12),
    status: 'pendente',
  });

  // ── Resto da semana (seg–dom): planejado e concluído ──
  const weekPlan: [number, string, number, number, string, string][] = [
    // [deslocamento a partir de hoje, tipo, hora, duração (min), status, matéria]
    [-1, 'estudo', 14, 120, 'concluido', 'mat'],
    [-1, 'revisao', 19, 30, 'concluido', 'fis'],
    [1, 'estudo', 15, 120, 'pendente', 'mat'],
    [2, 'revisao', 18, 60, 'pendente', 'qui'],
    [3, 'estudo', 14, 150, 'pendente', 'mat'],
  ];
  weekPlan.forEach(([offset, type, hour, minutes, status, subjectId], index) => {
    const day = shiftDay(today, offset);
    const end = hour * 60 + minutes;
    pushEvent({
      id: `fx-week-${index}`,
      type,
      title: type === 'estudo' ? 'Bloco de estudo' : 'Revisão',
      subjectId,
      start: at(day, hour),
      end: at(day, Math.floor(end / 60), end % 60),
      status,
    });
  });

  // ── Histórico (HISTORY_DAYS dias): blocos, água, metas manuais e sessões de foco ──
  const since = shiftDay(today, -HISTORY_DAYS - 5);
  const rule = (
    repeat: Habit['rules'][number]['repeat'],
    target: number | null,
    time: string | null,
    duration = 60,
  ) => ({
    since,
    repeat,
    target,
    time: time === null ? null : { start: time, durationMin: duration },
  });
  const habits: Habit[] = [
    {
      id: 'fx-gym',
      name: 'Musculação',
      icon: 'dumbbell',
      color: 'laranja',
      type: 'check',
      unit: '',
      source: 'manual',
      rules: [rule({ kind: 'dias-da-semana', days: [1, 3, 5] }, null, '07:00')],
    },
    {
      id: 'fx-water',
      name: 'Hidratação',
      icon: 'droplets',
      color: 'azul',
      type: 'quantidade',
      unit: 'ml',
      source: 'agua',
      rules: [rule(EVERY_DAY, 2000, null)],
    },
    {
      id: 'fx-fight',
      name: 'Luta',
      icon: 'swords',
      color: 'violeta',
      type: 'check',
      unit: '',
      source: 'manual',
      rules: [rule({ kind: 'dias-da-semana', days: [2, 4] }, null, '19:00', 90)],
    },
    {
      id: 'fx-study',
      name: 'Estudo',
      icon: 'book-open',
      color: 'verde',
      type: 'quantidade',
      unit: 'min',
      source: 'foco',
      rules: [rule({ kind: 'dias-da-semana', days: [1, 2, 3, 4, 5] }, 60, null)],
    },
  ].map((h, order) =>
    habitSchema.parse({ ...h, createdAt: at(since, 8), archivedAt: null, endsOn: null, order }),
  );
  const logHabit = (habitId: string, day: string, value = 1) =>
    habitLogs.push({
      id: habitLogId(habitId, day),
      habitId,
      date: day,
      value,
      updatedAt: at(day, 21),
    });
  const gymDays = new Set([1, 3, 5]);
  const fightDays = new Set([2, 4]);
  for (let back = 1; back <= HISTORY_DAYS; back += 1) {
    const day = shiftDay(today, -back);
    const forcedFull =
      back <= CURRENT_STREAK_DAYS ||
      (back >= OLD_RUN_START && back < OLD_RUN_START + OLD_RUN_LENGTH);
    const goodDay = forcedFull || random() < 0.55;

    // Blocos de estudo concluídos (ou não) — também alimentam a meta "auto-estudo".
    {
      const blocks = random() < 0.8 ? 1 + Math.floor(random() * 2) : 0;
      for (let b = 0; b < blocks; b += 1) {
        const hour = 9 + b * 4 + Math.floor(random() * 2);
        const minutes = 60 + Math.floor(random() * 3) * 30;
        const subjectId = SUBJECTS[Math.floor(random() * SUBJECTS.length)]?.id ?? 'mat';
        const doneBlock = goodDay || random() < 0.7;
        pushEvent({
          id: id('fx-h'),
          type: 'estudo',
          title: 'Bloco de estudo',
          subjectId,
          start: at(day, hour),
          end: at(day, hour + Math.floor(minutes / 60), minutes % 60),
          status: doneBlock ? 'concluido' : 'pendente',
        });
      }
    }

    // Água: dia bom bate a meta; os outros ficam entre 40 % e 95 %.
    const ml = goodDay
      ? 2000 + Math.floor(random() * 3) * 250
      : Math.floor((800 + random() * 1100) / 50) * 50;
    let left = ml;
    let hour = 7;
    while (left > 0) {
      const portion = Math.min(left, 250);
      waterLogs.push({
        id: id('fx-w'),
        date: day,
        ml: portion,
        time: `${pad(hour)}:${pad(Math.floor(random() * 60))}`,
      });
      left -= portion;
      hour = Math.min(22, hour + 2);
    }

    // Hábitos manuais (só nos dias agendados; dia bom cumpre tudo, os outros falham com frequência).
    const weekday = new Date(`${day}T00:00:00`).getDay();
    if (gymDays.has(weekday) && (goodDay || random() < 0.5)) logHabit('fx-gym', day);
    if (fightDays.has(weekday) && (goodDay || random() < 0.6)) logHabit('fx-fight', day);

    // Sessões de foco.
    if (forcedFull || random() < 0.75) {
      const sessions = forcedFull ? 2 : 1 + Math.floor(random() * 2);
      for (let s = 0; s < sessions; s += 1) {
        const planned = (forcedFull ? 50 : random() < 0.5 ? 25 : 50) * 60;
        const finished = forcedFull || random() < 0.8;
        focusSessions.push({
          id: id('fx-f'),
          startedAt: at(day, 9 + s * 5, Math.floor(random() * 4) * 15),
          plannedSec: planned,
          actualSec: finished ? planned : Math.floor(planned * (0.3 + random() * 0.5)),
          status: finished ? 'concluida' : 'interrompida',
          subjectId: null,
          examId: null,
          blockId: null,
        });
      }
    }
  }

  // ── Hoje: 700 ml de água, 25 min de foco e a luta já feita ──
  waterLogs.push(
    { id: 'fx-w-today-1', date: today, ml: 250, time: '07:40' },
    { id: 'fx-w-today-2', date: today, ml: 250, time: '09:15' },
    { id: 'fx-w-today-3', date: today, ml: 200, time: '10:05' },
  );
  logHabit('fx-fight', today);
  focusSessions.push({
    id: 'fx-f-today',
    startedAt: at(today, 8, 30),
    plannedSec: 25 * 60,
    actualSec: 25 * 60,
    status: 'concluida',
    subjectId: null,
    examId: null,
    blockId: null,
  });

  const base = createInitialSnapshot();
  return dataSnapshotSchema.parse({
    ...base,
    preferences: { ...base.preferences, name: 'Ana' },
    subjects: [...SUBJECTS],
    events,
    habits,
    habitLogs,
    waterLogs,
    focusSessions,
  });
}

/** Fixture `?fixture=focus`: uma sessão de 25 min rodando há 8 min, com o app travado. */
export function runningLockedSession(nowMs: number): ActiveFocus {
  const idle = createIdleSession({
    id: 'fx-focus-active',
    seconds: 25 * 60,
    tabId: TAB_ID,
    locked: true,
    link: NO_LINK,
  });
  return iniciar(idle, nowMs - 8 * 60_000);
}
