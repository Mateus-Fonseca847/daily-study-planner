import type { ButtonHTMLAttributes, Ref } from 'react';
import type { EventStatus, EventType } from '@daily/shared';
import { cn } from '../../lib/cn';
import { chipStyle, EVENT_TYPE_META } from '../../lib/event-meta';
import { RecurrenceIcon } from './RecurrenceIcon';

interface EventChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  eventType: EventType;
  title: string;
  /** Intervalo já formatado, ex.: “09:30 – 10:30”. */
  time: string;
  /** Concluído e cancelado ficam esmaecidos, com título riscado. */
  status?: EventStatus;
  selected?: boolean;
  /** Texto da regra numa ocorrência de série (mostra o ícone de repetição). */
  recurrence?: string | null;
  ref?: Ref<HTMLButtonElement>;
}

/** Chip de 3 linhas: tipo (minúsculo, colorido), título e horário. */
export function EventChip({
  eventType,
  title,
  time,
  status,
  selected,
  recurrence,
  className,
  ref,
  ...rest
}: EventChipProps) {
  const meta = EVENT_TYPE_META[eventType];
  const Icon = meta.icon;
  const style = chipStyle({ type: eventType, status: status ?? 'pendente' });
  const finished = status === 'concluido' || status === 'cancelado';
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${meta.label}: ${title}, ${time}${recurrence ? `, repete: ${recurrence}` : ''}`}
      title={title}
      aria-expanded={selected}
      className={cn(
        'flex w-full flex-col rounded-sm border-l-stripe px-2 py-chip-y text-left transition-[filter] hover:brightness-125',
        style.chip,
        finished && 'opacity-done',
        selected && 'brightness-150',
        className,
      )}
      {...rest}
    >
      <span className={cn('flex items-center gap-1 text-2xs font-medium lowercase', style.text)}>
        <Icon aria-hidden strokeWidth={1.5} className="size-icon-sm shrink-0" />
        <span className="truncate">{meta.label}</span>
        {recurrence && <RecurrenceIcon label={recurrence} decorative />}
      </span>
      <span className={cn('truncate text-sm font-semibold text-fg', finished && 'line-through')}>
        {title}
      </span>
      <span className="truncate text-2xs text-muted">{time}</span>
    </button>
  );
}
