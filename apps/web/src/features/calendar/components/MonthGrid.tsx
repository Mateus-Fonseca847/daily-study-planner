import { isSameDay } from 'date-fns';
import type { StudyEvent } from '@daily/shared';
import { buildMonthGrid, groupEventsByDay } from '../lib/month-grid';
import { DayCell } from './DayCell';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

interface MonthGridProps {
  month: Date;
  events: readonly StudyEvent[];
  today: Date;
  selectedId: string | null;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
}

export function MonthGrid({ month, events, today, selectedId, onSelect }: MonthGridProps) {
  const weeks = buildMonthGrid(month);
  const byDay = groupEventsByDay(events);

  return (
    <div role="grid" aria-label="Calendário mensal" className="flex min-h-0 flex-1 flex-col">
      <div role="row" className="grid h-weekday shrink-0 grid-cols-7 border-b-hair">
        {WEEKDAYS.map((name) => (
          <div
            key={name}
            role="columnheader"
            className="flex items-center justify-center border-r-hair text-xs font-bold uppercase tracking-label text-fg"
          >
            {name}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 overflow-y-auto"
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(var(--ds-cell-min-h), 1fr))` }}
      >
        {weeks.map((week) => (
          <div key={week[0]?.key} role="row" className="grid min-h-0 grid-cols-7">
            {week.map((day) => (
              <DayCell
                key={day.key}
                day={day}
                events={byDay.get(day.key) ?? []}
                isToday={isSameDay(day.date, today)}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
