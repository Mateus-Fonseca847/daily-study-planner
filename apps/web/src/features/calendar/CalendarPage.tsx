import { useCallback, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, ListTodo } from 'lucide-react';
import type { StudyEvent } from '@daily/shared';
import { filterByType } from '../../lib/tasks/sections';
import { useOccurrences } from '../../lib/recurrence/use-occurrences';
import { useTypeFilter } from '../../lib/tasks/type-filter-store';
import { usePhone } from '../../lib/responsive/use-media';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData } from '../../lib/data/app-store';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { openEventForm, useUi } from '../../lib/ui-store';
import { sampleSnapshot } from '../../mocks/events';
import { CalendarControls } from './components/CalendarControls';
import { MonthGrid } from './components/MonthGrid';
import { DayView } from './components/DayView';
import { WeekView } from './components/WeekView';
import { YearView } from './components/YearView';
import { useCalendarShortcuts } from './lib/use-calendar-shortcuts';
import {
  buildCalendarSearch,
  parseCalendarSearch,
  shiftPeriod,
  viewForScreen,
  type CalendarView,
  visibleWindow,
} from './lib/views';

export function CalendarPage() {
  const types = useTypeFilter((s) => s.types);
  const today = useMemo(() => appNow(), []);
  const todayKey = dayKey(today);
  const [params, setParams] = useSearchParams();
  const phone = usePhone();
  const parsed = parseCalendarSearch(params, todayKey);
  const { date } = parsed;
  // No celular o ano inteiro não cabe: Mês é o padrão e a visão Ano some.
  const view = viewForScreen(parsed.view, phone);
  // Séries viram ocorrências só da janela visível.
  const { from: visibleFrom, to: visibleTo } = visibleWindow(view, date);
  const occurrences = useOccurrences(visibleFrom, visibleTo);
  const month = useMemo(() => parseISO(`${date}T00:00:00`), [date]);
  const allEvents = useData((s) => s.events);
  const subjectCount = useData((s) => s.subjects.length);
  const replaceAll = useData((s) => s.replaceAll);

  const events = useMemo(() => filterByType(occurrences, types), [occurrences, types]);

  // O clique num compromisso abre o painel de tarefa (ver, editar, concluir).
  const select = (event: StudyEvent) => openEventForm({ event });
  // Destaca o compromisso aberto no painel.
  const openId = useUi((s) => (s.modal?.kind === 'event' ? s.modal.eventId : undefined));

  /** Cada mudança de visão ou de data é uma entrada do histórico (voltar funciona). */
  const go = useCallback(
    (next: { view?: CalendarView; date?: string }) => {
      // Preserva os outros parâmetros da URL (ex.: `fixture` em desenvolvimento).
      const merged = new URLSearchParams(params);
      const wanted = new URLSearchParams(
        buildCalendarSearch({ view: next.view ?? view, date: next.date ?? date }),
      );
      wanted.forEach((value, key) => merged.set(key, value));
      setParams(merged);
    },
    [setParams, params, view, date],
  );
  const step = useCallback(
    (direction: 1 | -1) => go({ date: shiftPeriod(view, date, direction) }),
    [go, view, date],
  );
  const goToday = useCallback(() => go({ date: todayKey }), [go, todayKey]);
  useCalendarShortcuts({
    onStep: step,
    onToday: goToday,
    onView: (next) => go({ view: viewForScreen(next, phone) }),
  });

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
            description="Crie sua primeira tarefa ou carregue dados de exemplo para ver como o Daily funciona."
          >
            <Button onClick={() => openEventForm({ type: 'tarefa' })}>
              <ListTodo aria-hidden strokeWidth={1.5} className="size-icon" />
              Criar tarefa
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
          selectedId={openId ?? null}
          onSelect={select}
          onCreate={(day) => openEventForm({ date: day })}
          onOpenDay={(day) => go({ view: 'dia', date: day })}
          onStep={step}
        />
      )}
      {view === 'semana' && (
        <WeekView
          date={date}
          events={events}
          selectedId={openId ?? null}
          onSelect={select}
          onCreateAt={(day, time) => openEventForm({ type: 'tarefa', date: day, time })}
          onCreateDay={(day) => openEventForm({ date: day })}
        />
      )}
      {view === 'dia' && (
        <DayView
          date={date}
          events={events}
          selectedId={openId ?? null}
          onSelect={select}
          onCreateAt={(day, time) => openEventForm({ type: 'tarefa', date: day, time })}
          onStep={step}
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
    </>
  );
}
