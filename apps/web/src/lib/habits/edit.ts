import type {
  DataSnapshot,
  Habit,
  HabitColor,
  HabitIcon,
  HabitRule,
  HabitSource,
  HabitTime,
  HabitType,
  Repeat,
} from '@daily/shared';
import { dayKey, daysBetween, toLocalIso } from '../dates';
import type { Draft, Patch } from '../data/repository';
import { ruleOn } from './engine';

/** Quantos dias para trás um hábito manual pode ser corrigido. */
export const MAX_RETRO_DAYS = 366;

/** Dados do formulário “Novo hábito”. */
export interface HabitDraft {
  name: string;
  icon: HabitIcon;
  color: HabitColor;
  type: HabitType;
  unit: string;
  source: HabitSource;
  repeat: Repeat;
  /** Meta (só nos hábitos de quantidade). */
  target: number | null;
  time: HabitTime | null;
  /** Início; hoje quando ausente. */
  since?: string;
  endsOn: string | null;
}

/** Campos editáveis depois de criado (tipo e fonte ficam fixos). */
export interface HabitEdit {
  name?: string;
  icon?: HabitIcon;
  color?: HabitColor;
  unit?: string;
  endsOn?: string | null;
  repeat?: Repeat;
  target?: number | null;
  time?: HabitTime | null;
}

export function newHabit(draft: HabitDraft, now: Date, order: number): Draft<Habit> {
  return {
    name: draft.name,
    icon: draft.icon,
    color: draft.color,
    type: draft.type,
    unit: draft.type === 'check' ? '' : draft.unit,
    source: draft.source,
    rules: [
      {
        since: draft.since ?? dayKey(now),
        repeat: draft.repeat,
        target: draft.type === 'check' ? null : draft.target,
        time: draft.time,
      },
    ],
    createdAt: toLocalIso(now),
    archivedAt: null,
    endsOn: draft.endsOn,
    order,
  };
}

/** A regra em vigor hoje (ou a primeira, se o hábito só começa no futuro). */
export const currentRule = (habit: Habit, today: string): HabitRule =>
  ruleOn(habit, today) ?? habit.rules[0]!;

const sameRule = (a: HabitRule, b: HabitRule): boolean =>
  JSON.stringify([a.repeat, a.target, a.time]) === JSON.stringify([b.repeat, b.target, b.time]);

/**
 * Aplica uma edição. Nome, ícone, cor, unidade e fim mudam direto; repetição, meta e horário criam
 * uma **nova regra a partir de hoje** (o passado continua como era). Se a última regra já começa
 * hoje (ou no futuro), ela é substituída em vez de empilhar outra.
 */
export function applyHabitEdit(habit: Habit, edit: HabitEdit, today: string): Patch<Habit> {
  const patch: Patch<Habit> = {};
  if (edit.name !== undefined) patch.name = edit.name;
  if (edit.icon !== undefined) patch.icon = edit.icon;
  if (edit.color !== undefined) patch.color = edit.color;
  if (edit.unit !== undefined) patch.unit = habit.type === 'check' ? '' : edit.unit;
  if (edit.endsOn !== undefined) patch.endsOn = edit.endsOn;

  const rulePart =
    edit.repeat !== undefined || edit.target !== undefined || edit.time !== undefined;
  if (!rulePart) return patch;

  const base = currentRule(habit, today);
  const next: HabitRule = {
    since: today,
    repeat: edit.repeat ?? base.repeat,
    target: habit.type === 'check' ? null : edit.target !== undefined ? edit.target : base.target,
    time: edit.time !== undefined ? edit.time : base.time,
  };
  if (sameRule(base, next)) return patch;

  const last = habit.rules.at(-1)!;
  patch.rules =
    last.since >= today
      ? [...habit.rules.slice(0, -1), { ...next, since: last.since }]
      : [...habit.rules, next];
  return patch;
}

/** Cópia do hábito: nome “… (cópia)” e a regra em vigor, começando hoje. */
export function duplicateHabitDraft(
  habit: Habit,
  today: string,
  nowIso: string,
  order: number,
): Draft<Habit> {
  const rule = currentRule(habit, today);
  const suffix = ' (cópia)';
  return {
    name: `${habit.name.slice(0, 60 - suffix.length)}${suffix}`,
    icon: habit.icon,
    color: habit.color,
    type: habit.type,
    unit: habit.unit,
    source: habit.source,
    rules: [{ ...rule, since: today }],
    createdAt: nowIso,
    archivedAt: null,
    endsOn: habit.endsOn,
    order,
  };
}

/** O snapshot sem o hábito e sem os registros dele. */
export const removeHabit = (snapshot: DataSnapshot, id: string): DataSnapshot => ({
  ...snapshot,
  habits: snapshot.habits.filter((h) => h.id !== id),
  habitLogs: snapshot.habitLogs.filter((log) => log.habitId !== id),
});

/** Só hábitos manuais; hoje ou dia passado dentro dos últimos 366 dias (o futuro é bloqueado). */
export function canEditDay(habit: Habit, date: string, today: string): boolean {
  if (habit.source !== 'manual' || date > today) return false;
  return daysBetween(date, today) <= MAX_RETRO_DAYS;
}
