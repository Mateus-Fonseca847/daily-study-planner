import { habitLogId } from '@daily/shared';
import type { FocusSession, HabitLog, RestDay, WaterLog } from '@daily/shared';

/** Tudo de que os hábitos precisam para calcular um dia; montado uma vez por render. */
export interface HabitContext {
  /** “Hoje” (injetado), `yyyy-MM-dd`. */
  today: string;
  /** `${habitId}:${data}` → valor registrado. */
  logs: ReadonlyMap<string, number>;
  /** ml de água por dia. */
  waterMl: ReadonlyMap<string, number>;
  /** Minutos reais de foco por dia (sessões concluídas e interrompidas). */
  focusMin: ReadonlyMap<string, number>;
  /** Descansos: `${habitId}:${data}` ou `*:${data}` (todos os hábitos). */
  rest: ReadonlySet<string>;
}

export interface HabitSources {
  habitLogs: readonly HabitLog[];
  waterLogs: readonly WaterLog[];
  focusSessions: readonly FocusSession[];
  restDays?: readonly RestDay[];
}

export function buildHabitContext(sources: HabitSources, today: string): HabitContext {
  const logs = new Map(sources.habitLogs.map((log) => [log.id, log.value]));

  const waterMl = new Map<string, number>();
  for (const log of sources.waterLogs) waterMl.set(log.date, (waterMl.get(log.date) ?? 0) + log.ml);

  // Minutos reais: soma os segundos do dia e só então converte (sem arredondar sessão a sessão).
  const focusSec = new Map<string, number>();
  for (const session of sources.focusSessions) {
    const day = session.startedAt.slice(0, 10);
    focusSec.set(day, (focusSec.get(day) ?? 0) + session.actualSec);
  }
  const focusMin = new Map([...focusSec].map(([day, sec]) => [day, Math.round(sec / 60)]));

  const rest = new Set((sources.restDays ?? []).map((r) => `${r.habitId ?? '*'}:${r.date}`));
  return { today, logs, waterMl, focusMin, rest };
}

/** Valor registrado de um hábito manual (0 se não houver registro). */
export const loggedValue = (ctx: HabitContext, habitId: string, date: string): number =>
  ctx.logs.get(habitLogId(habitId, date)) ?? 0;

/** Dia de descanso deste hábito (marcado só para ele ou para todos). */
export const isRestDay = (ctx: HabitContext, habitId: string, date: string): boolean =>
  ctx.rest.has(`${habitId}:${date}`) || ctx.rest.has(`*:${date}`);
