import type { Recurrence } from '@daily/shared';
import { weekdayOf } from './engine';

/** Nomes por extenso (0 = domingo). */
export const WEEKDAY_NAMES = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const;
/** Rótulos curtos dos chips (DOM a SÁB). */
export const WEEKDAY_CHIPS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;
export const WEEKDAYS_UTEIS = [1, 2, 3, 4, 5] as const;

const join = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

/** “Toda segunda”, “Todo sábado”: o gênero segue o primeiro dia da lista. */
const every = (firstDay: number) => (firstDay === 0 || firstDay === 6 ? 'Todo' : 'Toda');

const ddmm = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

const sameDays = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((d, i) => d === b[i]);

function base(rule: Recurrence, anchor: string): string {
  const n = rule.interval;
  switch (rule.freq) {
    case 'diaria':
      return n === 1 ? 'Todo dia' : `A cada ${n} dias`;
    case 'semanal': {
      const days = rule.weekdays ?? [weekdayOf(anchor)];
      if (n === 1 && days.length === 7) return 'Todo dia';
      if (n === 1 && sameDays(days, WEEKDAYS_UTEIS)) return 'Dias úteis';
      const names = join(days.map((d) => WEEKDAY_NAMES[d] ?? ''));
      return n === 1 ? `${every(days[0] ?? 1)} ${names}` : `A cada ${n} semanas, ${names}`;
    }
    case 'mensal': {
      const day = rule.monthDay ?? Number(anchor.slice(8, 10));
      const which = day === 'ultimo' ? 'último dia do mês' : `dia ${day}`;
      return n === 1 ? `Todo ${which}` : `A cada ${n} meses, no ${which}`;
    }
    case 'anual':
      return n === 1 ? `Todo ano em ${ddmm(anchor)}` : `A cada ${n} anos, em ${ddmm(anchor)}`;
  }
}

/**
 * Texto da regra em pt-BR: “Toda segunda e quarta, até 20/12”, “A cada 2 semanas, terça”,
 * “Todo dia 5, 10 vezes”. A data final mostra o ano só quando é outro que o da data inicial.
 */
export function describeRule(rule: Recurrence, anchor: string): string {
  const text = base(rule, anchor);
  switch (rule.end.kind) {
    case 'nunca':
      return text;
    case 'em': {
      const end = rule.end.date;
      const year = end.slice(0, 4) === anchor.slice(0, 4) ? '' : `/${end.slice(0, 4)}`;
      return `${text}, até ${ddmm(end)}${year}`;
    }
    case 'apos':
      return `${text}, ${rule.end.count} ${rule.end.count === 1 ? 'vez' : 'vezes'}`;
  }
}
