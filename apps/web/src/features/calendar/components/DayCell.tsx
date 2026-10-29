import { useState } from 'react';
import type { StudyEvent } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { EventChip } from '../../../components/ui/EventChip';
import { eventTime } from '../lib/format';
import type { GridDay } from '../lib/month-grid';

/** Chips visíveis por dia antes de virar “+N mais”. */
const MAX_VISIBLE = 2;

interface DayCellProps {
  day: GridDay;
  events: readonly StudyEvent[];
  isToday: boolean;
  selectedId: string | null;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
}

export function DayCell({ day, events, isToday, selectedId, onSelect }: DayCellProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, MAX_VISIBLE);
  const hidden = events.length - MAX_VISIBLE;

  return (
    <div
      role="gridcell"
      aria-current={isToday ? 'date' : undefined}
      className="flex min-w-0 flex-col gap-1 overflow-y-auto border-r-hair border-b-hair p-2"
    >
      <span
        className={cn(
          'inline-flex h-today min-w-today items-center justify-center self-start rounded-full text-sm font-medium',
          isToday ? 'bg-accent px-1 text-accent-fg' : day.inMonth ? 'text-muted' : 'text-subtle',
        )}
      >
        {day.date.getDate()}
      </span>
      <div className={cn('flex flex-col gap-1', !day.inMonth && 'opacity-dimmed')}>
        {visible.map((event) => (
          <EventChip
            key={event.id}
            eventType={event.type}
            title={event.title}
            time={eventTime(event)}
            selected={selectedId === event.id}
            onClick={(e) => onSelect(event, e.currentTarget)}
          />
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="self-start rounded-sm px-1 text-xs text-muted hover:text-fg"
        >
          {expanded ? 'mostrar menos' : `+${hidden} mais`}
        </button>
      )}
    </div>
  );
}
