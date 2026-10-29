import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StudyEvent } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { parseDayKey, shiftDay } from '../../../lib/dates';
import { formatLongDay } from '../../../lib/habits/summary';
import {
  densidadePorDia,
  describeDensity,
  grade12Meses,
  type DayDensity,
  type MiniMonth,
} from '../lib/year';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/** Classes literais de cada nível de densidade (o Tailwind só gera o que aparece por extenso). */
const DENSITY_CLASS = {
  0: 'bg-density-0 text-soft',
  1: 'bg-density-1 text-fg',
  2: 'bg-density-2 text-fg',
  3: 'bg-density-3 text-accent-fg font-bold',
} as const;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface YearViewProps {
  /** Qualquer dia do ano exibido (`yyyy-MM-dd`). */
  date: string;
  today: string;
  events: readonly StudyEvent[];
  onOpenDay: (date: string) => void;
  onOpenMonth: (date: string) => void;
}

interface MiniMonthViewProps {
  month: MiniMonth;
  densities: ReadonlyMap<string, DayDensity>;
  today: string;
  activeDay: string;
  onActive: (date: string) => void;
  onOpenDay: (date: string) => void;
  onOpenMonth: (date: string) => void;
}

function MiniMonthView({
  month,
  densities,
  today,
  activeDay,
  onActive,
  onOpenDay,
  onOpenMonth,
}: MiniMonthViewProps) {
  const first = month.days[0] ?? '';
  const name = capitalize(format(parseDayKey(first), 'MMMM', { locale: ptBR }));
  return (
    <section aria-label={name} className="min-w-0">
      <h3 className="mb-2">
        <button
          type="button"
          aria-label={`Abrir ${name} na visão Mês`}
          title={`Abrir ${name} na visão Mês`}
          onClick={() => onOpenMonth(first)}
          className="rounded-sm text-md font-semibold tracking-tight hover:text-accent"
        >
          {name}
        </button>
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_INITIALS.map((initial, i) => (
          <span key={i} aria-hidden className="text-2xs font-bold text-muted">
            {initial}
          </span>
        ))}
        {Array.from({ length: month.offset }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}
        {month.days.map((day) => {
          const density = densities.get(day);
          const text = describeDensity(density);
          const label = `${formatLongDay(day)} — ${text}`;
          return (
            <button
              key={day}
              type="button"
              data-date={day}
              aria-label={label}
              title={label}
              aria-current={day === today ? 'date' : undefined}
              tabIndex={day === activeDay ? 0 : -1}
              onFocus={() => onActive(day)}
              onClick={() => onOpenDay(day)}
              className={cn(
                'relative mx-auto inline-flex size-year-day items-center justify-center rounded-sm text-2xs tabular-nums hover:brightness-125',
                DENSITY_CLASS[density?.level ?? 0],
                day === today && 'outline-2 outline-offset-1 outline-accent',
              )}
            >
              {Number(day.slice(8, 10))}
              {density && density.exams > 0 && (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 left-1/2 size-year-dot -translate-x-1/2 rounded-full bg-prova"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Visão Ano: 12 mini-meses coloridos pela densidade de eventos (0, 1, 2 e 3 ou mais). */
export function YearView({ date, today, events, onOpenDay, onOpenMonth }: YearViewProps) {
  const year = parseDayKey(date).getFullYear();
  const months = useMemo(() => grade12Meses(year), [year]);
  const densities = useMemo(() => densidadePorDia(events, year), [events, year]);
  const [active, setActive] = useState(today.startsWith(String(year)) ? today : `${year}-01-01`);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeDay = active.startsWith(String(year)) ? active : `${year}-01-01`;

  // Foco móvel: ← → andam um dia, ↑ ↓ uma semana (dentro do ano, cruzando os meses).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const delta = deltas[e.key];
    const current = (e.target as HTMLElement).dataset.date;
    if (delta === undefined || !current) return;
    e.preventDefault();
    const next = shiftDay(current, delta);
    if (!next.startsWith(String(year))) return;
    setActive(next);
    rootRef.current?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus();
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-page py-6">
      <div
        ref={rootRef}
        role="group"
        aria-label={`Calendário de ${year}`}
        onKeyDown={onKeyDown}
        className="year-grid"
      >
        {months.map((month) => (
          <MiniMonthView
            key={month.key}
            month={month}
            densities={densities}
            today={today}
            activeDay={activeDay}
            onActive={setActive}
            onOpenDay={onOpenDay}
            onOpenMonth={onOpenMonth}
          />
        ))}
      </div>
      <div aria-hidden className="mt-6 flex items-center justify-end gap-1 text-heat text-muted">
        <span className="pr-1">Menos</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <span key={level} className={cn('size-heat-legend rounded-sm', DENSITY_CLASS[level])} />
        ))}
        <span className="pl-1">Mais</span>
        <span className="pl-4">
          <span className="mr-1 inline-block size-year-dot rounded-full bg-prova align-middle" />
          dia com prova
        </span>
      </div>
    </div>
  );
}
