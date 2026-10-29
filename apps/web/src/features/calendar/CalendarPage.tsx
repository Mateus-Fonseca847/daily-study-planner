import { useCallback, useMemo, useState } from 'react';
import { startOfMonth } from 'date-fns';
import type { StudyEvent } from '@daily/shared';
import { useShell } from '../../components/layout/shell-context';
import { appNow } from '../../lib/fixture';
import { eventsFor } from '../../mocks';
import { CalendarControls, type CalendarView } from './components/CalendarControls';
import { EventPopover } from './components/EventPopover';
import { MonthGrid } from './components/MonthGrid';

interface Selection {
  eventId: string;
  anchor: HTMLElement;
}

const VIEW_LABEL: Record<Exclude<CalendarView, 'mes'>, string> = {
  semana: 'Visualização semanal',
  ano: 'Visualização anual',
};

export function CalendarPage() {
  const { subjectId } = useShell();
  const today = useMemo(() => appNow(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [view, setView] = useState<CalendarView>('mes');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [doneByContent, setDoneByContent] = useState<Record<string, boolean>>({});
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(new Set());

  const events = useMemo(
    () =>
      eventsFor(month, today)
        .filter((e) => !deletedIds.has(e.id) && (subjectId === 'all' || e.subjectId === subjectId))
        .map((e) => ({
          ...e,
          contents: e.contents.map((c) => ({ ...c, done: doneByContent[c.id] ?? c.done })),
        })),
    [month, today, subjectId, deletedIds, doneByContent],
  );

  const selected: StudyEvent | undefined = events.find((e) => e.id === selection?.eventId);
  const closePopover = useCallback(() => setSelection(null), []);

  const changeMonth = (next: Date) => {
    setSelection(null);
    setMonth(startOfMonth(next));
  };

  return (
    <>
      <CalendarControls
        month={month}
        view={view}
        onViewChange={setView}
        onMonthChange={changeMonth}
        onToday={() => changeMonth(today)}
      />
      {view === 'mes' ? (
        <MonthGrid
          month={month}
          events={events}
          today={today}
          selectedId={selected?.id ?? null}
          onSelect={(event, anchor) => setSelection({ eventId: event.id, anchor })}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-md text-muted">
          {VIEW_LABEL[view]} em breve.
        </div>
      )}
      {selected && selection && (
        <EventPopover
          event={selected}
          anchor={selection.anchor}
          onClose={closePopover}
          onDelete={(id) => setDeletedIds((prev) => new Set(prev).add(id))}
          onToggleContent={(id, done) => setDoneByContent((prev) => ({ ...prev, [id]: done }))}
        />
      )}
    </>
  );
}
