import type { Recurrence } from '@daily/shared';
import { daysBetween, shiftDay } from '../dates';

/** Limite de segurança de ocorrências geradas por série em cada janela. */
export const MAX_OCCURRENCES_PER_WINDOW = 1000;
/** Nada é gerado depois de 2 anos à frente de hoje (quando “hoje” é informado). */
export const HORIZON_DAYS = 730;

export interface Occurrence {
  /** Dia local `aaaa-mm-dd`. */
  date: string;
  /** Posição na série, a partir de 0 (conta também as puladas: serve ao término “após N”). */
  index: number;
}

export interface Window {
  /** Primeiro dia (inclusive), `aaaa-mm-dd`. */
  from: string;
  /** Último dia (inclusive), `aaaa-mm-dd`. */
  to: string;
}

interface Ymd {
  y: number;
  /** Mês 0–11. */
  m: number;
  d: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = ({ y, m, d }: Ymd): string => {
  // Normaliza mês fora de 0–11 (ex.: m = 14) sem passar por milissegundos.
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12;
  return `${year}-${pad(month + 1)}-${pad(d)}`;
};
const fromKey = (key: string): Ymd => ({
  y: Number(key.slice(0, 4)),
  m: Number(key.slice(5, 7)) - 1,
  d: Number(key.slice(8, 10)),
});
/** Dias do mês, a partir do calendário local (dia 0 do mês seguinte). */
const daysInMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();
/** Dia da semana (0 = domingo) de uma data local. */
export const weekdayOf = (key: string): number => {
  const { y, m, d } = fromKey(key);
  return new Date(y, m, d).getDay();
};
const monthsBetween = (a: string, b: string): number => {
  const x = fromKey(a);
  const y = fromKey(b);
  return (y.y - x.y) * 12 + (y.m - x.m);
};
/** Dia `day` (ou o último) do mês `m` do ano `y`, já limitado ao tamanho do mês. */
const clampDay = (y: number, m: number, day: number | 'ultimo'): Ymd => {
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12;
  const last = daysInMonth(year, month);
  return { y: year, m: month, d: day === 'ultimo' ? last : Math.min(day, last) };
};

/** Último dia em que a série pode ocorrer (término por data e horizonte de 2 anos). */
function lastDay(rule: Recurrence, window: Window, today?: string): string {
  let last = window.to;
  if (rule.end.kind === 'em' && rule.end.date < last) last = rule.end.date;
  if (today !== undefined) {
    const horizon = shiftDay(today, HORIZON_DAYS);
    if (horizon < last) last = horizon;
  }
  return last;
}

/**
 * Ocorrências da série na janela, em ordem. Gera só a janela (salta direto para ela), nunca
 * grava uma por uma. Contas em datas locais: correto em viradas de mês e ano, anos bissextos e
 * horário de verão. Regras de borda:
 * - semana começa no domingo; “a cada N semanas” conta a partir da semana da data inicial;
 * - mensal no dia 29–31 cai no último dia dos meses menores; “último dia” é sempre o último;
 * - anual em 29/02 cai em 28/02 nos anos comuns;
 * - término por data é inclusivo; “após N vezes” conta também as ocorrências puladas;
 * - nunca antes da data inicial; no máximo {@link MAX_OCCURRENCES_PER_WINDOW} por janela.
 */
export function occurrencesBetween(
  rule: Recurrence,
  anchor: string,
  window: Window,
  today?: string,
): Occurrence[] {
  const from = window.from > anchor ? window.from : anchor;
  const to = lastDay(rule, window, today);
  if (from > to) return [];
  const limit = rule.end.kind === 'apos' ? rule.end.count : Number.POSITIVE_INFINITY;
  const out: Occurrence[] = [];
  const push = (date: string, index: number): boolean => {
    if (index >= limit || date > to) return false;
    if (date >= from && date >= anchor) out.push({ date, index });
    return out.length < MAX_OCCURRENCES_PER_WINDOW;
  };
  const step = rule.interval;

  switch (rule.freq) {
    case 'diaria': {
      let k = Math.max(0, Math.ceil(daysBetween(anchor, from) / step));
      for (;;) {
        if (!push(shiftDay(anchor, k * step), k)) break;
        k += 1;
      }
      break;
    }
    case 'semanal': {
      const days = rule.weekdays ?? [weekdayOf(anchor)];
      const anchorWeekday = weekdayOf(anchor);
      const weekStart = shiftDay(anchor, -anchorWeekday);
      // Dias da primeira semana antes da data inicial não existem (e não contam para “após N”).
      const skippedFirstWeek = days.filter((d) => d < anchorWeekday).length;
      let n = Math.max(0, Math.floor(daysBetween(weekStart, from) / (7 * step)));
      outer: for (;;) {
        const start = shiftDay(weekStart, n * step * 7);
        for (const [j, day] of days.entries()) {
          if (n === 0 && day < anchorWeekday) continue;
          if (!push(shiftDay(start, day), n * days.length + j - skippedFirstWeek)) break outer;
        }
        if (start > to) break;
        n += 1;
      }
      break;
    }
    case 'mensal': {
      const a = fromKey(anchor);
      const day = rule.monthDay ?? a.d;
      // Se o dia escolhido no mês inicial cai antes da data inicial, a série começa no mês seguinte.
      const firstSkipped = toKey(clampDay(a.y, a.m, day)) < anchor ? 1 : 0;
      let n = Math.max(0, Math.floor(monthsBetween(anchor, from) / step) - 1);
      for (;;) {
        if (n === 0 && firstSkipped) {
          n += 1;
          continue;
        }
        if (!push(toKey(clampDay(a.y, a.m + n * step, day)), n - firstSkipped)) break;
        n += 1;
      }
      break;
    }
    case 'anual': {
      const a = fromKey(anchor);
      let n = Math.max(0, Math.floor((fromKey(from).y - a.y) / step) - 1);
      for (;;) {
        // 29/02 vira 28/02 nos anos comuns (o mesmo `clampDay` dos meses).
        if (!push(toKey(clampDay(a.y + n * step, a.m, a.d)), n)) break;
        n += 1;
      }
      break;
    }
  }
  return out;
}

/** A série ocorre exatamente neste dia? */
export const occursOnDay = (rule: Recurrence, anchor: string, date: string): boolean =>
  occurrencesBetween(rule, anchor, { from: date, to: date }).length === 1;

/** As próximas `count` ocorrências a partir de `from` (prévia do painel). */
export function nextOccurrences(
  rule: Recurrence,
  anchor: string,
  from: string,
  count: number,
): string[] {
  const out: string[] = [];
  let start = from;
  // Janelas de um ano até achar o bastante (séries esparsas, como “a cada 5 anos”).
  for (let tries = 0; tries < 12 && out.length < count; tries += 1) {
    const to = shiftDay(start, 366);
    for (const o of occurrencesBetween(rule, anchor, { from: start, to })) {
      out.push(o.date);
      if (out.length === count) break;
    }
    start = shiftDay(to, 1);
  }
  return out;
}
