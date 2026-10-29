import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { StudyEvent } from '@daily/shared';

export interface GridDay {
  date: Date;
  /** Chave `yyyy-MM-dd`, usada para agrupar eventos. */
  key: string;
  inMonth: boolean;
}

export const dayKey = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Semanas (domingo a sábado) que cobrem o mês, incluindo dias dos meses vizinhos. */
export function buildMonthGrid(month: Date): GridDay[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  }).map((date) => ({ date, key: dayKey(date), inMonth: isSameMonth(date, month) }));

  const weeks: GridDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** Agrupa por dia (`yyyy-MM-dd`), ordenando por horário de início. */
export function groupEventsByDay(events: readonly StudyEvent[]): Map<string, StudyEvent[]> {
  const byDay = new Map<string, StudyEvent[]>();
  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    const key = event.start.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }
  return byDay;
}
