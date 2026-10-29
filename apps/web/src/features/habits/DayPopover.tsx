import { useState } from 'react';
import type { Habit } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Popover } from '../../components/ui/Popover';
import { useData } from '../../lib/data/app-store';
import { canEditDay } from '../../lib/habits/edit';
import { dayState, isDone, targetOn, valueOn, type HabitContext } from '../../lib/habits';
import { formatAmount, formatLongDay, stateText } from '../../lib/habits/summary';

interface DayPopoverProps {
  habit: Habit;
  date: string;
  ctx: HabitContext;
  now: Date;
  anchor: HTMLElement;
  onClose: () => void;
}

/** Popover do dia no heatmap: edita dias passados de hábitos manuais; nos demais só informa. */
export function DayPopover({ habit, date, ctx, now, anchor, onClose }: DayPopoverProps) {
  const setHabitValue = useData((s) => s.setHabitValue);
  const state = dayState(habit, date, ctx);
  const value = valueOn(habit, date, ctx);
  const target = targetOn(habit, date);
  const editable = canEditDay(habit, date, ctx.today);
  const [draft, setDraft] = useState(String(value));

  const save = (next: number) => {
    setHabitValue(habit.id, date, next, now);
    onClose();
  };

  let info: string | null = null;
  if (!editable) {
    info =
      date > ctx.today
        ? 'Dias futuros não podem ser registrados.'
        : habit.source !== 'manual'
          ? 'Este hábito é calculado automaticamente a partir dos seus dados.'
          : 'Só dá para corrigir os últimos 366 dias.';
  }

  return (
    <Popover anchor={anchor} onClose={onClose} aria-label={`${habit.name}, ${formatLongDay(date)}`}>
      <div className="flex w-popover flex-col gap-3 p-4">
        <div>
          <p className="text-md font-semibold">{habit.name}</p>
          <p className="text-sm text-muted">
            {formatLongDay(date)} · {stateText(state)}
          </p>
        </div>

        {habit.type === 'quantidade' && state !== 'nao-agendado' && state !== 'futuro' && (
          <p className="text-md tabular-nums">
            {formatAmount(value, habit.unit)} de {formatAmount(target, habit.unit)}
          </p>
        )}
        {state === 'nao-agendado' && (
          <p className="text-sm text-muted">Este hábito não estava agendado neste dia.</p>
        )}
        {info && <p className="text-sm text-muted">{info}</p>}

        {editable && habit.type === 'check' && (
          <Button onClick={() => save(isDone(habit, date, ctx) ? 0 : 1)}>
            {isDone(habit, date, ctx) ? 'Desmarcar' : 'Marcar como feito'}
          </Button>
        )}
        {editable && habit.type === 'quantidade' && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const next = Number(draft.replace(',', '.'));
              if (Number.isFinite(next) && next >= 0) save(next);
            }}
          >
            <label className="flex flex-1 flex-col gap-1 text-sm text-soft">
              Valor ({habit.unit || 'unidades'})
              <input
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-select rounded-md border-hair bg-surface px-3 text-md text-fg"
              />
            </label>
            <Button type="submit">Salvar</Button>
          </form>
        )}
      </div>
    </Popover>
  );
}
