import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Plus } from 'lucide-react';
import type { StudyEvent, Subject } from '@daily/shared';
import { CREATE_ITEMS } from '../../components/layout/CreateMenu';
import { Menu } from '../../components/ui/Menu';
import { cn } from '../../lib/cn';
import { EVENT_TYPE_META } from '../../lib/event-meta';
import { AGENDA_HOURS, layoutAgenda, nowOffsetHours } from '../../lib/stats/agenda';
import { EventPopover } from '../calendar/components/EventPopover';
import { eventTimeRange } from '../calendar/lib/format';
import { StatCard } from './StatCard';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface AgendaCardProps {
  events: readonly StudyEvent[];
  subjects: readonly Subject[];
  today: string;
  now: Date;
}

/** Agenda de hoje: linha do tempo 06h–23h, cartões flutuantes escalonados e linha de “agora”. */
export function AgendaCard({ events, subjects, today, now }: AgendaCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const items = layoutAgenda(events, today);
  const nowOffset = nowOffsetHours(now);
  const selected = events.find((e) => e.id === selection?.id);

  // Rola até a hora atual ao abrir (e quando o dia vira).
  useEffect(() => {
    const box = scrollRef.current;
    const line = box?.querySelector<HTMLElement>('[data-now-line]');
    if (box && line) box.scrollTop = Math.max(0, line.offsetTop - box.clientHeight / 2);
  }, [today]);

  const summary = items.length
    ? `Agenda de hoje: ${items
        .map(({ event }) => `${event.title}, ${eventTimeRange(event)}`)
        .join('; ')}.`
    : 'Nada agendado para hoje.';

  return (
    <StatCard title="Agenda de hoje" className="h-full">
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-chart-track px-4 py-2 text-md">
            {capitalize(format(now, 'EEE, d', { locale: ptBR }).replace('.', ''))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-chart-track px-4 py-2 text-md">
            {capitalize(format(now, 'MMMM yyyy', { locale: ptBR }))}
          </span>
          <Link
            to="/calendario"
            aria-label="Abrir calendário"
            className="inline-flex size-control shrink-0 items-center justify-center rounded-full bg-chart-track hover:bg-chart-track-strong"
          >
            <CalendarDays aria-hidden strokeWidth={1.5} className="size-icon" />
          </Link>
        </div>
      </div>

      <p className="sr-only">{summary}</p>
      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Linha do tempo de hoje"
        className="relative mt-4 h-agenda overflow-y-auto"
      >
        <div
          className="relative"
          style={{ height: `calc(${AGENDA_HOURS.length} * var(--ds-agenda-hour-h))` }}
        >
          {AGENDA_HOURS.map((hour) => (
            <div
              key={hour}
              aria-hidden
              className="flex h-hour items-start border-t-hair border-dashed"
            >
              <span className="w-agenda-label -translate-y-2.5 pr-3 text-md text-muted tabular-nums">
                {String(hour).padStart(2, '0')}h
              </span>
            </div>
          ))}

          {nowOffset !== null && (
            <div
              data-now-line
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: `calc(${nowOffset} * var(--ds-agenda-hour-h))` }}
            >
              <span className="size-dot -translate-x-1/2 rounded-full bg-accent" />
              <span className="h-0 flex-1 border-t-hair border-accent" />
            </div>
          )}

          {items.length === 0 && (
            <p className="absolute inset-x-0 top-1/3 text-center text-md text-muted">
              Nada agendado para hoje.
            </p>
          )}

          {items.map(({ event, offsetHours, column }) => {
            const meta = EVENT_TYPE_META[event.type];
            const subject = subjects.find((s) => s.id === event.subjectId);
            return (
              <button
                key={event.id}
                type="button"
                aria-expanded={selected?.id === event.id}
                aria-label={`${meta.label}: ${event.title}, ${eventTimeRange(event)}`}
                onClick={(e) => setSelection({ id: event.id, anchor: e.currentTarget })}
                className={cn(
                  'absolute z-20 flex h-agenda-card-h w-agenda-card-w max-w-[calc(100%-var(--ds-agenda-label-w))] flex-col justify-center gap-0.5 rounded-card-sm border-l-stripe bg-bg px-4 text-left shadow-popover transition-[filter] hover:brightness-125',
                  meta.chip.split(' ').find((c) => c.startsWith('border-')),
                  event.status === 'concluido' && 'opacity-done',
                )}
                style={{
                  top: `calc(${offsetHours} * var(--ds-agenda-hour-h))`,
                  left: `calc(var(--ds-agenda-label-w) + ${column} * var(--ds-agenda-stagger))`,
                }}
              >
                <span
                  className={cn(
                    'truncate text-md font-medium',
                    event.status === 'concluido' && 'line-through',
                  )}
                >
                  {event.title}
                </span>
                <span className={cn('truncate text-xs', meta.text)}>
                  {subject ? `${subject.name} · ` : ''}
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute right-card bottom-card z-30">
        <Menu
          label="Criar"
          items={CREATE_ITEMS}
          align="end"
          placement="above"
          trigger={(props) => (
            <button
              type="button"
              aria-label="Criar evento"
              title="Criar"
              className="inline-flex size-fab items-center justify-center rounded-full bg-accent text-accent-fg shadow-popover hover:brightness-95"
              {...props}
            >
              <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
            </button>
          )}
        />
      </div>

      {selected && selection && (
        <EventPopover
          event={selected}
          anchor={selection.anchor}
          onClose={() => setSelection(null)}
        />
      )}
    </StatCard>
  );
}
