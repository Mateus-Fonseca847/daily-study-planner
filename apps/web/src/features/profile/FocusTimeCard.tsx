import { Plus } from 'lucide-react';
import type { FocusSession } from '@daily/shared';
import { cn } from '../../lib/cn';
import { focusSecondsByDay, sumBy, weekDays } from '../../lib/stats/derive';
import { formatHours, percentOf } from '../../lib/stats/format';
import { openFocusLog } from '../../lib/ui-store';
import { StatCard } from './StatCard';

const WEEKDAY_LETTER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const; // seg … dom
const WEEKDAY_NAME = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;
/** Escala mínima do gráfico (em minutos), para dias vazios não parecerem “cheios”. */
const MIN_SCALE_MIN = 60;

interface FocusTimeCardProps {
  sessions: readonly FocusSession[];
  today: string;
}

/**
 * Tempo de foco da semana, por dia (seg a dom): soma as sessões do cronômetro e os registros
 * manuais. “Registrar tempo” abre o formulário de registro manual.
 */
export function FocusTimeCard({ sessions, today }: FocusTimeCardProps) {
  const days = focusSecondsByDay(sessions, weekDays(today)).map((d) => ({
    day: d.day,
    min: Math.round(d.seconds / 60),
  }));
  const scale = Math.max(MIN_SCALE_MIN, ...days.map((d) => d.min));
  const total = sumBy(days, (d) => d.min);
  const summary = days.map((d, i) => `${WEEKDAY_NAME[i]}: ${formatHours(d.min)}`).join('; ');

  return (
    <StatCard title="Tempo de foco" className="h-full">
      <div
        role="img"
        aria-label={`Tempo de foco na semana (cronômetro e registros manuais). ${summary}.`}
        className="mt-5 flex flex-1 items-end justify-between gap-1"
      >
        {days.map((d, i) => {
          const isToday = d.day === today;
          return (
            <div key={d.day} className="flex flex-col items-center gap-2" aria-hidden>
              <div
                className={cn(
                  'relative h-bar-h w-bar-w overflow-hidden rounded-full',
                  isToday ? 'bg-chart-track-strong' : 'bg-chart-track',
                )}
              >
                <div
                  className="absolute inset-x-0 bottom-0 rounded-full bg-accent"
                  style={{ height: `${percentOf(d.min, scale)}%` }}
                />
              </div>
              <span
                className={cn(
                  'rounded-sm px-1 text-xs',
                  isToday ? 'bg-chart-track-strong text-fg' : 'text-muted',
                )}
              >
                {WEEKDAY_LETTER[i]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-md text-muted">Na semana</span>
        <span className="text-stat font-normal tabular-nums">{formatHours(total)}</span>
      </div>
      <button
        type="button"
        onClick={() => openFocusLog()}
        className="mt-3 inline-flex h-control-sm items-center justify-center gap-1 rounded-full bg-pill px-3 text-sm font-medium text-pill-fg hover:brightness-95 coarse:h-touch"
      >
        <Plus aria-hidden strokeWidth={1.75} className="size-icon-sm" />
        Registrar tempo
      </button>
    </StatCard>
  );
}
