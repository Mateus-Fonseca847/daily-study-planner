import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Habit } from '@daily/shared';
import { parseDayKey } from '../dates';
import type { HabitContext } from './context';
import { dayState, type DayState } from './engine';
import { WEEKDAY_LABELS } from './repeat';

/** “ter., 21 de out.”. */
export function formatLongDay(date: string): string {
  const day = parseDayKey(date);
  return `${WEEKDAY_LABELS[day.getDay()]}., ${format(day, "d 'de' MMM", { locale: ptBR })}.`;
}

/** “out” — rótulo curto do mês. */
export const monthShort = (date: string): string => format(parseISO(date), 'MMM', { locale: ptBR });

/** “outubro de 2026”. */
export const monthLong = (date: string): string =>
  format(parseISO(date), "MMMM 'de' yyyy", { locale: ptBR });

/**
 * Rótulo de mês de cada coluna (semana): aparece na primeira coluna em que o mês muda e some se a
 * coluna seguinte também mudaria (evita rótulos encavalados).
 */
export function monthLabels(columns: readonly (readonly string[])[]): (string | null)[] {
  const monthOf = (column: readonly string[]) => (column[0] ?? '').slice(0, 7);
  const raw = columns.map((column, i) => {
    const month = monthOf(column);
    return i === 0 || month !== monthOf(columns[i - 1] ?? []) ? month : null;
  });
  return raw.map((month, i) => {
    if (month === null) return null;
    const next = raw[i + 1];
    // A primeira coluna só ganha rótulo se o mês durar mais de uma semana na janela.
    if (i === 0 && next !== null && next !== undefined) return null;
    return monthShort(`${month}-01`);
  });
}

const STATE_TEXT: Record<DayState, string> = {
  futuro: 'dia futuro',
  'nao-agendado': 'não agendado',
  feito: 'feito',
  parcial: 'parcial',
  perdido: 'não feito',
  pendente: 'pendente',
};

export const stateText = (state: DayState): string => STATE_TEXT[state];

/** Valor legível: “750 ml”, “30 min”, “2 vezes”; sem unidade, só o número. */
export function formatAmount(value: number, unit: string): string {
  const number = Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  return unit ? `${number} ${unit}` : number;
}

export interface MonthSummary {
  /** `yyyy-MM`. */
  month: string;
  label: string;
  scheduled: number;
  done: number;
}

/** Resumo por mês (dias agendados e cumpridos) para a tabela visualmente oculta e o texto de apoio. */
export function monthlySummary(
  habit: Habit,
  dates: readonly string[],
  ctx: HabitContext,
): MonthSummary[] {
  const months = new Map<string, MonthSummary>();
  for (const date of dates) {
    const state = dayState(habit, date, ctx);
    if (state === 'futuro' || state === 'nao-agendado') continue;
    const key = date.slice(0, 7);
    const entry = months.get(key) ?? {
      month: key,
      label: monthLong(`${key}-01`),
      scheduled: 0,
      done: 0,
    };
    if (state !== 'pendente') entry.scheduled += 1;
    if (state === 'feito') entry.done += 1;
    months.set(key, entry);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
