import type { WaterLog } from '@daily/shared';
import { daysBetween } from '../dates';
import { MAX_WATER_DAY_ML, MAX_WATER_LOG_ML, MIN_WATER_ML } from './parse';

/** Quantos dias para trás a água pode ser corrigida (o mesmo limite dos hábitos manuais). */
export const MAX_WATER_RETRO_DAYS = 366;
/** Horário padrão de um registro retroativo. */
export const RETRO_TIME = '12:00';

/** Hoje ou um dia passado dentro dos últimos 366 dias; o futuro é bloqueado. */
export function canEditWaterDay(date: string, today: string): boolean {
  return date <= today && daysBetween(date, today) <= MAX_WATER_RETRO_DAYS;
}

/** Registro ainda sem id (o id nasce no store). */
export type WaterEntry = Omit<WaterLog, 'id'> & { id?: string };

/** Registros de um dia, do mais antigo para o mais recente (empate: ordem de gravação). */
export function logsOfDay(logs: readonly WaterLog[], date: string): WaterLog[] {
  return logs
    .map((log, index) => ({ log, index }))
    .filter(({ log }) => log.date === date)
    .sort((a, b) => a.log.time.localeCompare(b.log.time) || a.index - b.index)
    .map(({ log }) => log);
}

export const totalMl = (logs: readonly Pick<WaterLog, 'ml'>[]): number =>
  logs.reduce((sum, log) => sum + log.ml, 0);

/**
 * Valida uma quantidade para um registro: de 1 a 5000 ml, e o dia não pode passar de 20 L.
 * `others` são os demais registros do dia (sem o que está sendo editado).
 */
export function validateEntry(ml: number, others: readonly Pick<WaterLog, 'ml'>[]): string | null {
  if (!Number.isInteger(ml) || ml < MIN_WATER_ML || ml > MAX_WATER_LOG_ML) {
    return `Informe de ${MIN_WATER_ML} a ${MAX_WATER_LOG_ML} ml por registro.`;
  }
  if (totalMl(others) + ml > MAX_WATER_DAY_ML) {
    return `O total do dia não pode passar de ${MAX_WATER_DAY_ML / 1000} L.`;
  }
  return null;
}

/** Horário `HH:mm` válido? */
export const isValidTime = (time: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

export interface DayTotalPlan {
  /** Estado final dos registros do dia (os novos sem `id`). */
  next: WaterEntry[];
  /** Registros removidos por inteiro. */
  removed: WaterLog[];
  /** Registros que só perderam parte da quantidade (o mais recente que sobrou). */
  reduced: WaterLog[];
  /** Total do dia depois do ajuste. */
  total: number;
}

/**
 * Ajuste do **total do dia** para `target` ml, sem mudar o modelo:
 * - maior: acrescenta registros com a diferença (em blocos de até 5000 ml);
 * - menor: remove, do mais recente para o mais antigo, até chegar ao total, reduzindo o último
 *   registro tocado se for preciso;
 * - igual: não muda nada.
 */
export function planDayTotal(
  logs: readonly WaterLog[],
  date: string,
  target: number,
  time: string,
): DayTotalPlan {
  const day = logsOfDay(logs, date);
  const current = totalMl(day);
  if (target === current) return { next: day, removed: [], reduced: [], total: current };

  if (target > current) {
    const next: WaterEntry[] = [...day];
    for (let left = target - current; left > 0;) {
      const ml = Math.min(left, MAX_WATER_LOG_ML);
      next.push({ date, ml, time });
      left -= ml;
    }
    return { next, removed: [], reduced: [], total: target };
  }

  const kept = [...day];
  const removed: WaterLog[] = [];
  const reduced: WaterLog[] = [];
  let excess = current - target;
  while (excess > 0 && kept.length > 0) {
    const last = kept[kept.length - 1] as WaterLog;
    if (last.ml <= excess) {
      kept.pop();
      removed.push(last);
      excess -= last.ml;
    } else {
      kept[kept.length - 1] = { ...last, ml: last.ml - excess };
      reduced.push(last);
      excess = 0;
    }
  }
  return { next: kept, removed, reduced, total: target };
}

/** Texto de confirmação do ajuste para baixo: “Isso removerá 2 registros e reduzirá 1.” */
export function describePlan(plan: Pick<DayTotalPlan, 'removed' | 'reduced'>): string | null {
  const parts: string[] = [];
  if (plan.removed.length > 0) {
    parts.push(
      `removerá ${plan.removed.length} ${plan.removed.length === 1 ? 'registro' : 'registros'}`,
    );
  }
  if (plan.reduced.length > 0) {
    parts.push(
      `reduzirá ${plan.reduced.length} ${plan.reduced.length === 1 ? 'registro' : 'registros'}`,
    );
  }
  return parts.length === 0 ? null : `Isso ${parts.join(' e ')}.`;
}
