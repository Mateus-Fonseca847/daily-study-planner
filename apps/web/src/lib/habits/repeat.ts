import type { Repeat } from '@daily/shared';
import { daysBetween, parseDayKey } from '../dates';

/**
 * Regra de repetição, independente de hábitos (reaproveitável pela recorrência de eventos).
 * `anchor` é a data de início da regra; todas as contas são em dias locais.
 */
export function occursOn(repeat: Repeat, anchor: string, date: string): boolean {
  if (date < anchor) return false;
  if (repeat.kind === 'dias-da-semana') return repeat.days.includes(parseDayKey(date).getDay());
  return daysBetween(anchor, date) % repeat.interval === 0;
}

export const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

const joinList = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

/** “Todo dia”, “Seg, qua e sex”, “A cada 3 dias”. */
export function describeRepeat(repeat: Repeat): string {
  if (repeat.kind === 'a-cada-n-dias') return `A cada ${repeat.interval} dias`;
  if (repeat.days.length === 7) return 'Todo dia';
  const text = joinList(repeat.days.map((day) => WEEKDAY_LABELS[day] ?? ''));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** “19h” ou “19h30”. */
export function formatTimeOfDay(start: string): string {
  const [h = '0', m = '00'] = start.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}
