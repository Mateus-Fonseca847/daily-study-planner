import { useMemo } from 'react';
import type { Habit } from '@daily/shared';
import { useData } from '../../lib/data/app-store';
import type { HabitContext } from '../../lib/habits';
import { buildIndex, type StatsIndex } from '../../lib/stats/derive';
import { useHabitModel } from '../habits/useHabitModel';

export interface StatsModel {
  now: Date;
  /** Dia de hoje (`yyyy-MM-dd`). */
  today: string;
  index: StatsIndex;
  /** Hábitos em ordem (inclusive arquivados) e o contexto de cálculo deles. */
  habits: Habit[];
  habitCtx: HabitContext;
}

/** Dados do dashboard: “agora” vivo, o índice por dia e os hábitos (recalculados só quando os dados mudam). */
export function useStatsModel(): StatsModel {
  const { now, today, habits, ctx } = useHabitModel();

  const events = useData((s) => s.events);
  const habitLogs = useData((s) => s.habitLogs);
  const waterLogs = useData((s) => s.waterLogs);
  const focusSessions = useData((s) => s.focusSessions);
  const preferences = useData((s) => s.preferences);

  const index = useMemo(
    () => buildIndex({ events, habits, habitLogs, waterLogs, focusSessions, preferences }),
    [events, habits, habitLogs, waterLogs, focusSessions, preferences],
  );
  return { now, today, index, habits, habitCtx: ctx };
}
