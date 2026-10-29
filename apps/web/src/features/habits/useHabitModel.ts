import { useMemo } from 'react';
import { useData } from '../../lib/data/app-store';
import { dayKey } from '../../lib/dates';
import { appNow, isFixture } from '../../lib/fixture';
import { useNowMs } from '../../lib/focus/browser';
import { buildHabitContext, type HabitContext } from '../../lib/habits';
import type { Habit } from '@daily/shared';

/** O relógio das telas de hábitos atualiza a cada 30 s (e vira o dia à meia-noite sem recarregar). */
export const HABITS_TICK_MS = 30_000;

export interface HabitModel {
  now: Date;
  /** Dia de hoje (`yyyy-MM-dd`). */
  today: string;
  /** Todos os hábitos, em ordem (inclusive arquivados). */
  habits: Habit[];
  ctx: HabitContext;
}

/** “Agora” vivo, os hábitos ordenados e o contexto (registros, água, foco e blocos) do cálculo. */
export function useHabitModel(): HabitModel {
  const nowMs = useNowMs(HABITS_TICK_MS, !isFixture);
  const now = useMemo(() => (isFixture ? appNow() : new Date(nowMs)), [nowMs]);
  const today = dayKey(now);

  const habits = useData((s) => s.habits);
  const habitLogs = useData((s) => s.habitLogs);
  const waterLogs = useData((s) => s.waterLogs);
  const focusSessions = useData((s) => s.focusSessions);
  const events = useData((s) => s.events);

  const ordered = useMemo(() => [...habits].sort((a, b) => a.order - b.order), [habits]);
  const ctx = useMemo(
    () => buildHabitContext({ habitLogs, waterLogs, focusSessions, events }, today),
    [habitLogs, waterLogs, focusSessions, events, today],
  );
  return { now, today, habits: ordered, ctx };
}
