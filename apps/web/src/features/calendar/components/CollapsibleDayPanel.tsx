import { useId, useState } from 'react';
import { parseISO } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import type { Habit, StudyEvent } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { formatCountdown } from '../../../lib/data/countdown';
import { isDone, isRestDay, isScheduled, type HabitContext } from '../../../lib/habits';
import { nextExam } from '../../../lib/stats/derive';
import { daySummary } from '../lib/compact';
import { DayPanel } from './DayPanel';

interface CollapsibleDayPanelProps {
  date: string;
  today: string;
  now: Date;
  events: readonly StudyEvent[];
  habits: readonly Habit[];
  ctx: HabitContext;
}

/**
 * Painel do Dia no celular: seção recolhível acima da grade, com o resumo em uma linha
 * ("2 hábitos pendentes · prova em 3 dias") sempre visível.
 */
export function CollapsibleDayPanel(props: CollapsibleDayPanelProps) {
  const { date, today, now, events, habits, ctx } = props;
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const scheduled = habits.filter(
    (habit) => isScheduled(habit, date) && !isRestDay(ctx, habit.id, date),
  );
  const exam = nextExam(events, now);
  const summary = daySummary({
    scheduledHabits: scheduled.length,
    pendingHabits: scheduled.filter((habit) => !isDone(habit, date, ctx)).length,
    habitsActionable: date <= today,
    examCountdown: exam ? formatCountdown(parseISO(exam.start), now) : null,
  });

  return (
    <div className="border-b-hair">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-touch w-full items-center justify-between gap-3 px-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-md font-semibold">Resumo do dia</span>
          <span className="block truncate text-sm text-muted">{summary}</span>
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className={cn('size-icon shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      <div id={panelId} hidden={!open}>
        <DayPanel {...props} />
      </div>
    </div>
  );
}
