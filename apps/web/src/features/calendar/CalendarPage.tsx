import { useCallback, useMemo, useState } from 'react';
import { CalendarPlus, FileCheck2 } from 'lucide-react';
import { startOfMonth } from 'date-fns';
import { useShell } from '../../components/layout/shell-context';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData } from '../../lib/data/app-store';
import { appNow } from '../../lib/fixture';
import { openEventForm } from '../../lib/ui-store';
import { sampleSnapshot } from '../../mocks/events';
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
  const allEvents = useData((s) => s.events);
  const subjectCount = useData((s) => s.subjects.length);
  const replaceAll = useData((s) => s.replaceAll);

  const events = useMemo(
    () => (subjectId === 'all' ? allEvents : allEvents.filter((e) => e.subjectId === subjectId)),
    [allEvents, subjectId],
  );

  const selected = events.find((e) => e.id === selection?.eventId);
  const closePopover = useCallback(() => setSelection(null), []);

  const changeMonth = (next: Date) => {
    setSelection(null);
    setMonth(startOfMonth(next));
  };

  return (
    <>
      <CalendarControls
        month={month}
        today={today}
        view={view}
        onViewChange={setView}
        onMonthChange={changeMonth}
        onToday={() => changeMonth(today)}
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
      {view === 'mes' ? (
        <MonthGrid
          month={month}
          events={events}
          today={today}
          selectedId={selected?.id ?? null}
          onSelect={(event, anchor) => setSelection({ eventId: event.id, anchor })}
          onCreate={(date) => openEventForm({ date })}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-md text-muted">
          {VIEW_LABEL[view]} em breve.
        </div>
      )}
      {selected && selection && (
        <EventPopover event={selected} anchor={selection.anchor} onClose={closePopover} />
      )}
    </>
  );
}
