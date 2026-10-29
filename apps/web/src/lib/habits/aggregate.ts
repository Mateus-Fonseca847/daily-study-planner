import type { Habit } from '@daily/shared';
import { daysBetween, shiftDay } from '../dates';
import type { HabitContext } from './context';
import { dayState, firstDay, levelOfRatio, MAX_LOOKBACK_DAYS, type Level } from './engine';
import { weekColumns } from './matrix';

export interface DayConsistency {
  scheduled: number;
  done: number;
  /** % dos hábitos agendados cumpridos; `null` = nenhum hábito agendado (`sem-habitos`, neutro). */
  percent: number | null;
}

/** % dos hábitos agendados em `date` que foram cumpridos. */
export function dayConsistency(
  habits: readonly Habit[],
  date: string,
  ctx: HabitContext,
): DayConsistency {
  let scheduled = 0;
  let done = 0;
  for (const habit of habits) {
    const state = dayState(habit, date, ctx);
    if (state === 'nao-agendado' || state === 'futuro') continue;
    scheduled += 1;
    if (state === 'feito') done += 1;
  }
  return {
    scheduled,
    done,
    percent: scheduled === 0 ? null : Math.round((done / scheduled) * 100),
  };
}

export interface GeneralStreak {
  current: number;
  best: number;
}

/**
 * Sequência geral: dias seguidos com **todos** os hábitos agendados cumpridos. Dias sem hábito
 * agendado são neutros; hoje ainda incompleto não quebra a sequência.
 */
export function generalStreaks(habits: readonly Habit[], ctx: HabitContext): GeneralStreak {
  if (habits.length === 0) return { current: 0, best: 0 };
  const start = habits.map(firstDay).sort()[0] ?? ctx.today;
  const span = Math.min(MAX_LOOKBACK_DAYS, Math.max(0, daysBetween(start, ctx.today)));
  const first = shiftDay(ctx.today, -span);

  let best = 0;
  let run = 0;
  for (let i = 0; i <= span; i += 1) {
    const date = shiftDay(first, i);
    const { percent } = dayConsistency(habits, date, ctx);
    if (percent === null) continue;
    if (percent === 100) {
      run += 1;
      best = Math.max(best, run);
    } else if (date !== ctx.today) {
      run = 0;
    }
  }
  return { current: run, best };
}

export interface AggregateCell {
  date: string;
  /** `null` = sem hábitos agendados (ou dia futuro). */
  percent: number | null;
  level: Level;
  scheduled: number;
  done: number;
  future: boolean;
  inRange: boolean;
}

/** Matriz do heatmap agregado (consistência por dia). */
export function aggregateMatrix(
  habits: readonly Habit[],
  from: string,
  to: string,
  ctx: HabitContext,
): AggregateCell[][] {
  return weekColumns(from, to).map((week) =>
    week.map((date) => {
      const future = date > ctx.today;
      const day = future
        ? { scheduled: 0, done: 0, percent: null }
        : dayConsistency(habits, date, ctx);
      return {
        date,
        percent: day.percent,
        level: day.percent === null ? 0 : levelOfRatio(day.percent / 100),
        scheduled: day.scheduled,
        done: day.done,
        future,
        inRange: date >= from && date <= to,
      };
    }),
  );
}

/** Hábitos cumpridos ÷ hábitos agendados nos últimos `days` dias (0–100), ou `null`. */
export function generalRate(
  habits: readonly Habit[],
  ctx: HabitContext,
  days: number,
): number | null {
  let done = 0;
  let scheduled = 0;
  for (let back = 0; back < days; back += 1) {
    const day = dayConsistency(habits, shiftDay(ctx.today, -back), ctx);
    done += day.done;
    scheduled += day.scheduled;
  }
  return scheduled === 0 ? null : Math.round((done / scheduled) * 100);
}
