import type { ButtonHTMLAttributes, Ref } from 'react';
import type { EventType } from '@daily/shared';
import { cn } from '../../lib/cn';
import { EVENT_TYPE_META } from '../../lib/event-meta';

interface EventChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  eventType: EventType;
  title: string;
  /** Horário já formatado, ex.: “09:30”. */
  time: string;
  selected?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function EventChip({
  eventType,
  title,
  time,
  selected,
  className,
  ref,
  ...rest
}: EventChipProps) {
  const meta = EVENT_TYPE_META[eventType];
  const Icon = meta.icon;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${meta.label}: ${title}, ${time}`}
      aria-expanded={selected}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-sm border-l-stripe px-2 py-1 text-left transition-[filter] hover:brightness-125',
        meta.chip,
        selected && 'brightness-150',
        className,
      )}
      {...rest}
    >
      <span className="flex items-center gap-1 text-2xs font-medium">
        <Icon aria-hidden strokeWidth={1.5} className={cn('size-icon-sm', meta.text)} />
        <span className={cn('truncate', meta.text)}>{meta.label}</span>
        <span className="ml-auto font-regular text-muted">{time}</span>
      </span>
      <span className="truncate text-sm font-semibold text-fg">{title}</span>
    </button>
  );
}
