import { useMemo } from 'react';
import type { Habit } from '@daily/shared';
import {
  dayConsistency,
  dayState,
  levelOfRatio,
  levelOn,
  targetOn,
  valueOn,
  weekColumns,
  type HabitContext,
} from '../../lib/habits';
import { formatAmount, formatLongDay, monthlySummary, stateText } from '../../lib/habits/summary';
import { HABIT_COLOR_CLASS } from './habit-icons';
import { HeatGrid, HeatLegend, type CellView } from './HeatGrid';

interface HabitHeatmapProps {
  habit: Habit;
  ctx: HabitContext;
  from: string;
  to: string;
  onDay?: (date: string, anchor: HTMLElement) => void;
}

/** Texto de uma célula do hábito (usado no `aria-label` e no tooltip). */
export function habitCellLabel(habit: Habit, date: string, ctx: HabitContext): string {
  const state = dayState(habit, date, ctx);
  const base = `${formatLongDay(date)} — ${habit.name}: ${stateText(state)}`;
  if (habit.type !== 'quantidade' || state === 'futuro' || state === 'nao-agendado') return base;
  const value = valueOn(habit, date, ctx);
  return `${base} (${formatAmount(value, habit.unit)} de ${formatAmount(targetOn(habit, date), habit.unit)})`;
}

/** Heatmap de um hábito: grade, legenda e a tabela por mês, visualmente oculta. */
export function HabitHeatmap({ habit, ctx, from, to, onDay }: HabitHeatmapProps) {
  const columns = useMemo(() => weekColumns(from, to), [from, to]);
  const summary = useMemo(
    () =>
      monthlySummary(
        habit,
        columns.flat().filter((d) => d >= from && d <= to),
        ctx,
      ),
    [habit, columns, from, to, ctx],
  );
  const color = HABIT_COLOR_CLASS[habit.color];

  const cell = (date: string): CellView => {
    const state = dayState(habit, date, ctx);
    const kind =
      state === 'futuro' ? 'future' : state === 'nao-agendado' ? 'off' : levelOn(habit, date, ctx);
    return { kind, label: habitCellLabel(habit, date, ctx) };
  };

  return (
    <div>
      <HeatGrid
        columns={columns}
        from={from}
        to={to}
        today={ctx.today}
        colorClass={color}
        cell={cell}
        onActivate={onDay}
        caption={`Calendário de ${habit.name}`}
        initialDate={to < ctx.today ? to : ctx.today}
        summary={
          <div className="sr-only">
            <table>
              <caption>{`Resumo mensal de ${habit.name}`}</caption>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Dias agendados</th>
                  <th>Dias cumpridos</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.month}>
                    <td>{row.label}</td>
                    <td>{row.scheduled}</td>
                    <td>{row.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />
      <HeatLegend colorClass={color} />
    </div>
  );
}

interface AggregateHeatmapProps {
  habits: readonly Habit[];
  ctx: HabitContext;
  from: string;
  to: string;
}

/** Heatmap agregado (consistência por dia) na cor do Daily. */
export function AggregateHeatmap({ habits, ctx, from, to }: AggregateHeatmapProps) {
  const columns = useMemo(() => weekColumns(from, to), [from, to]);

  const cell = (date: string): CellView => {
    if (date > ctx.today) return { kind: 'future', label: `${formatLongDay(date)} — dia futuro` };
    const day = dayConsistency(habits, date, ctx);
    if (day.percent === null) {
      return { kind: 'off', label: `${formatLongDay(date)} — nenhum hábito agendado` };
    }
    return {
      kind: levelOfRatio(day.percent / 100),
      label: `${formatLongDay(date)} — ${day.done} de ${day.scheduled} hábitos cumpridos (${day.percent}%)`,
    };
  };

  return (
    <div>
      <HeatGrid
        columns={columns}
        from={from}
        to={to}
        today={ctx.today}
        colorClass="habit-amarelo"
        cell={cell}
        caption="Consistência diária dos hábitos"
        initialDate={to < ctx.today ? to : ctx.today}
      />
      <HeatLegend colorClass="habit-amarelo" />
    </div>
  );
}
