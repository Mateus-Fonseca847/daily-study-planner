import type { FocusSession } from '@daily/shared';
import type { Draft } from '../data/repository';

/** Tempo de foco registrado à mão: data, duração e nota. */
export interface ManualFocusEntry {
  /** Dia local `yyyy-MM-dd`. */
  date: string;
  /** Duração em minutos (1 a 24 h). */
  minutes: number;
  note: string;
}

export const MANUAL_FOCUS_MAX_MINUTES = 24 * 60;

/**
 * Sessão `manual`: conta no dia informado (às 12:00, o dia é o que importa), concluída e com o
 * tempo planejado igual ao real.
 */
export function manualFocusSession(entry: ManualFocusEntry): Draft<FocusSession> {
  const seconds = Math.round(Math.min(MANUAL_FOCUS_MAX_MINUTES, Math.max(1, entry.minutes)) * 60);
  return {
    startedAt: `${entry.date}T12:00:00`,
    plannedSec: seconds,
    actualSec: seconds,
    status: 'concluida',
    subjectId: null,
    examId: null,
    origin: 'manual',
    note: entry.note.trim().slice(0, 200),
  };
}

/** Segundos de foco por dia (cronômetro + manual), por dia de início. */
export function focusSecondsByDay(sessions: readonly FocusSession[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const session of sessions) {
    const day = session.startedAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + session.actualSec);
  }
  return byDay;
}

/**
 * Lê a duração digitada no registro manual, em minutos: “45” (min), “1:30” (h:mm), “1h30”,
 * “2h” ou “90min”. Devolve `null` se não entender.
 */
export function parseManualMinutes(text: string): number | null {
  const value = text.trim().toLowerCase().replace(/\s+/g, '');
  if (value === '') return null;
  let match = /^(\d{1,4})(?:min|m)?$/.exec(value);
  if (match) return Number(match[1]);
  match = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  match = /^(\d{1,2})h(?:([0-5]?\d)(?:min|m)?)?$/.exec(value);
  if (match) return Number(match[1]) * 60 + Number(match[2] ?? 0);
  return null;
}
