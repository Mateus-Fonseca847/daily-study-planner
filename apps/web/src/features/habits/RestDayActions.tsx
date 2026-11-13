import { useId, useState } from 'react';
import { Moon } from 'lucide-react';
import type { Habit } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { setRestDaysWithUndo } from '../../lib/data/actions';
import { shiftDay } from '../../lib/dates';
import type { HabitContext } from '../../lib/habits';

/** Quantos dias “Também os próximos 30 dias” cobre (contando o dia escolhido). */
export const REST_SPAN_DAYS = 30;

interface RestDayActionsProps {
  habit: Habit;
  date: string;
  ctx: HabitContext;
  onDone: () => void;
}

/**
 * “Marcar descanso” no popover/sheet do dia: este hábito ou todos, opcionalmente pelos próximos
 * 30 dias. Descanso conta como não agendado (não quebra a sequência nem entra na taxa).
 */
export function RestDayActions({ habit, date, ctx, onDone }: RestDayActionsProps) {
  const spanId = useId();
  const [span, setSpan] = useState(false);
  const own = ctx.rest.has(`${habit.id}:${date}`);
  const all = ctx.rest.has(`*:${date}`);
  const dates = span ? Array.from({ length: REST_SPAN_DAYS }, (_, i) => shiftDay(date, i)) : [date];

  const apply = (habitId: string | null, rest: boolean, which = dates) => {
    setRestDaysWithUndo(habitId, which, rest);
    onDone();
  };

  if (own || all) {
    return (
      <div className="flex flex-col gap-2 border-t-hair pt-3">
        <p className="flex items-center gap-2 text-sm text-soft">
          <Moon aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          Dia de descanso {all ? '(todos os hábitos)' : '(este hábito)'}
        </p>
        <Button variant="secondary" onClick={() => apply(all ? null : habit.id, false, [date])}>
          Desfazer descanso
        </Button>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2 border-t-hair pt-3">
      <legend className="flex items-center gap-2 text-sm font-medium text-soft">
        <Moon aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        Marcar descanso
      </legend>
      <label
        htmlFor={spanId}
        className="flex cursor-pointer items-center gap-2 text-sm text-soft coarse:min-h-touch"
      >
        <input
          id={spanId}
          type="checkbox"
          checked={span}
          onChange={(e) => setSpan(e.target.checked)}
          className="size-checkbox accent-accent"
        />
        Também os próximos {REST_SPAN_DAYS - 1} dias
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => apply(habit.id, true)}>
          Só este hábito
        </Button>
        <Button variant="secondary" onClick={() => apply(null, true)}>
          Todos os hábitos
        </Button>
      </div>
    </fieldset>
  );
}
