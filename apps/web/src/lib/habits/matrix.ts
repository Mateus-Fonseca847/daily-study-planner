import type { Habit } from '@daily/shared';
import { parseDayKey, shiftDay } from '../dates';
import type { HabitContext } from './context';
import { dayState, levelOn, targetOn, valueOn, type DayState, type Level } from './engine';

export interface HeatCell {
  date: string;
  state: DayState;
  level: Level;
  value: number;
  target: number;
  /** Dentro do intervalo pedido (as pontas da primeira/última semana ficam de fora). */
  inRange: boolean;
}

/** Domingo da semana de `date`. */
export const weekStart = (date: string): string => shiftDay(date, -parseDayKey(date).getDay());

/** Colunas de semanas (domingo a sábado) cobrindo `[from, to]`. */
export function weekColumns(from: string, to: string): string[][] {
  const columns: string[][] = [];
  for (let start = weekStart(from); start <= to; start = shiftDay(start, 7)) {
    columns.push(Array.from({ length: 7 }, (_, i) => shiftDay(start, i)));
  }
  return columns;
}

/** Matriz do heatmap de um hábito: colunas de semanas, 7 células cada. */
export function heatmapMatrix(
  habit: Habit,
  from: string,
  to: string,
  ctx: HabitContext,
): HeatCell[][] {
  return weekColumns(from, to).map((week) =>
    week.map((date) => ({
      date,
      state: dayState(habit, date, ctx),
      level: levelOn(habit, date, ctx),
      value: valueOn(habit, date, ctx),
      target: targetOn(habit, date),
      inRange: date >= from && date <= to,
    })),
  );
}
