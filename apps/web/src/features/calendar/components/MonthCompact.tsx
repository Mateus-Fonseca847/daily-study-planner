import { useRef, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Plus } from 'lucide-react';
import type { EventType, StudyEvent } from '@daily/shared';
import { Button } from '../../../components/ui/Button';
import { EventChip } from '../../../components/ui/EventChip';
import { cn } from '../../../lib/cn';
import { useSwipe } from '../../../lib/responsive/use-swipe';
import { compactDayMarks, dayAgenda, dayCellLabel } from '../lib/compact';
import { eventTimeRange } from '../lib/format';
import { buildMonthGrid, groupEventsByDay } from '../lib/month-grid';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/** Classes literais dos pontos de cada tipo (o Tailwind só gera o que aparece por extenso). */
const DOT_CLASS: Record<EventType, string> = {
  tarefa: 'bg-pendente',
  prova: 'bg-prova',
  especial: 'bg-especial',
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface MonthCompactProps {
  month: Date;
  events: readonly StudyEvent[];
  today: Date;
  selectedId: string | null;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
  onCreate: (dayKey: string) => void;
  /** Abre a visão Dia na data escolhida. */
  onOpenDay: (dayKey: string) => void;
  /** Deslizar muda o mês (1 = próximo, −1 = anterior). */
  onStep: (direction: 1 | -1) => void;
}

/**
 * Mês no celular: grade compacta (número e até 3 pontos por tipo) e, abaixo, a agenda do dia
 * tocado. O toque seleciona o dia; criar evento é pelo botão "+" ou pela agenda.
 */
export function MonthCompact({
  month,
  events,
  today,
  selectedId,
  onSelect,
  onCreate,
  onOpenDay,
  onStep,
}: MonthCompactProps) {
  const weeks = buildMonthGrid(month);
  const byDay = groupEventsByDay(events);
  const monthPrefix = format(month, 'yyyy-MM');
  const fallback =
    isSameDay(today, month) || format(today, 'yyyy-MM') === monthPrefix
      ? format(today, 'yyyy-MM-dd')
      : `${monthPrefix}-01`;
  const [picked, setPicked] = useState<string | null>(null);
  const selectedDay = picked?.startsWith(monthPrefix) ? picked : fallback;
  const agenda = dayAgenda(byDay.get(selectedDay) ?? []);
  const selectedDate = new Date(`${selectedDay}T00:00:00`);

  const rootRef = useRef<HTMLDivElement>(null);
  useSwipe(rootRef, { enabled: true, onSwipe: (dir) => onStep(dir === 'left' ? 1 : -1) });

  return (
    <div ref={rootRef} className="min-h-0 flex-1 touch-pan-y overflow-y-auto">
      <div role="grid" aria-label="Calendário mensal" className="px-2 pt-2">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAY_INITIALS.map((initial, i) => (
            <div
              key={i}
              role="columnheader"
              aria-label={format(new Date(2026, 0, 4 + i), 'EEEE', { locale: ptBR })}
              className="py-1 text-center text-xs font-bold uppercase text-muted"
            >
              {initial}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]?.key} role="row" className="grid grid-cols-7">
            {week.map((day) => {
              const marks = compactDayMarks(byDay.get(day.key) ?? []);
              const isToday = isSameDay(day.date, today);
              const isSelected = day.key === selectedDay;
              const dayLabel = format(day.date, "d 'de' MMMM", { locale: ptBR });
              return (
                <button
                  key={day.key}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={dayCellLabel(dayLabel, marks.total, isToday)}
                  onClick={() => setPicked(day.key)}
                  className={cn(
                    'flex min-h-touch flex-col items-center justify-center gap-1 rounded-md py-1',
                    isSelected && 'bg-hover',
                    !day.inMonth && 'opacity-dimmed',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-today items-center justify-center rounded-full text-sm font-bold',
                      isToday ? 'bg-accent text-accent-fg' : 'text-soft',
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  <span aria-hidden className="flex h-dot items-center gap-0.5">
                    {marks.types.map((type) => (
                      <span key={type} className={cn('size-dot rounded-full', DOT_CLASS[type])} />
                    ))}
                    {marks.extra > 0 && (
                      <span className="text-2xs leading-none text-muted">+{marks.extra}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <section
        aria-label={`Agenda de ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })}`}
        className="mt-2 border-t-hair px-4 py-3"
      >
        <div className="flex items-center justify-between gap-2 pb-2">
          <h3 className="min-w-0 truncate text-md font-semibold">
            {capitalize(format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR }))}
          </h3>
          <Button variant="secondary" onClick={() => onOpenDay(selectedDay)}>
            <CalendarDays aria-hidden strokeWidth={1.5} className="size-icon" />
            Abrir dia
          </Button>
        </div>
        {agenda.length === 0 ? (
          <div className="flex items-center justify-between gap-2 py-2">
            <p className="text-md text-muted">Nenhum evento neste dia.</p>
            <Button variant="secondary" onClick={() => onCreate(selectedDay)}>
              <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
              Criar evento
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {agenda.map((event) => (
              <li key={event.id}>
                <EventChip
                  eventType={event.type}
                  title={event.title}
                  time={eventTimeRange(event)}
                  status={event.status}
                  selected={selectedId === event.id}
                  onClick={(e) => onSelect(event, e.currentTarget)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
