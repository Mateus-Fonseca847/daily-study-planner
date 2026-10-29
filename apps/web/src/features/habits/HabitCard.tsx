import { useMemo, useState } from 'react';
import { Copy, Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Habit } from '@daily/shared';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { deleteHabitWithUndo } from '../../lib/data/actions';
import { useData } from '../../lib/data/app-store';
import { isScheduled, rate, ruleOn, streaks, type HabitContext } from '../../lib/habits';
import { describeRepeat, formatTimeOfDay } from '../../lib/habits/repeat';
import { formatAmount } from '../../lib/habits/summary';
import { openHabitForm } from '../../lib/ui-store';
import { DayPopover } from './DayPopover';
import { HabitControl } from './HabitControl';
import { cn } from '../../lib/cn';
import { HABIT_COLOR_CLASS, HABIT_ICON_COMPONENT } from './habit-icons';
import { HabitHeatmap } from './HabitHeatmap';

interface HabitCardProps {
  habit: Habit;
  ctx: HabitContext;
  now: Date;
  from: string;
  to: string;
}

/** Resumo da regra em vigor: “Seg, qua e sex · 19h · meta 750 ml”. */
export function habitSummary(habit: Habit, today: string): string {
  const rule = ruleOn(habit, today) ?? habit.rules[0];
  if (!rule) return '';
  const parts = [describeRepeat(rule.repeat)];
  if (rule.time) parts.push(formatTimeOfDay(rule.time.start));
  if (habit.type === 'quantidade' && rule.target !== null) {
    parts.push(`meta ${formatAmount(rule.target, habit.unit)}`);
  }
  return parts.join(' · ');
}

/** Cartão de um hábito: cabeçalho, números, controle de hoje e o heatmap. */
export function HabitCard({ habit, ctx, now, from, to }: HabitCardProps) {
  const duplicateHabit = useData((s) => s.duplicateHabit);
  const archiveHabit = useData((s) => s.archiveHabit);
  const [day, setDay] = useState<{ date: string; anchor: HTMLElement } | null>(null);
  const Icon = HABIT_ICON_COMPONENT[habit.icon];

  const stats = useMemo(() => streaks(habit, ctx), [habit, ctx]);
  const rate90 = useMemo(() => rate(habit, ctx, 90), [habit, ctx]);
  const scheduledToday = isScheduled(habit, ctx.today, ctx);

  const items: MenuItem[] = [
    { label: 'Editar', icon: Pencil, onSelect: () => openHabitForm(habit) },
    { label: 'Duplicar', icon: Copy, onSelect: () => duplicateHabit(habit.id, now) },
    { label: 'Arquivar', icon: Archive, onSelect: () => archiveHabit(habit.id, now) },
    { label: 'Excluir', icon: Trash2, onSelect: () => deleteHabitWithUndo(habit.id) },
  ];

  return (
    <section
      aria-label={habit.name}
      className={cn(
        'surface-glass flex flex-col gap-4 rounded-card p-card',
        HABIT_COLOR_CLASS[habit.color],
      )}
    >
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="habit-bg-soft habit-text inline-flex size-control shrink-0 items-center justify-center rounded-full">
          <Icon aria-hidden strokeWidth={1.5} className="size-icon" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-card-title font-normal">{habit.name}</h2>
          <p className="truncate text-sm text-muted">{habitSummary(habit, ctx.today)}</p>
        </div>

        <dl className="flex items-center gap-6 text-sm">
          <div>
            <dt className="text-muted">Sequência</dt>
            <dd className="text-md font-semibold tabular-nums">
              {stats.current} {stats.current === 1 ? 'dia' : 'dias'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Melhor</dt>
            <dd className="text-md font-semibold tabular-nums">
              {stats.best} {stats.best === 1 ? 'dia' : 'dias'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Taxa (90 dias)</dt>
            <dd className="text-md font-semibold tabular-nums">
              {rate90.percent === null ? '—' : `${rate90.percent}%`}
            </dd>
          </div>
        </dl>

        <div className="flex items-center gap-3">
          {scheduledToday ? (
            <HabitControl habit={habit} date={ctx.today} ctx={ctx} now={now} />
          ) : (
            <span className="text-xs text-muted">Não agendado hoje</span>
          )}
          <Menu
            label={`Ações de ${habit.name}`}
            align="end"
            items={items}
            trigger={(props) => (
              <button
                type="button"
                aria-label={`Ações de ${habit.name}`}
                className="inline-flex size-control items-center justify-center rounded-full bg-surface text-soft hover:text-fg"
                {...props}
              >
                <MoreHorizontal aria-hidden strokeWidth={1.5} className="size-icon" />
              </button>
            )}
          />
        </div>
      </header>

      <HabitHeatmap
        habit={habit}
        ctx={ctx}
        from={from}
        to={to}
        onDay={(date, anchor) => setDay({ date, anchor })}
      />

      {day && (
        <DayPopover
          habit={habit}
          date={day.date}
          ctx={ctx}
          now={now}
          anchor={day.anchor}
          onClose={() => setDay(null)}
        />
      )}
    </section>
  );
}
