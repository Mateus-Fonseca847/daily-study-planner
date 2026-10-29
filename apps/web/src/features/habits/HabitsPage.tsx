import { useMemo, useState } from 'react';
import { ArchiveRestore, Plus, Repeat, Trash2 } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Select';
import { deleteHabitWithUndo } from '../../lib/data/actions';
import { useData } from '../../lib/data/app-store';
import { shiftDay } from '../../lib/dates';
import { firstDay } from '../../lib/habits';
import { habitSuggestions } from '../../lib/habits/suggestions';
import { openHabitForm } from '../../lib/ui-store';
import { HabitCard, habitSummary } from './HabitCard';
import { cn } from '../../lib/cn';
import { HABIT_COLOR_CLASS, HABIT_ICON_COMPONENT } from './habit-icons';
import { useHabitModel } from './useHabitModel';

const LAST_12_MONTHS = 'ultimos-12-meses';

/** Janela do heatmap: últimos 12 meses (até hoje) ou um ano civil inteiro. */
export function periodRange(period: string, today: string): { from: string; to: string } {
  if (period === LAST_12_MONTHS) return { from: shiftDay(today, -364), to: today };
  return { from: `${period}-01-01`, to: `${period}-12-31` };
}

/** Anos com dados (do primeiro hábito até hoje), do mais recente para o mais antigo. */
export function yearsWithData(starts: readonly string[], today: string): string[] {
  const first = Number((starts.slice().sort()[0] ?? today).slice(0, 4));
  const last = Number(today.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, i) => String(last - i));
}

/** Página `/habitos`: um cartão por hábito, com heatmap, sequência e taxa. */
export function HabitsPage() {
  const { now, today, habits, ctx } = useHabitModel();
  const createHabit = useData((s) => s.createHabit);
  const restoreHabit = useData((s) => s.restoreHabit);
  const waterGoalMl = useData((s) => s.preferences.waterGoalMl);
  const [period, setPeriod] = useState(LAST_12_MONTHS);

  const active = habits.filter((h) => h.archivedAt === null);
  const archived = habits.filter((h) => h.archivedAt !== null);
  const years = useMemo(() => yearsWithData(habits.map(firstDay), today), [habits, today]);
  const { from, to } = periodRange(period, today);

  const options = [
    { value: LAST_12_MONTHS, label: 'Últimos 12 meses' },
    ...years.map((year) => ({ value: year, label: year })),
  ];

  return (
    <PageShell
      title="Hábitos"
      description="Acompanhe o que você repete: cada hábito tem o próprio calendário, sequência e taxa."
      actions={
        <div className="flex items-center gap-3">
          <Select
            aria-label="Período"
            value={period}
            options={options}
            className="w-menu"
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button onClick={() => openHabitForm()}>
            <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
            Novo hábito
          </Button>
        </div>
      }
    >
      {active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhum hábito ainda"
          description="Crie o seu primeiro ou comece por uma sugestão; dá para editar tudo depois."
        >
          {habitSuggestions(waterGoalMl).map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="secondary"
              onClick={() => createHabit(suggestion.draft, now)}
            >
              {suggestion.label}
            </Button>
          ))}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {active.map((habit) => (
            <HabitCard key={habit.id} habit={habit} ctx={ctx} now={now} from={from} to={to} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <details className="rounded-xl border-hair px-4 py-3">
          <summary className="cursor-pointer text-md font-medium text-soft">
            Arquivados ({archived.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {archived.map((habit) => {
              const Icon = HABIT_ICON_COMPONENT[habit.icon];
              return (
                <li
                  key={habit.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg bg-surface px-4 py-3',
                    HABIT_COLOR_CLASS[habit.color],
                  )}
                >
                  <Icon aria-hidden strokeWidth={1.5} className="habit-text size-icon shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-md">{habit.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {habitSummary(habit, today)}
                    </span>
                  </span>
                  <Button variant="secondary" onClick={() => restoreHabit(habit.id)}>
                    <ArchiveRestore aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                    Restaurar
                  </Button>
                  <Button
                    variant="icon"
                    size="xs"
                    aria-label={`Excluir ${habit.name}`}
                    onClick={() => deleteHabitWithUndo(habit.id)}
                  >
                    <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </PageShell>
  );
}
