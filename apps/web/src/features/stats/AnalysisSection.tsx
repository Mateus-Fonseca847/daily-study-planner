import { useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { shiftDay } from '../../lib/dates';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useData } from '../../lib/data/app-store';
import { formatCountdown } from '../../lib/data/countdown';
import {
  focusAnalysis,
  hoursAnalysis,
  hoursBySubject,
  periodRange,
  type Period,
} from '../../lib/stats/analysis';
import { aggregateMatrix, generalRate, generalStreaks, weekStart } from '../../lib/habits';
import { upcomingPreps } from '../../lib/stats/derive';
import { formatDays, formatHours, formatVariation } from '../../lib/stats/format';
import { BarChart, EMPTY_CHART_TEXT, HorizontalBars } from './charts';
import { AggregateHeatmap } from '../habits/HabitHeatmap';
import { StatCard } from './StatCard';
import type { StatsModel } from './useStatsModel';

const PERIOD_OPTIONS = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: '90d', label: '90 dias' },
] as const;

const PERIOD_TEXT: Record<Period, string> = {
  semana: 'nos últimos 7 dias',
  mes: 'nos últimos 30 dias',
  '90d': 'nos últimos 90 dias',
};

/** Semanas do heatmap de consistência. */
const CONSISTENCY_WEEKS = 52;

const formatRate = (percent: number | null): string => (percent === null ? '—' : `${percent}%`);

const Empty = () => <p className="mt-6 text-md text-muted">{EMPTY_CHART_TEXT}</p>;

function Headline({ value, detail }: { value: string; detail: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-stat font-normal tabular-nums">{value}</span>
      <span className="text-md text-muted">{detail}</span>
    </div>
  );
}

/** Seção “Análises”: cinco cartões com gráficos em SVG próprio e alternativa textual. */
export function AnalysisSection({ now, today, index, habits, habitCtx }: StatsModel) {
  const [period, setPeriod] = useState<Period>('semana');
  const subjects = useData((s) => s.subjects);
  const { events, focusSessions } = index.data;

  const hours = useMemo(() => hoursAnalysis(events, period, today), [events, period, today]);
  const focus = useMemo(
    () => focusAnalysis(focusSessions, period, today),
    [focusSessions, period, today],
  );
  const preps = useMemo(() => upcomingPreps(events, now), [events, now]);
  const perSubject = useMemo(
    () => hoursBySubject(events, subjects, periodRange(period, today).days),
    [events, subjects, period, today],
  );
  const active = useMemo(() => habits.filter((h) => h.archivedAt === null), [habits]);
  const streaks = useMemo(() => generalStreaks(active, habitCtx), [active, habitCtx]);
  const from = useMemo(() => shiftDay(weekStart(today), -7 * (CONSISTENCY_WEEKS - 1)), [today]);
  const hasHeat = useMemo(
    () =>
      aggregateMatrix(active, from, today, habitCtx)
        .flat()
        .some((c) => c.percent !== null),
    [active, from, today, habitCtx],
  );
  const rate30 = generalRate(active, habitCtx, 30);
  const rate90 = generalRate(active, habitCtx, 90);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="analises-title" className="text-lg font-semibold tracking-tight">
          Análises
        </h2>
        <SegmentedControl
          aria-label="Período das análises"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <div className="grid-analysis">
        <StatCard title="Horas estudadas">
          {hours.plannedMin === 0 && hours.doneMin === 0 ? (
            <Empty />
          ) : (
            <>
              <Headline
                value={formatHours(hours.doneMin)}
                detail={`de ${formatHours(hours.plannedMin)} planejadas · ${formatVariation(hours.variation.percent)}`}
              />
              <div className="mt-4">
                <BarChart
                  items={hours.items}
                  format={formatHours}
                  caption={`Horas estudadas ${PERIOD_TEXT[period]}: ${formatHours(hours.doneMin)} concluídas de ${formatHours(hours.plannedMin)} planejadas`}
                  plannedHeader="Planejado"
                  valueHeader="Concluído"
                />
              </div>
            </>
          )}
        </StatCard>

        <StatCard title="Tempo focado">
          {focus.totalSec === 0 && focus.concluded + focus.interrupted === 0 ? (
            <Empty />
          ) : (
            <>
              <Headline
                value={formatHours(focus.totalSec / 60)}
                detail={`${focus.concluded} concluídas · ${focus.interrupted} interrompidas · ${formatVariation(focus.variation.percent)}`}
              />
              <div className="mt-4">
                <BarChart
                  items={focus.items}
                  format={(sec) => formatHours(sec / 60)}
                  caption={`Tempo focado ${PERIOD_TEXT[period]}: ${formatHours(focus.totalSec / 60)} em ${focus.concluded + focus.interrupted} sessões`}
                  valueHeader="Tempo focado"
                />
              </div>
            </>
          )}
        </StatCard>

        <StatCard title="Preparação das próximas provas">
          {preps.length === 0 ? (
            <p className="mt-6 text-md text-muted">Nenhuma prova futura.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {preps.map((prep) => (
                <li key={prep.exam.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-md font-medium">{prep.exam.title}</span>
                    <span className="shrink-0 text-md text-muted">
                      {formatCountdown(parseISO(prep.exam.start), now)}
                    </span>
                  </div>
                  <ProgressBar
                    value={prep.percent / 100}
                    aria-label={`Preparação para ${prep.exam.title}`}
                  />
                  <span className="text-sm text-muted">
                    {prep.hint ?? `${prep.done}/${prep.total} conteúdos (${prep.percent}%)`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </StatCard>

        <StatCard title="Horas por matéria">
          {perSubject.length === 0 ? (
            <Empty />
          ) : (
            <div className="mt-5">
              <HorizontalBars
                rows={perSubject}
                format={formatHours}
                caption={`Horas concluídas em blocos de estudo por matéria ${PERIOD_TEXT[period]}`}
              />
            </div>
          )}
        </StatCard>

        <StatCard title="Consistência" className="xl:col-span-2">
          {!hasHeat ? (
            <p className="mt-6 text-md text-muted">
              Crie hábitos para acompanhar sua consistência ao longo das semanas.
            </p>
          ) : (
            <>
              <Headline
                value={formatDays(streaks.current)}
                detail={`de sequência · melhor: ${formatDays(streaks.best)} · taxa de 30 dias: ${formatRate(rate30)} · 90 dias: ${formatRate(rate90)}`}
              />
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
    </div>
  );
}
