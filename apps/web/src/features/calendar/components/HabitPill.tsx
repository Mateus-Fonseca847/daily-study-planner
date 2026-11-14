import { Check } from 'lucide-react';
import type { Habit } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { usePhone } from '../../../lib/responsive/use-media';
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
  const phone = usePhone();
  const done = isDone(habit, date, ctx);
  const state = stateText(dayState(habit, date, ctx));
  // Na pílula, só “valor/meta” (a unidade fica no rótulo e no tooltip).
  const value = valueOn(habit, date, ctx);
  const target = targetOn(habit, date);
  const quantity =
    habit.type === 'quantidade' ? `${formatAmount(value, '')}/${formatAmount(target, '')}` : null;
  const quantityLong =
    habit.type === 'quantidade'
      ? `${formatAmount(value, habit.unit)}/${formatAmount(target, habit.unit)}`
      : null;
  const interactive = habit.source === 'manual' && date <= ctx.today;
  const label = `${habit.name}: ${state}${quantityLong ? ` (${quantityLong})` : ''}`;
  const className = cn(
    'flex h-habit-pill items-center gap-1 rounded-full text-2xs font-medium',
    phone ? 'size-touch-dense justify-center' : 'w-full px-2',
    HABIT_COLOR_CLASS[habit.color],
    done ? 'habit-bg text-on-habit' : 'habit-bg-soft text-fg',
    interactive && 'hover:brightness-125',
  );
  const content = (
    <>
      {done ? (
        <Check aria-hidden strokeWidth={3} className="size-icon-sm shrink-0" />
      ) : (
        <Icon aria-hidden strokeWidth={1.5} className="habit-text size-icon-sm shrink-0" />
      )}
      {!phone && <span className="min-w-0 flex-1 truncate">{habit.name}</span>}
      {!phone && quantity && <span className="shrink-0 tabular-nums">{quantity}</span>}
    </>
  );

  return interactive ? (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      title={label}
      data-touch="dense"
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
