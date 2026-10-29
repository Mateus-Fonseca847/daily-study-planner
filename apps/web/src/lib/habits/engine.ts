import type { Habit, HabitRule } from '@daily/shared';
import { daysBetween, shiftDay } from '../dates';
import { loggedValue, type HabitContext } from './context';
import { occursOn } from './repeat';

export type DayState = 'futuro' | 'nao-agendado' | 'feito' | 'parcial' | 'perdido' | 'pendente';
export type Level = 0 | 1 | 2 | 3 | 4;

/** Limite de segurança das buscas para trás (10 anos). */
export const MAX_LOOKBACK_DAYS = 3660;

/** A regra que vale em `date`: a última com `since ≤ date` (ou nenhuma antes da primeira). */
export function ruleOn(habit: Habit, date: string): HabitRule | undefined {
  let found: HabitRule | undefined;
  for (const rule of habit.rules) {
    if (rule.since <= date) found = rule;
    else break;
  }
  return found;
}

/** Primeiro dia em que o hábito pode ter sido agendado. */
export const firstDay = (habit: Habit): string =>
  habit.rules[0]?.since ?? habit.createdAt.slice(0, 10);

/** O hábito está agendado em `date` (regra vigente, arquivamento, fim e blocos de estudo do dia). */
export function isScheduled(habit: Habit, date: string, ctx: HabitContext): boolean {
  const rule = ruleOn(habit, date);
  if (!rule || !occursOn(rule.repeat, rule.since, date)) return false;
  if (habit.archivedAt !== null && date > habit.archivedAt.slice(0, 10)) return false;
  if (habit.endsOn !== null && date > habit.endsOn) return false;
  if (habit.source === 'blocos') return (ctx.blocks.get(date)?.total ?? 0) > 0;
  return true;
}

/** Meta do dia (hábitos de quantidade; `1` nos de check). */
export const targetOn = (habit: Habit, date: string): number =>
  habit.type === 'check' ? 1 : (ruleOn(habit, date)?.target ?? 1);

/** Valor do dia: registro (manual) ou derivado de água, foco ou blocos (proporção 0–1). */
export function valueOn(habit: Habit, date: string, ctx: HabitContext): number {
  switch (habit.source) {
    case 'manual':
      return loggedValue(ctx, habit.id, date);
    case 'agua':
      return ctx.waterMl.get(date) ?? 0;
    case 'foco':
      return ctx.focusMin.get(date) ?? 0;
    case 'blocos': {
      const blocks = ctx.blocks.get(date);
      return blocks && blocks.total > 0 ? blocks.done / blocks.total : 0;
    }
  }
}

/** A meta do dia foi cumprida (check: feito; quantidade: valor ≥ meta). */
export const isDone = (habit: Habit, date: string, ctx: HabitContext): boolean =>
  valueOn(habit, date, ctx) >= targetOn(habit, date);

export function dayState(habit: Habit, date: string, ctx: HabitContext): DayState {
  if (date > ctx.today) return 'futuro';
  if (!isScheduled(habit, date, ctx)) return 'nao-agendado';
  if (isDone(habit, date, ctx)) return 'feito';
  if (date === ctx.today) return 'pendente';
  return valueOn(habit, date, ctx) > 0 ? 'parcial' : 'perdido';
}

/** Proporção da meta → nível 0–4 (0; ≤ 25 %; ≤ 50 %; < 100 %; ≥ 100 %). */
export function levelOfRatio(ratio: number): Level {
  if (ratio <= 0) return 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

/** Intensidade da célula: check = 0 ou 4; quantidade = proporção da meta. Fora da agenda = 0. */
export function levelOn(habit: Habit, date: string, ctx: HabitContext): Level {
  const state = dayState(habit, date, ctx);
  if (state === 'futuro' || state === 'nao-agendado') return 0;
  if (habit.type === 'check') return state === 'feito' ? 4 : 0;
  return levelOfRatio(valueOn(habit, date, ctx) / targetOn(habit, date));
}

/** Estados que entram nas contas (hoje pendente ainda não conta, a favor nem contra). */
const counts = (state: DayState): boolean =>
  state === 'feito' || state === 'parcial' || state === 'perdido';

export interface Streak {
  current: number;
  best: number;
}

/**
 * Sequência de dias agendados cumpridos. Dias não agendados não quebram nem somam; hoje pendente
 * não quebra (a atual conta até ontem). A melhor percorre todo o histórico.
 */
export function streaks(habit: Habit, ctx: HabitContext): Streak {
  const span = Math.min(MAX_LOOKBACK_DAYS, Math.max(0, daysBetween(firstDay(habit), ctx.today)));
  const first = shiftDay(ctx.today, -span);

  let best = 0;
  let run = 0;
  for (let i = 0; i <= span; i += 1) {
    const state = dayState(habit, shiftDay(first, i), ctx);
    if (state === 'feito') {
      run += 1;
      best = Math.max(best, run);
    } else if (counts(state)) {
      run = 0;
    }
  }
  // O laço termina em hoje, então `run` já é a sequência atual.
  return { current: run, best };
}

export const sequencia = (habit: Habit, ctx: HabitContext): number => streaks(habit, ctx).current;
export const melhorSequencia = (habit: Habit, ctx: HabitContext): number =>
  streaks(habit, ctx).best;

export interface Rate {
  done: number;
  scheduled: number;
  /** 0–100, ou `null` sem dias agendados na janela. */
  percent: number | null;
}

/** Dias cumpridos ÷ dias agendados nos últimos `days` dias (hoje conta só depois de cumprido). */
export function rate(habit: Habit, ctx: HabitContext, days: number): Rate {
  let done = 0;
  let scheduled = 0;
  for (let back = 0; back < days; back += 1) {
    const state = dayState(habit, shiftDay(ctx.today, -back), ctx);
    if (state === 'feito') {
      done += 1;
      scheduled += 1;
    } else if (counts(state)) {
      scheduled += 1;
    }
  }
  return {
    done,
    scheduled,
    percent: scheduled === 0 ? null : Math.round((done / scheduled) * 100),
  };
}

/** Hábitos ativos (não arquivados) agendados hoje e ainda não cumpridos. */
export const pendingToday = (habits: readonly Habit[], ctx: HabitContext): Habit[] =>
  habits.filter((h) => h.archivedAt === null && dayState(h, ctx.today, ctx) === 'pendente');

/** Hábitos ativos agendados hoje (cumpridos ou não). */
export const scheduledToday = (habits: readonly Habit[], ctx: HabitContext): Habit[] =>
  habits.filter((h) => h.archivedAt === null && isScheduled(h, ctx.today, ctx));
