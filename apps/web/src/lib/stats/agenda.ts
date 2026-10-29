import type { StudyEvent } from '@daily/shared';

/** A linha do tempo da agenda vai de 06h até meia-noite. */
export const AGENDA_START_HOUR = 6;
export const AGENDA_END_HOUR = 24;
/**
 * Cada cartão flutuante “ocupa” este tempo a partir do início (a altura do cartão é fixa, não a
 * duração do evento). Cartões que começam dentro dessa janela se sobrepõem e são escalonados.
 */
export const AGENDA_CARD_SPAN_MIN = 90;

const minutesOfDay = (iso: string): number =>
  Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));

export interface AgendaItem {
  event: StudyEvent;
  /** Horas desde o início da linha do tempo (06h = 0). */
  offsetHours: number;
  /** Coluna do escalonamento (0 = sem sobreposição). */
  column: number;
}

/** Eventos do dia (não cancelados) posicionados na linha do tempo e escalonados quando se sobrepõem. */
export function layoutAgenda(events: readonly StudyEvent[], day: string): AgendaItem[] {
  const today = events
    .filter((e) => e.start.slice(0, 10) === day && e.status !== 'cancelado')
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));

  const columnEnds: number[] = []; // fim (em min) ocupado de cada coluna
  return today.map((event) => {
    const start = minutesOfDay(event.start);
    let column = columnEnds.findIndex((end) => end <= start);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = start + AGENDA_CARD_SPAN_MIN;
    const clamped = Math.min(Math.max(start, AGENDA_START_HOUR * 60), AGENDA_END_HOUR * 60 - 30);
    return { event, offsetHours: (clamped - AGENDA_START_HOUR * 60) / 60, column };
  });
}

/** Posição da linha de “agora” (horas desde 06h) ou `null` fora da linha do tempo. */
export function nowOffsetHours(now: Date): number | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < AGENDA_START_HOUR * 60 || minutes >= AGENDA_END_HOUR * 60) return null;
  return (minutes - AGENDA_START_HOUR * 60) / 60;
}

/** Rótulos das horas: 06h … 23h. */
export const AGENDA_HOURS: number[] = Array.from(
  { length: AGENDA_END_HOUR - AGENDA_START_HOUR },
  (_, i) => AGENDA_START_HOUR + i,
);
