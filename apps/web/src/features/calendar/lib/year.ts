import type { StudyEvent } from '@daily/shared';
import { dayKey, parseDayKey } from '../../../lib/dates';

export interface MiniMonth {
  /** 0–11. */
  month: number;
  /** `yyyy-MM`. */
  key: string;
  /** Dias do mês, em ordem (`yyyy-MM-dd`). */
  days: string[];
  /** Quantas células vazias antes do dia 1 (0 = domingo … 6 = sábado). */
  offset: number;
}

/** Os 12 mini-meses do ano: dias reais de cada mês e a coluna (dia da semana) em que o dia 1 cai. */
export function grade12Meses(year: number): MiniMonth[] {
  return Array.from({ length: 12 }, (_, month) => {
    const first = new Date(year, month, 1);
    const count = new Date(year, month + 1, 0).getDate();
    return {
      month,
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      days: Array.from({ length: count }, (_, i) => dayKey(new Date(year, month, i + 1))),
      offset: first.getDay(),
    };
  });
}

export interface DayDensity {
  events: number;
  exams: number;
  /** Nível de densidade: 0, 1, 2 ou 3 (3 ou mais eventos). */
  level: 0 | 1 | 2 | 3;
}

export const densityLevel = (count: number): DayDensity['level'] =>
  count >= 3 ? 3 : (count as 0 | 1 | 2);

/** Contagem de eventos e provas por dia do ano (só dias com eventos; eventos cancelados não contam). */
export function densidadePorDia(
  events: readonly StudyEvent[],
  year: number,
): Map<string, DayDensity> {
  const counts = new Map<string, DayDensity>();
  for (const event of events) {
    if (event.status === 'cancelado') continue;
    const day = event.start.slice(0, 10);
    if (parseDayKey(day).getFullYear() !== year) continue;
    const entry = counts.get(day) ?? { events: 0, exams: 0, level: 0 };
    entry.events += 1;
    if (event.type === 'prova') entry.exams += 1;
    entry.level = densityLevel(entry.events);
    counts.set(day, entry);
  }
  return counts;
}

/** “3 eventos, 1 prova”, “1 evento”, “Nenhum evento”. */
export function describeDensity(density: DayDensity | undefined): string {
  if (!density || density.events === 0) return 'Nenhum evento';
  const events = `${density.events} ${density.events === 1 ? 'evento' : 'eventos'}`;
  if (density.exams === 0) return events;
  return `${events}, ${density.exams} ${density.exams === 1 ? 'prova' : 'provas'}`;
}
