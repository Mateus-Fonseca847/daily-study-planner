import type {
  FocusSession,
  Habit,
  HabitLog,
  OccurrenceException,
  StudyEvent,
  WaterLog,
} from '@daily/shared';
import { streaks, type HabitContext } from '../habits';
import { weekDays } from './derive';

export interface ProfileTotals {
  /** Compromissos concluídos (avulsos e ocorrências de séries), em todo o histórico. */
  tasksDone: number;
  /** Segundos de foco (cronômetro + manual) na semana de hoje (seg–dom) e no total. */
  focusWeekSec: number;
  focusTotalSec: number;
  /** A melhor sequência entre os hábitos ativos, e de qual hábito. */
  bestStreak: { days: number; habit: string | null };
  /** Dias com alguma atividade registrada (foco, água ou hábito cumprido). */
  activeDays: number;
}

interface ProfileData {
  events: readonly StudyEvent[];
  focusSessions: readonly FocusSession[];
  waterLogs: readonly WaterLog[];
  habitLogs: readonly HabitLog[];
  habits: readonly Habit[];
  /** Exceções das séries: ocorrências concluídas também contam. */
  exceptions?: readonly OccurrenceException[];
}

/** Totais e sequências do Perfil (função pura; “hoje” vem do contexto dos hábitos). */
export function profileTotals(data: ProfileData, ctx: HabitContext): ProfileTotals {
  const week = new Set(weekDays(ctx.today));
  let focusWeekSec = 0;
  let focusTotalSec = 0;
  const active = new Set<string>();
  for (const session of data.focusSessions) {
    const day = session.startedAt.slice(0, 10);
    focusTotalSec += session.actualSec;
    if (week.has(day)) focusWeekSec += session.actualSec;
    if (session.actualSec > 0) active.add(day);
  }
  for (const log of data.waterLogs) active.add(log.date);
  for (const log of data.habitLogs) if (log.value > 0) active.add(log.date);

  let bestStreak: ProfileTotals['bestStreak'] = { days: 0, habit: null };
  for (const habit of data.habits) {
    if (habit.archivedAt !== null) continue;
    const { best } = streaks(habit, ctx);
    if (best > bestStreak.days) bestStreak = { days: best, habit: habit.name };
  }

  return {
    tasksDone:
      data.events.filter((e) => !e.recurrence && e.status === 'concluido').length +
      (data.exceptions ?? []).filter((ex) => ex.status === 'concluido').length,
    focusWeekSec,
    focusTotalSec,
    bestStreak,
    activeDays: [...active].filter((day) => day <= ctx.today).length,
  };
}
