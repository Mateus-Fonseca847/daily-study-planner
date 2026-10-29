import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useData } from '../../lib/data/app-store';
import type { GoalsSummary } from '../../lib/stats/derive';
import { GOAL_ICON_COMPONENT } from './goal-icons';
import { GoalsModal } from './GoalsModal';
import { StatCard } from './StatCard';

const SOURCE_TEXT = {
  'auto-agua': 'Automática: meta de água',
  'auto-estudo': 'Automática: blocos de estudo de hoje',
} as const;

interface GoalsCardProps {
  summary: GoalsSummary;
  /** Dia (`yyyy-MM-dd`) em que os registros são gravados. */
  today: string;
  now: Date;
}

/** Metas do dia: manuais com caixa de seleção; automáticas mostram a origem e não são clicáveis. */
export function GoalsCard({ summary, today, now }: GoalsCardProps) {
  const setGoalDone = useData((s) => s.setGoalDone);
  const [managing, setManaging] = useState(false);

  return (
    <StatCard
      title="Metas do dia"
      className="h-full overflow-hidden"
      action={
        <button
          type="button"
          aria-label="Gerenciar metas"
          title="Gerenciar metas"
          onClick={() => setManaging(true)}
          className="inline-flex size-control shrink-0 items-center justify-center rounded-full bg-pill text-pill-fg hover:brightness-95"
        >
          <Pencil aria-hidden strokeWidth={1.5} className="size-icon" />
        </button>
      }
    >
      <div aria-hidden className="glow-accent pointer-events-none absolute inset-0 rounded-card" />

      {summary.visible.length === 0 ? (
        <p className="relative mt-6 text-md text-muted">
          Nenhuma meta ativa. Use o lápis para criar a primeira.
        </p>
      ) : (
        <ul className="relative mt-4 flex flex-col">
          {summary.visible.map(({ goal, done }) => {
            const Icon = GOAL_ICON_COMPONENT[goal.icon];
            const source = goal.kind === 'manual' ? null : SOURCE_TEXT[goal.kind];
            return (
              <li
                key={goal.id}
                className="flex items-center gap-3 border-b-hair border-dashed py-3 last:border-b-0"
              >
                <span className="inline-flex size-goal-icon shrink-0 items-center justify-center rounded-full bg-chart-track-strong text-soft">
                  <Icon aria-hidden strokeWidth={1.5} className="size-icon" />
                </span>
                <span className={cn('min-w-0 flex-1', done && 'opacity-done')}>
                  <span className={cn('block truncate text-md', done && 'line-through')}>
                    {goal.title}
                  </span>
                  {source && <span className="block truncate text-xs text-muted">{source}</span>}
                </span>
                {goal.kind === 'manual' ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={goal.title}
                    onClick={() => setGoalDone(goal.id, today, !done)}
                    className={cn(
                      'inline-flex size-goal-check shrink-0 items-center justify-center rounded-full',
                      done ? 'bg-accent text-accent-fg' : 'bg-chart-track-strong',
                    )}
                  >
                    {done && <Check aria-hidden strokeWidth={3} className="size-icon-sm" />}
                  </button>
                ) : (
                  <span
                    role="img"
                    aria-label={
                      done ? 'Cumprida automaticamente' : 'Ainda não cumprida (automática)'
                    }
                    className={cn(
                      'inline-flex size-goal-check shrink-0 items-center justify-center rounded-full',
                      done ? 'bg-accent text-accent-fg' : 'bg-chart-track',
                    )}
                  >
                    {done && <Check aria-hidden strokeWidth={3} className="size-icon-sm" />}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative mt-auto pt-6">
        <div
          role="progressbar"
          aria-label="Metas concluídas hoje"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.percent}
          className="h-stat-bar w-full overflow-hidden rounded-full bg-chart-track-strong"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${summary.percent}%` }} />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-md text-muted">Concluído</span>
          <span className="text-stat font-normal tabular-nums">{summary.percent}%</span>
        </div>
      </div>

      {managing && <GoalsModal now={now} onClose={() => setManaging(false)} />}
    </StatCard>
  );
}
