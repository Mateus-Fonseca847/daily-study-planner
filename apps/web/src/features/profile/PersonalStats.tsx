import { useMemo } from 'react';
import { useData } from '../../lib/data/app-store';
import { shiftDay } from '../../lib/dates';
import { aggregateMatrix, generalRate, weekStart } from '../../lib/habits';
import { formatDays, formatHours } from '../../lib/stats/format';
import { profileTotals } from '../../lib/stats/profile';
import { AggregateHeatmap } from '../habits/HabitHeatmap';
import { StatCard } from './StatCard';
import type { StatsModel } from './useStatsModel';

const CONSISTENCY_WEEKS = 52;

function Total({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card-sm bg-chart-track p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-stat font-normal tabular-nums">{value}</dd>
      {detail && <dd className="truncate text-sm text-muted">{detail}</dd>}
    </div>
  );
}

/** Estatísticas pessoais: totais e sequências, e o heatmap de Consistência. */
export function PersonalStats({ today, habits, habitCtx }: StatsModel) {
  const events = useData((s) => s.events);
  const focusSessions = useData((s) => s.focusSessions);
  const waterLogs = useData((s) => s.waterLogs);
  const habitLogs = useData((s) => s.habitLogs);
  const totals = useMemo(
    () => profileTotals({ events, focusSessions, waterLogs, habitLogs, habits }, habitCtx),
    [events, focusSessions, waterLogs, habitLogs, habits, habitCtx],
  );
  const active = useMemo(() => habits.filter((h) => h.archivedAt === null), [habits]);
  const from = useMemo(() => shiftDay(weekStart(today), -7 * (CONSISTENCY_WEEKS - 1)), [today]);
  const hasHeat = useMemo(
    () =>
      aggregateMatrix(active, from, today, habitCtx)
        .flat()
        .some((c) => c.percent !== null),
    [active, from, today, habitCtx],
  );
  const rate30 = generalRate(active, habitCtx, 30);

  return (
    <div className="flex flex-col gap-card-gap">
      <dl className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
        <Total label="Tarefas concluídas" value={String(totals.tasksDone)} />
        <Total
          label="Foco na semana"
          value={formatHours(Math.round(totals.focusWeekSec / 60))}
          detail={`Total: ${formatHours(Math.round(totals.focusTotalSec / 60))}`}
        />
        <Total
          label="Melhor sequência"
          value={formatDays(totals.bestStreak.days)}
          {...(totals.bestStreak.habit ? { detail: totals.bestStreak.habit } : {})}
        />
        <Total label="Dias ativos" value={String(totals.activeDays)} />
      </dl>
      <StatCard title="Consistência">
        {!hasHeat ? (
          <p className="mt-6 text-md text-muted">
            Crie hábitos para acompanhar sua consistência ao longo das semanas.
          </p>
        ) : (
          <>
            <p className="mt-2 text-md text-muted">
              Taxa de 30 dias: {rate30 === null ? '—' : `${rate30}%`}
            </p>
            <div className="mt-4">
              <AggregateHeatmap habits={active} ctx={habitCtx} from={from} to={today} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Últimas 52 semanas · cada dia mostra a % dos hábitos agendados que foram cumpridos.
            </p>
          </>
        )}
      </StatCard>
    </div>
  );
}
