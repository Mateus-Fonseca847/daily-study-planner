import { addMinutes, parseISO } from 'date-fns';
import type { Habit, StudyEvent } from '@daily/shared';
import { toLocalIso } from '../../../lib/dates';
import { isScheduled, ruleOn, type HabitContext } from '../../../lib/habits';
import {
  eventSegments,
  hourRange,
  layoutSobreposicoes,
  mergeRanges,
  segmentOnDay,
  type HourRange,
  type Placed,
  type Segment,
} from './time-layout';

/** Item da grade: um evento ou um hábito com horário (os dois usam o mesmo layout de sobreposição). */
export type GridItem =
  (Segment & { kind: 'event'; event: StudyEvent }) | (Segment & { kind: 'habit'; habit: Habit });

export type PlacedItem = Placed<GridItem>;

export interface GridColumn {
  date: string;
  items: PlacedItem[];
}

/** Hábitos agendados no dia com horário: viram segmentos da grade (cortados na meia-noite). */
export function timedHabitSegments(
  habits: readonly Habit[],
  day: string,
  ctx: HabitContext,
): GridItem[] {
  return habits.flatMap((habit) => {
    const time = ruleOn(habit, day)?.time;
    if (!time || !isScheduled(habit, day, ctx)) return [];
    const start = `${day}T${time.start}:00`;
    const end = toLocalIso(addMinutes(parseISO(start), time.durationMin));
    const segment = segmentOnDay(`h:${habit.id}`, start, end, day);
    return segment ? [{ ...segment, kind: 'habit' as const, habit }] : [];
  });
}

/** Hábitos agendados no dia **sem** horário (vão para a faixa “Hábitos”). */
export const untimedHabits = (habits: readonly Habit[], day: string, ctx: HabitContext): Habit[] =>
  habits.filter((habit) => isScheduled(habit, day, ctx) && !ruleOn(habit, day)?.time);

/**
 * Colunas da grade (um dia cada), já com o layout de sobreposição, e o intervalo de horas comum a
 * todas elas (06h–24h, expandido se algum item sai desse intervalo).
 */
export function buildGridColumns(
  days: readonly string[],
  events: readonly StudyEvent[],
  habits: readonly Habit[],
  ctx: HabitContext,
): { columns: GridColumn[]; range: HourRange } {
  const raw = days.map((date) => {
    const items: GridItem[] = [
      ...eventSegments(events, date).map((segment) => {
        const event = events.find((e) => e.id === segment.id)!;
        return { ...segment, kind: 'event' as const, event };
      }),
      ...timedHabitSegments(habits, date, ctx),
    ];
    return { date, items };
  });
  const range = mergeRanges(raw.map((column) => hourRange(column.items)));
  return {
    columns: raw.map(({ date, items }) => ({ date, items: layoutSobreposicoes(items) })),
    range,
  };
}
