import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Habit } from '@daily/shared';
import { cn } from '../../lib/cn';
import { isDone, scheduledToday, streaks, type HabitContext } from '../../lib/habits';
import { percentOf } from '../../lib/stats/format';
import { HabitControl, SOURCE_TEXT } from '../habits/HabitControl';
import { StreakFlame } from '../habits/StreakFlame';
import { habitColorClass, HABIT_ICON_COMPONENT } from '../habits/habit-icons';
import { StatCard } from './StatCard';

interface HabitsTodayCardProps {
  habits: readonly Habit[];
  ctx: HabitContext;
  now: Date;
}

/** Hábitos de hoje: os agendados, com a chama de cada um, o controle da página e “% concluído”. */
export function HabitsTodayCard({ habits, ctx, now }: HabitsTodayCardProps) {
  const today = ctx.today;
  const list = scheduledToday(habits, ctx);
  const done = list.filter((habit) => isDone(habit, today, ctx)).length;
  const percent = percentOf(done, list.length);

  return (
    <StatCard
      title="Hábitos de hoje"
      className="h-full overflow-hidden"
      action={
        <Link
          to="/habitos"
          aria-label="Gerenciar hábitos"
          title="Gerenciar hábitos"
          className="inline-flex size-control coarse:size-touch shrink-0 items-center justify-center rounded-full bg-pill text-pill-fg hover:brightness-95"
        >
          <Pencil aria-hidden strokeWidth={1.5} className="size-icon" />
        </Link>
      }
    >
      <div aria-hidden className="glow-accent pointer-events-none absolute inset-0 rounded-card" />

      {list.length === 0 ? (
        <p className="relative mt-6 text-md text-muted">
          Nenhum hábito agendado para hoje. Use o lápis para criar ou ajustar hábitos.
        </p>
      ) : (
        <ul className="relative mt-4 flex flex-col">
          {list.map((habit) => {
            const Icon = HABIT_ICON_COMPONENT[habit.icon];
            const finished = isDone(habit, today, ctx);
            return (
              <li
                key={habit.id}
                className={cn(
                  'flex items-center gap-3 border-b-hair border-dashed py-3 last:border-b-0',
                  habitColorClass(habit.color),
                )}
              >
                <span className="habit-bg-soft habit-text inline-flex size-goal-icon shrink-0 items-center justify-center rounded-full">
                  <Icon aria-hidden strokeWidth={1.5} className="size-icon" />
                </span>
                <span className={cn('min-w-0 flex-1', finished && 'opacity-done')}>
                  <span className={cn('block truncate text-md', finished && 'line-through')}>
                    {habit.name}
                  </span>
                  {habit.source !== 'manual' && (
                    // A origem fica embaixo do nome: ao lado do valor ela espremia o nome.
                    <span className="block text-xs leading-tight text-muted">
                      {SOURCE_TEXT[habit.source]}
                    </span>
                  )}
                </span>
                {/* Pílula própria: o brilho amarelo do cartão tirava contraste da chama. */}
                <StreakFlame
                  days={streaks(habit, ctx).current}
                  className="rounded-full bg-raised px-1.5 py-0.5"
                />
                <HabitControl habit={habit} date={today} ctx={ctx} now={now} showSource={false} />
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative mt-auto pt-6">
        <div
          role="progressbar"
          aria-label="Hábitos concluídos hoje"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-stat-bar w-full overflow-hidden rounded-full bg-chart-track-strong"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-md text-muted">Concluído</span>
          <span className="text-stat font-normal tabular-nums">{percent}%</span>
        </div>
      </div>
    </StatCard>
  );
}
