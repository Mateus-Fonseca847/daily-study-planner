import { recurrenceSchema, type Recurrence } from '@daily/shared';
import { WEEKDAY_NAMES, WEEKDAYS_UTEIS } from './describe';
import { weekdayOf } from './engine';

export type PresetKey =
  'nao' | 'diaria' | 'uteis' | 'semanal' | 'mensal' | 'anual' | 'personalizado';

export interface Preset {
  key: PresetKey;
  label: string;
  /** Regra do atalho (`null` = não repete; personalizado não tem regra fixa). */
  rule: Recurrence | null;
}

const NEVER = { kind: 'nunca' } as const;

/** Atalhos de um toque, calculados para o dia da tarefa (“Toda semana” no dia dela etc.). */
export function presetsFor(anchor: string): Preset[] {
  const weekday = weekdayOf(anchor);
  const day = Number(anchor.slice(8, 10));
  return [
    { key: 'nao', label: 'Não repete', rule: null },
    { key: 'diaria', label: 'Todo dia', rule: { freq: 'diaria', interval: 1, end: NEVER } },
    {
      key: 'uteis',
      label: 'Dias úteis (seg a sex)',
      rule: { freq: 'semanal', interval: 1, weekdays: [...WEEKDAYS_UTEIS], end: NEVER },
    },
    {
      key: 'semanal',
      label: `Toda semana (${WEEKDAY_NAMES[weekday]})`,
      rule: { freq: 'semanal', interval: 1, weekdays: [weekday], end: NEVER },
    },
    {
      key: 'mensal',
      label: `Todo mês (dia ${day})`,
      rule: { freq: 'mensal', interval: 1, monthDay: day, end: NEVER },
    },
    { key: 'anual', label: 'Todo ano', rule: { freq: 'anual', interval: 1, end: NEVER } },
    { key: 'personalizado', label: 'Personalizado…', rule: null },
  ];
}

const same = (a: Recurrence, b: Recurrence) => {
  const norm = (r: Recurrence, anchor: string) => ({
    freq: r.freq,
    interval: r.interval,
    weekdays: r.freq === 'semanal' ? (r.weekdays ?? [weekdayOf(anchor)]) : undefined,
    monthDay: r.freq === 'mensal' ? (r.monthDay ?? Number(anchor.slice(8, 10))) : undefined,
    end: r.end,
  });
  return (anchor: string) => JSON.stringify(norm(a, anchor)) === JSON.stringify(norm(b, anchor));
};

/** Qual atalho a regra representa (com término diferente de “nunca”, é personalizada). */
export function presetOf(rule: Recurrence | null | undefined, anchor: string): PresetKey {
  if (!rule) return 'nao';
  const match = presetsFor(anchor).find((p) => p.rule && same(p.rule, rule)(anchor));
  return match?.key ?? 'personalizado';
}

/**
 * Valida a regra em pt-BR (intervalo, dias, número de vezes, data final antes do início).
 * Devolve a primeira mensagem, ou `null` se estiver tudo certo.
 */
export function validateRule(rule: unknown, anchor: string): string | null {
  const parsed = recurrenceSchema.safeParse(rule);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Repetição inválida.';
  const { end } = parsed.data;
  if (end.kind === 'em' && end.date < anchor) return 'A data final não pode ser antes do início.';
  return null;
}

const SHORT_WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

/** “seg, 16/11” (com o ano quando não é o da data inicial). */
export function formatPreviewDate(date: string, anchor: string): string {
  const year = date.slice(0, 4) === anchor.slice(0, 4) ? '' : `/${date.slice(0, 4)}`;
  return `${SHORT_WEEKDAYS[weekdayOf(date)]}, ${date.slice(8, 10)}/${date.slice(5, 7)}${year}`;
}
