import { useCallback, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, FileCheck2 } from 'lucide-react';
import type { StudyEvent } from '@daily/shared';
import { useShell } from '../../components/layout/shell-context';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData } from '../../lib/data/app-store';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { openEventForm } from '../../lib/ui-store';
import { sampleSnapshot } from '../../mocks/events';
import { CalendarControls } from './components/CalendarControls';
import { EventPopover } from './components/EventPopover';
import { MonthGrid } from './components/MonthGrid';
import { DayView } from './components/DayView';
import { WeekView } from './components/WeekView';
import { YearView } from './components/YearView';
import { useCalendarShortcuts } from './lib/use-calendar-shortcuts';
import {
  buildCalendarSearch,
  parseCalendarSearch,
  shiftPeriod,
  type CalendarView,
} from './lib/views';

interface Selection {
  eventId: string;
  anchor: HTMLElement;
}

export function CalendarPage() {
  const { subjectId } = useShell();
  const today = useMemo(() => appNow(), []);
  const todayKey = dayKey(today);
  const [params, setParams] = useSearchParams();
  const { view, date } = parseCalendarSearch(params, todayKey);
  const month = useMemo(() => parseISO(`${date}T00:00:00`), [date]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const allEvents = useData((s) => s.events);
  const subjectCount = useData((s) => s.subjects.length);
  const replaceAll = useData((s) => s.replaceAll);

  const events = useMemo(
    () => (subjectId === 'all' ? allEvents : allEvents.filter((e) => e.subjectId === subjectId)),
    [allEvents, subjectId],
  );

  const selected = events.find((e) => e.id === selection?.eventId);
  const select = (event: StudyEvent, anchor: HTMLElement) =>
    setSelection({ eventId: event.id, anchor });
  const closePopover = useCallback(() => setSelection(null), []);

  /** Cada mudança de visão ou de data é uma entrada do histórico (voltar funciona). */
  const go = useCallback(
    (next: { view?: CalendarView; date?: string }) => {
      setSelection(null);
      setParams(buildCalendarSearch({ view: next.view ?? view, date: next.date ?? date }));
    },
    [setParams, view, date],
  );
  const step = useCallback(
    (direction: 1 | -1) => go({ date: shiftPeriod(view, date, direction) }),
    [go, view, date],
  );
  const goToday = useCallback(() => go({ date: todayKey }), [go, todayKey]);
  useCalendarShortcuts({ onStep: step, onToday: goToday, onView: (next) => go({ view: next }) });

  return (
    <>
      <CalendarControls
        view={view}
        date={date}
        today={todayKey}
        onViewChange={(next) => go({ view: next })}
        onDateChange={(next) => go({ date: next })}
        onStep={step}
        onToday={goToday}
      />
      {allEvents.length === 0 && subjectCount === 0 && (
        <div className="px-page py-4">
          <EmptyState
            icon={CalendarPlus}
            title="Seu calendário está vazio"
            description="Crie sua primeira prova ou carregue dados de exemplo para ver como o Daily funciona."
          >
            <Button onClick={() => openEventForm({ type: 'prova' })}>
              <FileCheck2 aria-hidden strokeWidth={1.5} className="size-icon" />
              Criar prova
            </Button>
            <Button variant="secondary" onClick={() => replaceAll(sampleSnapshot(today))}>
              Carregar dados de exemplo
            </Button>
          </EmptyState>
        </div>
      )}
      {view === 'mes' && (
        <MonthGrid
          month={month}
          events={events}
          today={today}
          selectedId={selected?.id ?? null}
          onSelect={select}
          onCreate={(day) => openEventForm({ date: day })}
        />
      )}
      {view === 'semana' && (
        <WeekView
          date={date}
          events={events}
          selectedId={selected?.id ?? null}
          onSelect={select}
          onCreateAt={(day, time) => openEventForm({ type: 'estudo', date: day, time })}
          onCreateDay={(day) => openEventForm({ date: day })}
        />
      )}
      {view === 'dia' && (
        <DayView
          date={date}
          events={events}
          selectedId={selected?.id ?? null}
          onSelect={select}
          onCreateAt={(day, time) => openEventForm({ type: 'estudo', date: day, time })}
        />
      )}
      {view === 'ano' && (
        <YearView
          date={date}
          today={todayKey}
          events={events}
          onOpenDay={(day) => go({ view: 'dia', date: day })}
          onOpenMonth={(day) => go({ view: 'mes', date: day })}
        />
      )}
      {selected && selection && (
        <EventPopover event={selected} anchor={selection.anchor} onClose={closePopover} />
      )}
    </>
  );
}
