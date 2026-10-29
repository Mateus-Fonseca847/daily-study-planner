import type { FocusSession, StudyEvent, Subject } from '@daily/shared';
import { minutesBetween, parseDayKey, shiftDay } from '../dates';
import {
  focusSecondsByDay,
  goalsSummary,
  isDayClosed,
  studyHoursByDay,
  sumBy,
  variation,
  type StatsIndex,
  type Variation,
} from './derive';

/** Janela da seção “Análises”. */
export type Period = 'semana' | 'mes' | '90d';

export const PERIOD_DAYS: Record<Period, number> = { semana: 7, mes: 30, '90d': 90 };
/** No período de 90 dias os gráficos agrupam por semana. */
export const WEEK_BUCKET_DAYS = 7;
export const HEATMAP_WEEKS = 12;

const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

/** Os dias do período (terminando hoje) e os do período anterior, de mesmo tamanho. */
export function periodRange(period: Period, today: string): { days: string[]; previous: string[] } {
  const length = PERIOD_DAYS[period];
  const days = Array.from({ length }, (_, i) => shiftDay(today, i - (length - 1)));
  const previous = Array.from({ length }, (_, i) => shiftDay(today, i - (2 * length - 1)));
  return { days, previous };
}

export interface Bucket {
  label: string;
  /** Rótulo completo para leitores de tela. */
  fullLabel: string;
  days: string[];
}

const dayMonth = (key: string): string => {
  const [, month, day] = key.split('-');
  return `${day}/${month}`;
};

/** Um balde por dia (semana e mês) ou por semana (90 dias). */
export function bucketsFor(period: Period, days: readonly string[]): Bucket[] {
  if (period === '90d') {
    const out: Bucket[] = [];
    for (let i = 0; i < days.length; i += WEEK_BUCKET_DAYS) {
      const chunk = days.slice(i, i + WEEK_BUCKET_DAYS);
      const first = chunk[0] as string;
      out.push({ label: dayMonth(first), fullLabel: `semana de ${dayMonth(first)}`, days: chunk });
    }
    return out;
  }
  return days.map((day) => {
    const weekday = WEEKDAY_SHORT[parseDayKey(day).getDay()] as string;
    return {
      label: period === 'semana' ? weekday : day.slice(8),
      fullLabel: `${weekday}, ${dayMonth(day)}`,
      days: [day],
    };
  });
}

export interface SeriesItem {
  label: string;
  fullLabel: string;
  /** Valor “cheio” (planejado, quando existe). */
  planned?: number;
  value: number;
}

export interface HoursAnalysis {
  items: SeriesItem[];
  doneMin: number;
  plannedMin: number;
  variation: Variation;
}

/** Horas estudadas (blocos de estudo e revisões): planejado vs concluído, com variação. */
export function hoursAnalysis(
  events: readonly StudyEvent[],
  period: Period,
  today: string,
): HoursAnalysis {
  const { days, previous } = periodRange(period, today);
  const current = studyHoursByDay(events, days);
  const before = studyHoursByDay(events, previous);
  const items = bucketsFor(period, days).map((bucket) => {
    const rows = current.filter((row) => bucket.days.includes(row.day));
    return {
      label: bucket.label,
      fullLabel: bucket.fullLabel,
      planned: sumBy(rows, (r) => r.plannedMin),
      value: sumBy(rows, (r) => r.doneMin),
    };
  });
  const doneMin = sumBy(current, (r) => r.doneMin);
  return {
    items,
    doneMin,
    plannedMin: sumBy(current, (r) => r.plannedMin),
    variation: variation(
      doneMin,
      sumBy(before, (r) => r.doneMin),
    ),
  };
}

export interface FocusAnalysis {
  items: SeriesItem[];
  totalSec: number;
  concluded: number;
  interrupted: number;
  variation: Variation;
}

/** Tempo focado por dia (ou semana) e quantas sessões terminaram ou foram interrompidas. */
export function focusAnalysis(
  sessions: readonly FocusSession[],
  period: Period,
  today: string,
): FocusAnalysis {
  const { days, previous } = periodRange(period, today);
  const current = focusSecondsByDay(sessions, days);
  const items = bucketsFor(period, days).map((bucket) => ({
    label: bucket.label,
    fullLabel: bucket.fullLabel,
    value: sumBy(
      current.filter((row) => bucket.days.includes(row.day)),
      (r) => r.seconds,
    ),
  }));
  const inRange = (session: FocusSession) => days.includes(session.startedAt.slice(0, 10));
  const totalSec = sumBy(current, (r) => r.seconds);
  return {
    items,
    totalSec,
    concluded: sessions.filter((s) => inRange(s) && s.status === 'concluida').length,
    interrupted: sessions.filter((s) => inRange(s) && s.status === 'interrompida').length,
    variation: variation(
      totalSec,
      sumBy(focusSecondsByDay(sessions, previous), (r) => r.seconds),
    ),
  };
}

export interface SubjectHours {
  subject: Subject;
  minutes: number;
}

/** Horas concluídas em blocos de estudo por matéria, da maior para a menor (só matérias com horas). */
export function hoursBySubject(
  events: readonly StudyEvent[],
  subjects: readonly Subject[],
  days: readonly string[],
): SubjectHours[] {
  const inRange = new Set(days);
  return subjects
    .map((subject) => ({
      subject,
      minutes: sumBy(
        events.filter(
          (e) =>
            e.type === 'estudo' &&
            e.status === 'concluido' &&
            e.subjectId === subject.id &&
            inRange.has(e.start.slice(0, 10)),
        ),
        (e) => minutesBetween(e.start, e.end),
      ),
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

export interface HeatCell {
  day: string;
  /** % de metas cumpridas (null = sem metas ativas ou dia futuro). */
  percent: number | null;
}

/** Mapa de calor: `HEATMAP_WEEKS` semanas (colunas, segunda a domingo) terminando na semana atual. */
export function goalsHeatmap(index: StatsIndex, today: string): HeatCell[][] {
  const weekday = parseDayKey(today).getDay();
  const thisMonday = shiftDay(today, -((weekday + 6) % 7));
  const firstMonday = shiftDay(thisMonday, -7 * (HEATMAP_WEEKS - 1));
  return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = shiftDay(firstMonday, week * 7 + d);
      if (day > today) return { day, percent: null };
      const summary = goalsSummary(index, day);
      return { day, percent: summary.total === 0 ? null : summary.percent };
    }),
  );
}

/** Dias fechados (todas as metas cumpridas) no período — usado só em textos de resumo. */
export const closedDaysIn = (index: StatsIndex, days: readonly string[]): number =>
  days.filter((day) => isDayClosed(goalsSummary(index, day))).length;
