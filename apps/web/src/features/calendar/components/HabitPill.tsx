import { Check } from 'lucide-react';
import type { Habit } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { dayState, isDone, targetOn, valueOn, type HabitContext } from '../../../lib/habits';
import { formatAmount, stateText } from '../../../lib/habits/summary';
import { HABIT_COLOR_CLASS, HABIT_ICON_COMPONENT } from '../../habits/habit-icons';

interface HabitPillProps {
  habit: Habit;
  date: string;
  ctx: HabitContext;
  /** Alterna/avança o hábito manual (só hoje e dias passados). */
  onToggle: (habit: Habit, date: string) => void;
}

/**
 * Pílula de um hábito sem horário na faixa “Hábitos” da Semana: ícone na cor do hábito + nome, com
 * o estado (feito, parcial ou pendente). Hábito de quantidade mostra “valor/meta”; fontes
 * automáticas são somente leitura.
 */
export function HabitPill({ habit, date, ctx, onToggle }: HabitPillProps) {
  const Icon = HABIT_ICON_COMPONENT[habit.icon];
  const done = isDone(habit, date, ctx);
  const state = stateText(dayState(habit, date, ctx));
  const quantity =
    habit.type === 'quantidade'
      ? `${formatAmount(valueOn(habit, date, ctx), habit.unit)}/${formatAmount(targetOn(habit, date), habit.unit)}`
      : null;
  const interactive = habit.source === 'manual' && date <= ctx.today;
  const label = `${habit.name}: ${state}${quantity ? ` (${quantity})` : ''}`;
  const className = cn(
    'inline-flex h-habit-pill max-w-full items-center gap-1 rounded-full px-2 text-2xs font-medium',
    HABIT_COLOR_CLASS[habit.color],
    done ? 'habit-bg text-accent-fg' : 'habit-bg-soft text-fg',
    interactive && 'hover:brightness-125',
  );
  const content = (
    <>
      {done ? (
        <Check aria-hidden strokeWidth={3} className="size-icon-sm shrink-0" />
      ) : (
        <Icon aria-hidden strokeWidth={1.5} className="habit-text size-icon-sm shrink-0" />
      )}
      <span className="truncate">{habit.name}</span>
      {quantity && <span className="shrink-0 tabular-nums opacity-done">{quantity}</span>}
    </>
  );

  return interactive ? (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      title={label}
      onClick={() => onToggle(habit, date)}
      className={className}
    >
      {content}
    </button>
  ) : (
    <span
      role="img"
      aria-label={`${label} (automático ou futuro)`}
      title={label}
      className={className}
    >
      {content}
    </span>
  );
}
