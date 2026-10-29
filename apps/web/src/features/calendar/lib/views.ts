import { addMonths, addYears, format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dayKey, parseDayKey, shiftDay } from '../../../lib/dates';

export const CALENDAR_VIEWS = ['dia', 'semana', 'mes', 'ano'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const DEFAULT_VIEW: CalendarView = 'mes';

export interface CalendarUrlState {
  view: CalendarView;
  /** Dia de referência da visão (`yyyy-MM-dd`). */
  date: string;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Data `yyyy-MM-dd` que existe de fato no calendário (rejeita 2026-02-30). */
export function isValidDay(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISO(`${value}T00:00:00`);
  return isValid(parsed) && dayKey(parsed) === value;
}

/**
 * Lê `?visao=semana&data=2026-10-29`. Valores ausentes ou inválidos caem em **Mês** e **hoje**
 * (cada parâmetro cai sozinho, sem derrubar o outro).
 */
export function parseCalendarSearch(
  search: string | URLSearchParams,
  today: string,
): CalendarUrlState {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const view = params.get('visao');
  const date = params.get('data');
  return {
    view: (CALENDAR_VIEWS as readonly string[]).includes(view ?? '')
      ? (view as CalendarView)
      : DEFAULT_VIEW,
    date: isValidDay(date) ? date : today,
  };
}

/** Escreve o estado na URL (`visao=semana&data=2026-10-29`). */
export const buildCalendarSearch = ({ view, date }: CalendarUrlState): string =>
  new URLSearchParams({ visao: view, data: date }).toString();

/** Domingo a sábado da semana de `date`. */
export function weekRange(date: string): { start: string; end: string; days: string[] } {
  const start = shiftDay(date, -parseDayKey(date).getDay());
  return {
    start,
    end: shiftDay(start, 6),
    days: Array.from({ length: 7 }, (_, i) => shiftDay(start, i)),
  };
}

/** Anda um período: dia, semana, mês ou ano (o dia do mês é ajustado ao último, se preciso). */
export function shiftPeriod(view: CalendarView, date: string, direction: 1 | -1): string {
  const base = parseDayKey(date);
  switch (view) {
    case 'dia':
      return shiftDay(date, direction);
    case 'semana':
      return shiftDay(date, 7 * direction);
    case 'mes':
      return dayKey(addMonths(base, direction));
    case 'ano':
      return dayKey(addYears(base, direction));
  }
}

const fmt = (day: string, pattern: string) => format(parseDayKey(day), pattern, { locale: ptBR });

/** Título do período ao lado das setas: “27 out – 2 nov 2026”, “Outubro 2026”, “2026”… */
export function periodTitle(view: CalendarView, date: string): string {
  switch (view) {
    case 'dia':
      return capitalize(fmt(date, "EEEE, d 'de' MMM yyyy"));
    case 'semana': {
      const { start, end } = weekRange(date);
      const sameYear = start.slice(0, 4) === end.slice(0, 4);
      const sameMonth = start.slice(0, 7) === end.slice(0, 7);
      if (sameMonth) return `${fmt(start, 'd')} – ${fmt(end, 'd MMM yyyy')}`;
      if (sameYear) return `${fmt(start, 'd MMM')} – ${fmt(end, 'd MMM yyyy')}`;
      return `${fmt(start, 'd MMM yyyy')} – ${fmt(end, 'd MMM yyyy')}`;
    }
    case 'mes':
      return capitalize(fmt(date, 'MMMM yyyy'));
    case 'ano':
      return fmt(date, 'yyyy');
  }
}

/** Título da visão Dia: “Hoje, quinta-feira, 29 de outubro” ou a data por extenso. */
export function dayHeading(date: string, today: string): string {
  if (date === today) return `Hoje, ${fmt(date, "EEEE, d 'de' MMMM")}`;
  return capitalize(fmt(date, "EEEE, d 'de' MMMM 'de' yyyy"));
}

/** Nome da visão para tooltips e rótulos. */
export const VIEW_LABEL: Record<CalendarView, string> = {
  dia: 'Dia',
  semana: 'Semana',
  mes: 'Mês',
  ano: 'Ano',
};

/** Atalho de teclado de cada visão (`aria-keyshortcuts`). */
export const VIEW_SHORTCUT: Record<CalendarView, string> = {
  dia: 'D',
  semana: 'S',
  mes: 'M',
  ano: 'A',
};
