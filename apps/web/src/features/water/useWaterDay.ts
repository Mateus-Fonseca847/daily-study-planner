import { useState } from 'react';
import { format } from 'date-fns';
import type { WaterLog } from '@daily/shared';
import { useData } from '../../lib/data/app-store';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { formatLiters } from '../../lib/stats/format';
import { useToasts } from '../../lib/toast-store';
import {
  canEditWaterDay,
  isValidTime,
  logsOfDay,
  planDayTotal,
  RETRO_TIME,
  totalMl,
  validateEntry,
  type DayTotalPlan,
  type WaterEntry,
} from '../../lib/water/day';

/** Quanto tempo o aviso com “Desfazer” fica na tela. */
const UNDO_MS = 6000;

export interface WaterDay {
  date: string;
  today: string;
  logs: WaterLog[];
  total: number;
  goalMl: number;
  cupMl: number;
  /** Hoje ou dia passado dentro de 366 dias (o futuro é só leitura). */
  editable: boolean;
  /** Anúncio educado do último resultado (“Total de hoje: 0,75 L”). */
  announcement: string;
  /** Cada ação devolve uma mensagem de erro em pt-BR, ou `null` se deu certo. */
  add(ml: number, time?: string): string | null;
  addCup(): string | null;
  edit(id: string, ml: number, time: string): string | null;
  remove(id: string): void;
  removeLast(): void;
  /** Prévia do ajuste do total do dia (nada é gravado). */
  planTotal(target: number): DayTotalPlan;
  applyTotal(plan: DayTotalPlan): void;
}

/** Registros de água de um dia, as ações de editá-los e o “Desfazer” de cada uma. */
export function useWaterDay(date: string): WaterDay {
  const waterLogs = useData((s) => s.waterLogs);
  const setWaterDay = useData((s) => s.setWaterDay);
  const { waterGoalMl: goalMl, cupMl } = useData((s) => s.preferences);
  const [announcement, setAnnouncement] = useState('');

  const now = appNow();
  const today = dayKey(now);
  const logs = logsOfDay(waterLogs, date);
  const total = totalMl(logs);
  const editable = canEditWaterDay(date, today);
  const label = date === today ? 'hoje' : 'do dia';
  const nowTime = format(now, 'HH:mm');
  const defaultTime = date === today ? nowTime : RETRO_TIME;

  /** Grava, avisa o novo total e oferece “Desfazer” (reenvia o estado anterior, com os mesmos ids). */
  const commit = (next: readonly WaterEntry[], message: string) => {
    const before = logs;
    setWaterDay(date, next);
    setAnnouncement(`Total ${label}: ${formatLiters(totalMl(next))}`);
    useToasts.getState().push({
      message,
      actionLabel: 'Desfazer',
      onAction: () => {
        setWaterDay(date, before);
        setAnnouncement(`Total ${label}: ${formatLiters(totalMl(before))}`);
      },
      durationMs: UNDO_MS,
    });
  };

  const add = (ml: number, time = defaultTime): string | null => {
    if (!editable) return 'Este dia não pode ser alterado.';
    if (!isValidTime(time)) return 'Informe um horário válido (hh:mm).';
    const error = validateEntry(ml, logs);
    if (error) return error;
    commit([...logs, { date, ml, time }], `+${ml} ml de água`);
    return null;
  };

  return {
    date,
    today,
    logs,
    total,
    goalMl,
    cupMl,
    editable,
    announcement,
    add,
    addCup: () => add(cupMl),
    edit: (id, ml, time) => {
      if (!editable) return 'Este dia não pode ser alterado.';
      if (!isValidTime(time)) return 'Informe um horário válido (hh:mm).';
      const error = validateEntry(
        ml,
        logs.filter((log) => log.id !== id),
      );
      if (error) return error;
      commit(
        logs.map((log) => (log.id === id ? { ...log, ml, time } : log)),
        'Registro atualizado',
      );
      return null;
    },
    remove: (id) => {
      if (!editable) return;
      commit(
        logs.filter((log) => log.id !== id),
        'Registro removido',
      );
    },
    removeLast: () => {
      const last = logs[logs.length - 1];
      if (!editable || !last) return;
      commit(logs.slice(0, -1), `Último registro removido (${last.ml} ml)`);
    },
    planTotal: (target) => planDayTotal(waterLogs, date, target, defaultTime),
    applyTotal: (plan) => {
      if (!editable) return;
      commit(plan.next, `Total ${label} ajustado para ${formatLiters(plan.total)}`);
    },
  };
}
