import {
  isExam,
  type Exam,
  type FocusSession,
  type Habit,
  type HabitLog,
  type Preferences,
  type StudyBlock,
  type StudyEvent,
  type WaterLog,
} from '@daily/shared';
import { minutesBetween, parseDayKey, shiftDay, toLocalIso } from '../dates';
import { percentOf } from './format';

export interface StatsData {
  events: readonly StudyEvent[];
  habits: readonly Habit[];
  habitLogs: readonly HabitLog[];
  waterLogs: readonly WaterLog[];
  focusSessions: readonly FocusSession[];
  preferences: Preferences;
}

/** Índices por dia, montados uma vez para as consultas ficarem baratas. */
export interface StatsIndex {
  data: StatsData;
  /** ml por dia. */
  water: Map<string, number>;
  /** Blocos de estudo (não cancelados) por dia. */
  blocks: Map<string, StudyBlock[]>;
}

export function buildIndex(data: StatsData): StatsIndex {
  const water = new Map<string, number>();
  for (const log of data.waterLogs) water.set(log.date, (water.get(log.date) ?? 0) + log.ml);

  const blocks = new Map<string, StudyBlock[]>();
  for (const event of data.events) {
    if (event.type !== 'estudo' || event.status === 'cancelado') continue;
    const key = event.start.slice(0, 10);
    blocks.set(key, [...(blocks.get(key) ?? []), event]);
  }

  return { data, water, blocks };
}

/* ───────────── Semana ───────────── */

/** Segunda a domingo da semana de `today`. */
export function weekDays(today: string): string[] {
  const weekday = parseDayKey(today).getDay(); // 0 = domingo
  const monday = shiftDay(today, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}

export interface DayHours {
  day: string;
  plannedMin: number;
  doneMin: number;
}

/** Horas planejadas e concluídas por dia, contando blocos de estudo e revisões (não cancelados). */
export function studyHoursByDay(
  events: readonly StudyEvent[],
  days: readonly string[],
): DayHours[] {
  const map = new Map<string, DayHours>(
    days.map((day) => [day, { day, plannedMin: 0, doneMin: 0 }]),
  );
  for (const event of events) {
    if ((event.type !== 'estudo' && event.type !== 'revisao') || event.status === 'cancelado')
      continue;
    const entry = map.get(event.start.slice(0, 10));
    if (!entry) continue;
    const minutes = minutesBetween(event.start, event.end);
    entry.plannedMin += minutes;
    if (event.status === 'concluido') entry.doneMin += minutes;
  }
  return days.map((day) => map.get(day) as DayHours);
}

export const sumBy = <T>(items: readonly T[], pick: (item: T) => number): number =>
  items.reduce((total, item) => total + pick(item), 0);

/** Soma do tempo de foco (segundos) por dia de início. */
export function focusSecondsByDay(
  sessions: readonly FocusSession[],
  days: readonly string[],
): { day: string; seconds: number }[] {
  const totals = new Map<string, number>(days.map((day) => [day, 0]));
  for (const session of sessions) {
    const key = session.startedAt.slice(0, 10);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + session.actualSec);
  }
  return days.map((day) => ({ day, seconds: totals.get(day) ?? 0 }));
}

/* ───────────── Água ───────────── */

export const waterOn = (index: StatsIndex, day: string): number => index.water.get(day) ?? 0;

/** % da meta de água (limitado a 100). */
export const waterPercent = (ml: number, goalMl: number): number => percentOf(ml, goalMl);

/* ───────────── Provas ───────────── */

/** A primeira prova futura que não foi cancelada. */
export function nextExam(events: readonly StudyEvent[], now: Date): Exam | undefined {
  const nowIso = toLocalIso(now);
  return events
    .filter(isExam)
    .filter((exam) => exam.status !== 'cancelado' && exam.end >= nowIso)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}

export interface ExamPrep {
  exam: Exam;
  done: number;
  total: number;
  percent: number;
  /** “Adicione conteúdos” quando a prova não tem nenhum. */
  hint: string | null;
}

export function examPrep(exam: Exam): ExamPrep {
  const total = exam.contents.length;
  const done = exam.contents.filter((c) => c.done).length;
  return {
    exam,
    done,
    total,
    percent: percentOf(done, total),
    hint: total === 0 ? 'Adicione conteúdos' : null,
  };
}

/** Próximas provas (futuras, não canceladas) com a preparação de cada uma. */
export function upcomingPreps(events: readonly StudyEvent[], now: Date, limit = 5): ExamPrep[] {
  const nowIso = toLocalIso(now);
  return events
    .filter(isExam)
    .filter((exam) => exam.status !== 'cancelado' && exam.end >= nowIso)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit)
    .map(examPrep);
}

/* ───────────── Variação ───────────── */

export interface Variation {
  delta: number;
  /** `null` quando o período anterior foi zero (não há base de comparação). */
  percent: number | null;
}

export function variation(current: number, previous: number): Variation {
  return {
    delta: current - previous,
    percent: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
  };
}
