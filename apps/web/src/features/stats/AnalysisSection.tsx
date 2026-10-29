import { useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useData } from '../../lib/data/app-store';
import { formatCountdown } from '../../lib/data/countdown';
import {
  focusAnalysis,
  goalsHeatmap,
  hoursAnalysis,
  hoursBySubject,
  periodRange,
  waterAnalysis,
  type Period,
} from '../../lib/stats/analysis';
import { computeStreaks, upcomingPreps } from '../../lib/stats/derive';
import { formatDays, formatHours, formatLiters, formatVariation } from '../../lib/stats/format';
import { BarChart, EMPTY_CHART_TEXT, Heatmap, HorizontalBars } from './charts';
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

const Empty = () => <p className="mt-6 text-md text-muted">{EMPTY_CHART_TEXT}</p>;

function Headline({ value, detail }: { value: string; detail: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-stat font-normal tabular-nums">{value}</span>
      <span className="text-md text-muted">{detail}</span>
    </div>
  );
}

/** Seção “Análises”: seis cartões com gráficos em SVG próprio e alternativa textual. */
export function AnalysisSection({ now, today, index }: StatsModel) {
  const [period, setPeriod] = useState<Period>('semana');
  const subjects = useData((s) => s.subjects);
  const { events, focusSessions, preferences } = index.data;

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
  const heat = useMemo(() => goalsHeatmap(index, today), [index, today]);
  const streaks = useMemo(() => computeStreaks(index, today), [index, today]);
  const water = useMemo(() => waterAnalysis(index, period, today), [index, period, today]);

  const heatDays = heat.flat().filter((c) => c.percent !== null);
  const heatFull = heatDays.filter((c) => c.percent === 100).length;
  const waterHasData = water.recent.some((d) => d.ml > 0) || water.averageMl > 0;

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

        <StatCard title="Metas">
          {heatDays.length === 0 ? (
            <Empty />
          ) : (
            <>
              <Headline
                value={formatDays(streaks.current)}
                detail={`de sequência · melhor: ${formatDays(streaks.best)}`}
              />
              <div className="mt-4">
                <Heatmap
                  weeks={heat}
                  caption={`Mapa das metas nas últimas 12 semanas: ${heatFull} de ${heatDays.length} dias com todas as metas cumpridas. Sequência atual ${formatDays(streaks.current)}; melhor ${formatDays(streaks.best)}.`}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Últimas 12 semanas · quanto mais amarelo, mais metas cumpridas no dia.
              </p>
            </>
          )}
        </StatCard>

        <StatCard title="Água">
          {!waterHasData ? (
            <Empty />
          ) : (
            <>
              <Headline
                value={formatLiters(water.averageMl)}
                detail={`por dia · meta batida em ${water.daysMet} de ${water.totalDays} dias`}
              />
              <div className="mt-4">
                <BarChart
                  small
                  items={water.recent.map((d) => ({
                    label: d.label,
                    fullLabel: d.day,
                    value: d.ml,
                  }))}
                  reference={preferences.waterGoalMl}
                  format={formatLiters}
                  caption={`Água nos últimos 14 dias (meta de ${formatLiters(preferences.waterGoalMl)} por dia)`}
                  valueHeader="Água"
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Últimos 14 dias · a linha marca a meta de {formatLiters(preferences.waterGoalMl)}.
              </p>
            </>
          )}
        </StatCard>
      </div>
    </div>
  );
}
