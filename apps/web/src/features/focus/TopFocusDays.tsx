import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { appNow } from '../../lib/fixture';
import { formatDayTotal, formatSessionCount, formatShortDay } from '../../lib/focus/format';
import { TOP_FOCUS_DAYS, topFocusDays } from '../../lib/focus/top-days';
import { useData } from '../../lib/data/app-store';

/** Painel “Dias de mais foco”: os 7 dias com mais tempo focado em todo o histórico. */
export function TopFocusDays() {
  const sessions = useData((s) => s.focusSessions);
  const days = topFocusDays(sessions, TOP_FOCUS_DAYS, appNow());

  return (
    <section
      aria-labelledby="top-days-title"
      className="surface-glass flex w-full max-w-focus-panel flex-col gap-4 rounded-card p-card"
    >
      <h2 id="top-days-title" className="text-card-title font-normal">
        Dias de mais foco
      </h2>

      {days.length === 0 ? (
        <p className="py-6 text-md text-muted">
          Complete uma sessão para ver seus dias de maior foco.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {days.map((day, i) => (
            <li
              key={day.day}
              className="grid h-focus-row grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-focus-row px-3 odd:bg-hover"
            >
              <span className="text-md tabular-nums text-focus-rank">{i + 1}º</span>
              <span className="flex min-w-0 items-center gap-2 text-md text-fg">
                <span className="truncate">{formatShortDay(day.day)}</span>
                {day.today && (
                  <span
                    role="img"
                    aria-label="hoje"
                    className="size-dot shrink-0 rounded-full bg-accent"
                  />
                )}
              </span>
              <span className="flex flex-col items-end leading-tight">
                <span
                  className={cn(
                    'text-md font-semibold tabular-nums',
                    i === 0 ? 'text-accent' : 'text-fg',
                  )}
                >
                  {formatDayTotal(day.seconds)}
                </span>
                <span className="text-xs text-muted">{formatSessionCount(day.sessions)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <Link
        to="/estatisticas"
        className="self-start rounded-sm text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
      >
        Ver estatísticas
      </Link>
    </section>
  );
}
