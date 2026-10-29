import { Check, Minus, Plus } from 'lucide-react';
import type { Habit } from '@daily/shared';
import { cn } from '../../lib/cn';
import { useData } from '../../lib/data/app-store';
import type { HabitContext } from '../../lib/habits';
import { isDone, targetOn, valueOn } from '../../lib/habits';
import { formatAmount } from '../../lib/habits/summary';

const SOURCE_TEXT = {
  agua: 'Automático: água do dia',
  foco: 'Automático: tempo de foco',
  blocos: 'Automático: blocos de estudo',
} as const;

/** Passo do +/− nos hábitos de quantidade (cresce com a meta para não exigir cliques demais). */
export const stepFor = (target: number): number => (target >= 1000 ? 250 : target >= 100 ? 10 : 1);

interface HabitControlProps {
  habit: Habit;
  date: string;
  ctx: HabitContext;
  now: Date;
}

/** Controle do dia: check, − / valor / + (manuais) ou a origem e o valor (fontes automáticas). */
export function HabitControl({ habit, date, ctx, now }: HabitControlProps) {
  const setHabitValue = useData((s) => s.setHabitValue);
  const value = valueOn(habit, date, ctx);
  const target = targetOn(habit, date);
  const done = isDone(habit, date, ctx);

  if (habit.source !== 'manual') {
    return (
      <span className="flex items-center gap-2 text-xs text-muted">
        <span>{SOURCE_TEXT[habit.source]}</span>
        <span
          role="img"
          aria-label={done ? 'Cumprido automaticamente' : 'Ainda não cumprido (automático)'}
          className={cn(
            'inline-flex size-goal-check shrink-0 items-center justify-center rounded-full',
            done ? 'bg-accent text-accent-fg' : 'bg-chart-track',
          )}
        >
          {done && <Check aria-hidden strokeWidth={3} className="size-icon-sm" />}
        </span>
      </span>
    );
  }

  if (habit.type === 'check') {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${habit.name}: feito hoje`}
        onClick={() => setHabitValue(habit.id, date, done ? 0 : 1, now)}
        className={cn(
          'inline-flex size-goal-check shrink-0 items-center justify-center rounded-full',
          done ? 'bg-accent text-accent-fg' : 'bg-chart-track-strong',
        )}
      >
        {done && <Check aria-hidden strokeWidth={3} className="size-icon-sm" />}
      </button>
    );
  }

  const step = stepFor(target);
  return (
    <span
      className="flex items-center gap-2"
      role="group"
      aria-label={`${habit.name}: valor de hoje`}
    >
      <button
        type="button"
        aria-label={`Diminuir ${formatAmount(step, habit.unit)}`}
        disabled={value <= 0}
        onClick={() => setHabitValue(habit.id, date, Math.max(0, value - step), now)}
        className="inline-flex size-goal-check items-center justify-center rounded-full bg-chart-track-strong disabled:opacity-dimmed"
      >
        <Minus aria-hidden strokeWidth={2} className="size-icon-sm" />
      </button>
      <span className="min-w-12 text-center text-md tabular-nums">
        {formatAmount(value, habit.unit)}
        <span className="text-xs text-muted"> / {target}</span>
      </span>
      <button
        type="button"
        aria-label={`Aumentar ${formatAmount(step, habit.unit)}`}
        onClick={() => setHabitValue(habit.id, date, value + step, now)}
        className="inline-flex size-goal-check items-center justify-center rounded-full bg-chart-track-strong"
      >
        <Plus aria-hidden strokeWidth={2} className="size-icon-sm" />
      </button>
    </span>
  );
}
