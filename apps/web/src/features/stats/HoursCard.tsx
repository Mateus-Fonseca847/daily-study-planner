import { cn } from '../../lib/cn';
import { sumBy, type DayHours } from '../../lib/stats/derive';
import { formatHours, percentOf } from '../../lib/stats/format';
import { StatCard } from './StatCard';

const WEEKDAY_LETTER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const; // seg … dom
const WEEKDAY_NAME = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;
/** Escala mínima do gráfico (em minutos), para dias vazios não parecerem “cheios”. */
const MIN_SCALE_MIN = 60;

interface HoursCardProps {
  /** Segunda a domingo. */
  days: DayHours[];
  today: string;
}

/** Barras de seg a dom: trilha = planejado (hachurado), preenchimento = concluído. */
export function HoursCard({ days, today }: HoursCardProps) {
  const scale = Math.max(MIN_SCALE_MIN, ...days.map((d) => d.plannedMin));
  const doneTotal = sumBy(days, (d) => d.doneMin);
  const summary = days
    .map((d, i) => `${WEEKDAY_NAME[i]}: ${formatHours(d.doneMin)} de ${formatHours(d.plannedMin)}`)
    .join('; ');

  return (
    <StatCard
      title="Horas de estudo"
      to="/blocos"
      actionLabel="Abrir blocos de estudo"
      className="h-full"
    >
      <div
        role="img"
        aria-label={`Horas de estudo na semana, concluído de planejado. ${summary}.`}
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
                  className="absolute inset-x-0 bottom-0 bg-hatch"
                  style={{ height: `${percentOf(d.plannedMin, scale)}%` }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 rounded-full bg-accent"
                  style={{ height: `${percentOf(d.doneMin, scale)}%` }}
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
        <span className="text-md text-muted">Concluído</span>
        <span className="text-stat font-normal tabular-nums">{formatHours(doneTotal)}</span>
      </div>
    </StatCard>
  );
}
