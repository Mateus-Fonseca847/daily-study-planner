import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlarmClock,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  FileCheck2,
  ListTodo,
  type LucideIcon,
} from 'lucide-react';
import { subtaskProgress, subtaskListLabel, type StudyEvent } from '@daily/shared';
import { PageShell } from '../../components/layout/PageShell';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/cn';
import { useData } from '../../lib/data/app-store';
import { chipStyle, EVENT_TYPE_META } from '../../lib/event-meta';
import { appNow } from '../../lib/fixture';
import { quickTaskDraft } from '../../lib/forms/quick-create';
import {
  dueOf,
  filterByType,
  taskSections,
  taskSummary,
  type UpcomingGroup,
} from '../../lib/tasks/sections';
import { useTypeFilter } from '../../lib/tasks/type-filter-store';
import { openEventForm } from '../../lib/ui-store';
import { RecurrenceIcon } from '../../components/ui/RecurrenceIcon';
import { recurrenceText } from '../../lib/recurrence/view';
import { buildCalendarSearch } from '../calendar/lib/views';
import { CompleteButton } from './CompleteButton';

const GROUP_LABEL: Record<UpcomingGroup, string> = {
  amanha: 'Amanhã',
  'esta-semana': 'Esta semana',
  'mais-tarde': 'Mais tarde',
};

function dueText(iso: string): string {
  const date = parseISO(iso);
  const time = format(date, 'HH:mm');
  if (isToday(date)) return `Hoje, ${time}`;
  if (isTomorrow(date)) return `Amanhã, ${time}`;
  return format(date, "EEE, d 'de' MMM, HH:mm", { locale: ptBR });
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-hair bg-surface p-4 phone:p-3">
      <Icon aria-hidden strokeWidth={1.5} className="size-icon text-muted" />
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="truncate text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

/** Linha em cartão: check, título, tipo, progresso das subtarefas, prazo e “Ver no calendário”. */
function TaskRow({
  task,
  overdue = false,
  moreThisWeek = 0,
}: {
  task: StudyEvent;
  overdue?: boolean;
  moreThisWeek?: number;
}) {
  const rule = recurrenceText(task);
  const meta = EVENT_TYPE_META[task.type];
  const style = chipStyle(task);
  const progress = subtaskProgress(task.subtasks);
  const TypeIcon = meta.icon;
  const day = dueOf(task).slice(0, 10);
  return (
    <li className="flex items-center gap-2 rounded-lg border-hair bg-surface px-3 py-2 phone:items-start">
      <CompleteButton event={task} />
      <button
        type="button"
        onClick={() => openEventForm({ event: task })}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md py-1 text-left"
      >
        <span className={cn('max-w-full truncate text-md font-medium text-fg', style.title)}>
          {task.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className={cn('inline-flex items-center gap-1', style.text)}>
            <TypeIcon aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            {meta.label}
          </span>
          {rule && (
            <span className="inline-flex items-center gap-1">
              <RecurrenceIcon label={rule} decorative />
              <span>{rule}</span>
              {moreThisWeek > 0 && <span>· +{moreThisWeek} nesta semana</span>}
            </span>
          )}
          {progress.total > 0 && (
            <span>
              {progress.done} de {progress.total} {subtaskListLabel(task.type).toLowerCase()}
            </span>
          )}
          <span className={cn(overdue && 'text-cancelado')}>
            {overdue && <span className="sr-only">Atrasada: </span>}
            {dueText(dueOf(task))}
          </span>
        </span>
      </button>
      <Link
        to={{ pathname: '/calendario', search: buildCalendarSearch({ view: 'dia', date: day }) }}
        aria-label={`Ver “${task.title}” no calendário`}
        title="Ver no calendário"
        className="inline-flex size-control-sm shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-fg coarse:size-touch"
      >
        <CalendarDays aria-hidden strokeWidth={1.5} className="size-icon-sm" />
      </Link>
    </li>
  );
}

function Section({
  title,
  count,
  children,
  collapsible = false,
}: {
  title: string;
  count: number;
  children: ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const bodyId = useId();
  const heading = (
    <span className="flex items-center gap-2">
      {title}
      <span className="rounded-full bg-hover px-2 text-sm font-medium text-soft tabular-nums">
        {count}
      </span>
    </span>
  );
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-md font-semibold">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-control-sm items-center gap-1 rounded-full coarse:h-touch"
          >
            <ChevronDown
              aria-hidden
              strokeWidth={1.5}
              className={cn('size-icon-sm transition-transform', !open && '-rotate-90')}
            />
            {heading}
          </button>
        ) : (
          heading
        )}
      </h2>
      {open && <div id={bodyId}>{children}</div>}
    </section>
  );
}

const List = ({
  items,
  overdue,
}: {
  items: readonly (StudyEvent & { moreThisWeek?: number })[];
  overdue?: boolean;
}) => (
  <ul className="flex flex-col gap-2">
    {items.map((task) => (
      <TaskRow
        key={task.id}
        task={task}
        moreThisWeek={task.moreThisWeek ?? 0}
        {...(overdue ? { overdue } : {})}
      />
    ))}
  </ul>
);

/** Página Tarefas: resumo, Atrasadas, Hoje, Próximas (todas as futuras) e Concluídas. */
export function TasksPage() {
  const allEvents = useData((s) => s.events);
  const exceptions = useData((s) => s.exceptions);
  const createEvent = useData((s) => s.createEvent);
  const types = useTypeFilter((s) => s.types);
  const [title, setTitle] = useState('');
  const now = useMemo(() => appNow(), []);

  const events = useMemo(() => filterByType(allEvents, types), [allEvents, types]);
  const sections = useMemo(() => taskSections(events, now, exceptions), [events, now, exceptions]);
  const summary = useMemo(() => taskSummary(events, now, exceptions), [events, now, exceptions]);
  const upcomingCount = sections.proximas.reduce((n, g) => n + g.items.length, 0);
  const nothingOpen =
    sections.atrasadas.length === 0 && sections.hoje.length === 0 && upcomingCount === 0;

  const add = (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    createEvent(quickTaskDraft(value, now));
    setTitle('');
  };

  return (
    <PageShell
      title="Tarefas"
      description="Tarefas, provas e especiais: o que está atrasado, o que vence hoje e tudo o que vem."
    >
      <form onSubmit={add}>
        <input
          aria-label="Nova tarefa"
          placeholder="Nova tarefa (prazo hoje) — Enter para adicionar"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          className="h-control w-full rounded-full border-hair bg-surface px-5 text-md text-fg placeholder:text-muted"
        />
      </form>

      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
        <SummaryCard
          icon={CheckCheck}
          label="Concluídas na semana"
          value={summary.concluidasSemana}
        />
        <SummaryCard icon={ListTodo} label="Pendentes" value={summary.pendentes} />
        <SummaryCard icon={AlarmClock} label="Atrasadas" value={summary.atrasadas} />
        <SummaryCard icon={FileCheck2} label="Próximas provas" value={summary.proximasProvas} />
      </div>

      {nothingOpen && (
        <EmptyState
          icon={ListTodo}
          title="Tudo em dia"
          description="Nenhuma tarefa pendente. Digite uma acima e pressione Enter, ou crie pelo calendário."
        />
      )}
      {sections.atrasadas.length > 0 && (
        <Section title="Atrasadas" count={sections.atrasadas.length}>
          <List items={sections.atrasadas} overdue />
        </Section>
      )}
      {sections.hoje.length > 0 && (
        <Section title="Hoje" count={sections.hoje.length}>
          <List items={sections.hoje} />
        </Section>
      )}
      {upcomingCount > 0 && (
        <Section title="Próximas" count={upcomingCount}>
          <div className="flex flex-col gap-4">
            {sections.proximas.map((group) => (
              <div key={group.group} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted">{GROUP_LABEL[group.group]}</h3>
                <List items={group.items} />
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section title="Concluídas" count={sections.concluidas.length} collapsible>
        {sections.concluidas.length === 0 ? (
          <p className="text-md text-muted">Nada concluído nos últimos 30 dias.</p>
        ) : (
          <List items={sections.concluidas} />
        )}
      </Section>
    </PageShell>
  );
}
