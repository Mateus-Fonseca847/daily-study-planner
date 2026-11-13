import { Check } from 'lucide-react';
import type { Habit, StudyEvent } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { usePhone } from '../../../lib/responsive/use-media';
import { chipStyle, EVENT_TYPE_META } from '../../../lib/event-meta';
import { dayState, isDone, targetOn, valueOn, type HabitContext } from '../../../lib/habits';
import { formatAmount, stateText } from '../../../lib/habits/summary';
import { HABIT_COLOR_CLASS, HABIT_ICON_COMPONENT } from '../../habits/habit-icons';
import { blockLines } from '../lib/time-layout';
import type { PlacedItem } from '../lib/grid-items';
import { itemTime } from './TimeGrid';

interface EventBlockProps {
  item: Extract<PlacedItem, { kind: 'event' }>;
  selected: boolean;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
}

/** Bloco de evento: mesmo estilo dos chips do mês; 3, 2 ou 1 linha conforme a altura disponível. */
export function EventBlock({ item, selected, onSelect }: EventBlockProps) {
  const { event } = item;
  const meta = EVENT_TYPE_META[event.type];
  const style = chipStyle(event);
  const Icon = meta.icon;
  const phone = usePhone();
  // Celular: no máximo 2 linhas, e blocos simultâneos (colunas estreitas) viram só a faixa colorida.
  const narrow = phone && item.columns > 1;
  const lines = phone ? Math.min(blockLines(item), 2) : blockLines(item);
  const time = itemTime(item);
  const finished = event.status === 'concluido' || event.status === 'cancelado';
  return (
    <button
      type="button"
      aria-label={`${meta.label}: ${event.title}, ${time}`}
      title={`${event.title} · ${time}`}
      aria-expanded={selected}
      data-touch={narrow ? 'grid' : 'dense'}
      onClick={(e) => onSelect(event, e.currentTarget)}
      className={cn(
        'flex size-full min-w-0 flex-col justify-start overflow-hidden rounded-sm border-l-stripe px-2 py-chip-y text-left phone:px-1 transition-[filter] hover:brightness-125',
        style.chip,
        finished && 'opacity-done',
        selected && 'brightness-150',
      )}
    >
      {!narrow && lines === 3 && (
        <span className={cn('flex items-center gap-1 text-2xs font-medium lowercase', style.text)}>
          <Icon aria-hidden strokeWidth={1.5} className="size-icon-sm shrink-0" />
          <span className="truncate">{meta.label}</span>
        </span>
      )}
      {!narrow && (
        <span
          className={cn(
            'truncate text-sm font-semibold text-fg phone:text-xs',
            finished && 'line-through',
          )}
        >
          {event.title}
        </span>
      )}
      {!narrow && lines >= 2 && <span className="truncate text-2xs text-muted">{time}</span>}
    </button>
  );
}

interface HabitBlockProps {
  item: Extract<PlacedItem, { kind: 'habit' }>;
  date: string;
  ctx: HabitContext;
  /** Marca/avança o hábito (só hábitos manuais em hoje ou no passado). */
  onToggle: (habit: Habit, date: string) => void;
}

/** Hábito com horário: bloco de borda tracejada na cor do hábito. */
export function HabitBlock({ item, date, ctx, onToggle }: HabitBlockProps) {
  const { habit } = item;
  const Icon = HABIT_ICON_COMPONENT[habit.icon];
  const phone = usePhone();
  const narrow = phone && item.columns > 1;
  const lines = phone ? Math.min(blockLines(item), 2) : blockLines(item);
  const done = isDone(habit, date, ctx);
  const state = stateText(dayState(habit, date, ctx));
  const time = itemTime(item);
  const interactive = habit.source === 'manual' && date <= ctx.today;
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      {...(interactive
        ? { type: 'button' as const, onClick: () => onToggle(habit, date), 'aria-pressed': done }
        : {})}
      data-touch={narrow ? 'grid' : 'dense'}
      aria-label={`Hábito ${habit.name}, ${time}: ${state}`}
      title={`${habit.name} · ${time} · ${state}`}
      className={cn(
        'habit-block flex size-full min-w-0 flex-col justify-start overflow-hidden rounded-sm px-2 py-chip-y text-left phone:px-1',
        HABIT_COLOR_CLASS[habit.color],
        done && 'opacity-done',
      )}
    >
      {!narrow && lines === 3 && (
        <span className="habit-text flex items-center gap-1 text-2xs font-medium lowercase">
          <Icon aria-hidden strokeWidth={1.5} className="size-icon-sm shrink-0" />
          <span className="truncate">Hábito</span>
        </span>
      )}
      <span
        className={cn(
          'flex items-center gap-1 truncate text-sm font-semibold text-fg phone:text-xs',
          narrow && 'hidden',
        )}
      >
        {done && <Check aria-hidden strokeWidth={3} className="size-icon-sm shrink-0" />}
        <span className={cn('truncate', done && 'line-through')}>{habit.name}</span>
      </span>
      {!narrow && lines >= 2 && (
        <span className="truncate text-2xs text-muted">
          {time}
          {habit.type === 'quantidade' &&
            ` · ${formatAmount(valueOn(habit, date, ctx), habit.unit)}/${formatAmount(targetOn(habit, date), habit.unit)}`}
        </span>
      )}
    </Tag>
  );
}
