import { habitLogId } from '@daily/shared';
import type { FocusSession, HabitLog, StudyEvent, WaterLog } from '@daily/shared';

export interface DayBlocks {
  total: number;
  done: number;
}

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
  /** Blocos de estudo (não cancelados) por dia. */
  blocks: ReadonlyMap<string, DayBlocks>;
}

export interface HabitSources {
  habitLogs: readonly HabitLog[];
  waterLogs: readonly WaterLog[];
  focusSessions: readonly FocusSession[];
  events: readonly StudyEvent[];
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

  const blocks = new Map<string, DayBlocks>();
  for (const event of sources.events) {
    if (event.type !== 'estudo' || event.status === 'cancelado') continue;
    const day = event.start.slice(0, 10);
    const entry = blocks.get(day) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (event.status === 'concluido') entry.done += 1;
    blocks.set(day, entry);
  }
  return { today, logs, waterMl, focusMin, blocks };
}

/** Valor registrado de um hábito manual (0 se não houver registro). */
export const loggedValue = (ctx: HabitContext, habitId: string, date: string): number =>
  ctx.logs.get(habitLogId(habitId, date)) ?? 0;
