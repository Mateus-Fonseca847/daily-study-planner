import { format } from 'date-fns';
import type { FocusSession } from '@daily/shared';

export const TOP_FOCUS_DAYS = 7;

export interface FocusDay {
  /** Dia local `yyyy-MM-dd`. */
  day: string;
  /** Tempo focado no dia, em segundos. */
  seconds: number;
  /** Quantidade de sessões do dia. */
  sessions: number;
  /** O dia é hoje. */
  today: boolean;
}

/**
 * Os `limit` dias com mais tempo focado em todo o histórico (sessões concluídas e interrompidas,
 * por `actualSec`). Uma sessão conta no dia local em que **começou**, mesmo que cruze a meia-noite.
 * Empate: o dia mais recente vem primeiro.
 */
export function topFocusDays(
  sessions: readonly FocusSession[],
  limit: number,
  now: Date,
): FocusDay[] {
  const today = format(now, 'yyyy-MM-dd');
  const totals = new Map<string, { seconds: number; sessions: number }>();
  for (const session of sessions) {
    if (session.actualSec <= 0) continue;
    const day = session.startedAt.slice(0, 10);
    const entry = totals.get(day) ?? { seconds: 0, sessions: 0 };
    entry.seconds += session.actualSec;
    entry.sessions += 1;
    totals.set(day, entry);
  }
  return [...totals]
    .map(([day, entry]) => ({ day, ...entry, today: day === today }))
    .sort((a, b) => b.seconds - a.seconds || (a.day < b.day ? 1 : -1))
    .slice(0, Math.max(0, limit));
}
