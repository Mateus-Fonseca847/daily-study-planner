import { useMemo } from 'react';
import { useData } from '../../lib/data/app-store';
import { dayKey } from '../../lib/dates';
import { appNow, isFixture } from '../../lib/fixture';
import { useNowMs } from '../../lib/focus/browser';
import { buildIndex, type StatsIndex } from '../../lib/stats/derive';

/** O relógio do dashboard atualiza a cada 30 s (e vira o dia à meia-noite sem recarregar). */
export const STATS_TICK_MS = 30_000;

export interface StatsModel {
  now: Date;
  /** Dia de hoje (`yyyy-MM-dd`). */
  today: string;
  index: StatsIndex;
}

/** Dados do dashboard: “agora” vivo e o índice por dia (recalculado só quando os dados mudam). */
export function useStatsModel(): StatsModel {
  const nowMs = useNowMs(STATS_TICK_MS, !isFixture);
  const now = useMemo(() => (isFixture ? appNow() : new Date(nowMs)), [nowMs]);

  const events = useData((s) => s.events);
  const goals = useData((s) => s.goals);
  const goalLogs = useData((s) => s.goalLogs);
  const waterLogs = useData((s) => s.waterLogs);
  const focusSessions = useData((s) => s.focusSessions);
  const preferences = useData((s) => s.preferences);

  const index = useMemo(
    () => buildIndex({ events, goals, goalLogs, waterLogs, focusSessions, preferences }),
    [events, goals, goalLogs, waterLogs, focusSessions, preferences],
  );
  return { now, today: dayKey(now), index };
}
