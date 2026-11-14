import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Habit } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Popover } from '../../components/ui/Popover';
import { useData } from '../../lib/data/app-store';
import { shiftDay } from '../../lib/dates';
import { WaterPanel } from '../water/WaterPanel';
import { usePhone } from '../../lib/responsive/use-media';
import { canEditDay } from '../../lib/habits/edit';
import { dayState, isDone, targetOn, valueOn, type HabitContext } from '../../lib/habits';
import { formatAmount, formatLongDay, stateText } from '../../lib/habits/summary';
import { RestDayActions } from './RestDayActions';

interface DayPopoverProps {
  habit: Habit;
  date: string;
  ctx: HabitContext;
  now: Date;
  anchor: HTMLElement;
  /** Intervalo de dias navegável (os mesmos do heatmap). */
  range?: { from: string; to: string };
  /** Celular: troca de dia pelos botões ‹ ›. */
  onDateChange?: (date: string) => void;
  onClose: () => void;
}

/**
 * Popover do dia no heatmap: edita dias passados de hábitos manuais (nos demais só informa) e
 * marca/desfaz dias de descanso.
 */
export function DayPopover({
  habit,
  date,
  ctx,
  now,
  anchor,
  range,
  onDateChange,
  onClose,
}: DayPopoverProps) {
  const phone = usePhone();
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

  if (habit.source === 'agua') {
    // A água segue a mesma regra de descanso dos outros hábitos (por dia, desfazível, sem
    // quebrar a sequência); a meta do dia continua valendo se a pessoa beber mesmo assim.
    return (
      <WaterPanel
        anchor={anchor}
        date={date}
        onClose={onClose}
        footer={
          state !== 'nao-agendado' && (
            <RestDayActions habit={habit} date={date} ctx={ctx} onDone={onClose} />
          )
        }
      />
    );
  }

  return (
    <Popover anchor={anchor} onClose={onClose} aria-label={`${habit.name}, ${formatLongDay(date)}`}>
      <div className="flex w-popover max-w-full flex-col gap-3 p-4 phone:w-full phone:p-0">
        <div className="flex items-center justify-between gap-2">
          {phone && onDateChange && range && (
            <Button
              variant="icon"
              size="md"
              aria-label="Dia anterior"
              disabled={date <= range.from}
              onClick={() => onDateChange(shiftDay(date, -1))}
            >
              <ChevronLeft aria-hidden strokeWidth={1.5} className="size-icon" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-md font-semibold">{habit.name}</p>
            <p aria-live="polite" className="text-sm text-muted">
              {formatLongDay(date)} · {stateText(state)}
            </p>
          </div>
          {phone && onDateChange && range && (
            <Button
              variant="icon"
              size="md"
              aria-label="Próximo dia"
              disabled={date >= range.to}
              onClick={() => onDateChange(shiftDay(date, 1))}
            >
              <ChevronRight aria-hidden strokeWidth={1.5} className="size-icon" />
            </Button>
          )}
        </div>

        {habit.type === 'quantidade' &&
          state !== 'nao-agendado' &&
          state !== 'futuro' &&
          state !== 'descanso' && (
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
                className="h-select rounded-md border-hair bg-surface px-3 text-md text-fg coarse:h-touch"
              />
            </label>
            <Button type="submit">Salvar</Button>
          </form>
        )}
        {state !== 'nao-agendado' && (
          <RestDayActions habit={habit} date={date} ctx={ctx} onDone={onClose} />
        )}
      </div>
    </Popover>
  );
}
