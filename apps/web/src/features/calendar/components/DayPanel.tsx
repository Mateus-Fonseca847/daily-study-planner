import { Link } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { isOpen, isTask, type Habit, type StudyEvent } from '@daily/shared';
import { Checkbox } from '../../../components/ui/Checkbox';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { cn } from '../../../lib/cn';
import { useData } from '../../../lib/data/app-store';
import { formatCountdown } from '../../../lib/data/countdown';
import { isDone, isScheduled, type HabitContext } from '../../../lib/habits';
import { describeRepeat, formatTimeOfDay } from '../../../lib/habits/repeat';
import { examPrep, nextExam } from '../../../lib/stats/derive';
import { HabitControl } from '../../habits/HabitControl';
import { HABIT_COLOR_CLASS, HABIT_ICON_COMPONENT } from '../../habits/habit-icons';
import { ruleOn } from '../../../lib/habits';

const CARD = 'rounded-card border-hair bg-surface p-4';
const TITLE = 'text-md font-semibold tracking-tight';

interface DayPanelProps {
  date: string;
  today: string;
  now: Date;
  events: readonly StudyEvent[];
  habits: readonly Habit[];
  ctx: HabitContext;
}

/** Hábitos agendados no dia, com os mesmos controles da página Hábitos (futuro é só leitura). */
function DayHabits({
  date,
  now,
  habits,
  ctx,
}: Pick<DayPanelProps, 'date' | 'now' | 'habits' | 'ctx'>) {
  const list = habits.filter((habit) => isScheduled(habit, date, ctx));
  return (
    <section aria-labelledby="day-habits-title" className={CARD}>
      <h3 id="day-habits-title" className={TITLE}>
        Hábitos do dia
      </h3>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nenhum hábito agendado para este dia.</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {list.map((habit) => {
            const Icon = HABIT_ICON_COMPONENT[habit.icon];
            const time = ruleOn(habit, date)?.time;
            const finished = isDone(habit, date, ctx);
            return (
              <li
                key={habit.id}
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-1 border-b-hair border-dashed py-2 last:border-b-0',
                  HABIT_COLOR_CLASS[habit.color],
                )}
              >
                <span className="habit-bg-soft habit-text inline-flex size-goal-icon shrink-0 items-center justify-center rounded-full">
                  <Icon aria-hidden strokeWidth={1.5} className="size-icon" />
                </span>
                <span className={cn('min-w-popover-label flex-1', finished && 'opacity-done')}>
                  <span className={cn('block truncate text-md', finished && 'line-through')}>
                    {habit.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {describeRepeat(ruleOn(habit, date)?.repeat ?? habit.rules[0]!.repeat)}
                    {time && ` · ${formatTimeOfDay(time.start)}`}
                  </span>
                </span>
                {date <= ctx.today ? (
                  <HabitControl habit={habit} date={date} ctx={ctx} now={now} />
                ) : (
                  <span className="text-xs text-muted">Agendado</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Próxima prova: contagem regressiva, progresso dos conteúdos e atalho para abrir. */
function NextExam({ events, now }: Pick<DayPanelProps, 'events' | 'now'>) {
  const exam = nextExam(events, now);
  const prep = exam ? examPrep(exam) : undefined;
  return (
    <section aria-labelledby="day-exam-title" className={CARD}>
      <h3 id="day-exam-title" className={TITLE}>
        Próxima prova
      </h3>
      {!exam || !prep ? (
        <p className="mt-3 text-sm text-muted">Nenhuma prova à vista. Aproveite para planejar.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-md font-medium">{exam.title}</span>
            <span className="shrink-0 text-md font-semibold">
              {formatCountdown(parseISO(exam.start), now)}
            </span>
          </div>
          <ProgressBar value={prep.percent / 100} aria-label={`Preparação para ${exam.title}`} />
          <span className="text-xs text-muted">
            {prep.hint ?? `${prep.done}/${prep.total} conteúdos (${prep.percent}%)`}
          </span>
          <Link
            to="/provas"
            className="self-start rounded-sm text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Abrir provas
          </Link>
        </div>
      )}
    </section>
  );
}

/** Entregas pendentes do dia e as atrasadas, com caixa de seleção para concluir. */
function DayTasks({ date, today, events }: Pick<DayPanelProps, 'date' | 'today' | 'events'>) {
  const setStatus = useData((s) => s.setEventStatus);
  const tasks = events
    .filter(isTask)
    .filter((task) => isOpen(task))
    .filter((task) => {
      const day = task.start.slice(0, 10);
      return day === date || day < today;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  return (
    <section aria-labelledby="day-tasks-title" className={CARD}>
      <h3 id="day-tasks-title" className={TITLE}>
        Tarefas do dia
      </h3>
      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nenhuma entrega pendente. Dia livre!</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {tasks.map((task) => {
            const overdue = task.start.slice(0, 10) < today;
            return (
              <li key={task.id} className="flex flex-col gap-0.5">
                <Checkbox
                  label={task.title}
                  checked={false}
                  onChange={() => setStatus(task.id, 'concluido')}
                />
                <span className={cn('pl-6 text-xs', overdue ? 'text-danger' : 'text-muted')}>
                  {overdue ? 'Atrasada · ' : ''}
                  {task.start.slice(8, 10)}/{task.start.slice(5, 7)} às {task.start.slice(11, 16)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Painel lateral da visão Dia. */
export function DayPanel(props: DayPanelProps) {
  return (
    <aside aria-label="Resumo do dia" className="flex flex-col gap-3 overflow-y-auto p-4">
      <DayHabits {...props} />
      <NextExam events={props.events} now={props.now} />
      <DayTasks date={props.date} today={props.today} events={props.events} />
    </aside>
  );
}
