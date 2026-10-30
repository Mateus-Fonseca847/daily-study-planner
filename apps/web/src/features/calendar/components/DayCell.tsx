import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StudyEvent } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { EventChip } from '../../../components/ui/EventChip';
import { eventTimeRange } from '../lib/format';
import type { GridDay } from '../lib/month-grid';
import { DayListPopover } from './DayListPopover';

/** Chips visíveis por dia antes de virar “+N mais”. */
const MAX_VISIBLE = 2;

interface DayCellProps {
  day: GridDay;
  events: readonly StudyEvent[];
  isToday: boolean;
  selectedId: string | null;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
  /** Criar evento neste dia (`yyyy-MM-dd`). */
  onCreate: (dayKey: string) => void;
}

export function DayCell({ day, events, isToday, selectedId, onSelect, onCreate }: DayCellProps) {
  const [listOpen, setListOpen] = useState(false);
  const [moreEl, setMoreEl] = useState<HTMLButtonElement | null>(null);
  const hidden = events.length - MAX_VISIBLE;
  const dayLabel = format(day.date, "d 'de' MMMM", { locale: ptBR });

  return (
    <div
      role="gridcell"
      aria-current={isToday ? 'date' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCreate(day.key);
      }}
      className="flex min-w-0 flex-col gap-0.5 overflow-y-auto border-r-hair border-b-hair py-1.5 pr-3 pl-1.5"
    >
      <button
        type="button"
        aria-label={`${dayLabel}: criar evento`}
        onClick={() => onCreate(day.key)}
        className={cn(
          'inline-flex h-today min-w-today items-center justify-center self-start rounded-full text-xs font-bold',
          isToday
            ? 'bg-accent px-1 text-accent-fg'
            : day.inMonth
              ? 'text-soft hover:text-fg'
              : 'text-subtle',
        )}
      >
        {String(day.date.getDate()).padStart(2, '0')}
      </button>
      <div className={cn('flex flex-col gap-1', !day.inMonth && 'opacity-dimmed')}>
        {events.slice(0, MAX_VISIBLE).map((event) => (
          <EventChip
            key={event.id}
            eventType={event.type}
            title={event.title}
            time={eventTimeRange(event)}
            status={event.status}
            selected={selectedId === event.id}
            onClick={(e) => onSelect(event, e.currentTarget)}
          />
        ))}
      </div>
      {hidden > 0 && (
        <button
          ref={setMoreEl}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={listOpen}
          onClick={() => setListOpen((v) => !v)}
          className="self-start rounded-sm px-1 text-xs text-muted hover:text-fg"
        >
          +{hidden} mais
        </button>
      )}
      {listOpen && moreEl && (
        <DayListPopover
          anchor={moreEl}
          label={`Eventos de ${dayLabel}`}
          events={events}
          selectedId={selectedId}
          onClose={() => setListOpen(false)}
          onSelect={(event) => {
            setListOpen(false);
            onSelect(event, moreEl);
          }}
        />
      )}
    </div>
  );
}
