import { format, parseISO } from 'date-fns';

/** ISO 8601 local (sem fuso), o formato guardado nos eventos. */
export const LOCAL_ISO = "yyyy-MM-dd'T'HH:mm:ss";

export const toLocalIso = (date: Date): string => format(date, LOCAL_ISO);
export const fromLocalIso = (iso: string): Date => parseISO(iso);
/** `yyyy-MM-dd`, a parte de data de um ISO local. */
export const dayOf = (iso: string): string => iso.slice(0, 10);

/** Chave de dia local `yyyy-MM-dd`. */
export const dayKey = (date: Date): string => format(date, 'yyyy-MM-dd');
export const parseDayKey = (key: string): Date => parseISO(`${key}T00:00:00`);

/** Soma `days` (pode ser negativo) a uma chave de dia, no fuso local. */
export function shiftDay(key: string, days: number): string {
  const date = parseDayKey(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

/** Dias entre duas chaves (`b − a`). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDayKey(b).getTime() - parseDayKey(a).getTime()) / 86_400_000);
}

/** Minutos entre dois ISO locais. */
export const minutesBetween = (startIso: string, endIso: string): number =>
  Math.max(0, Math.round((parseISO(endIso).getTime() - parseISO(startIso).getTime()) / 60_000));
