import { useMemo, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ListChecks, Pencil, Trash2 } from 'lucide-react';
import { isTask, type Task } from '@daily/shared';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SubjectLabel } from '../../components/ui/SubjectLabel';
import { deleteEventWithUndo } from '../../lib/data/actions';
import { useData } from '../../lib/data/app-store';
import { filterTasks, type TaskFilter } from '../../lib/data/task-filters';
import { appNow } from '../../lib/fixture';
import { quickTaskDraft } from '../../lib/forms/quick-create';
import { openEventForm } from '../../lib/ui-store';

const FILTER_LABEL: Record<TaskFilter, string> = {
  hoje: 'Hoje',
  proximos: 'Próximos 7 dias',
  atrasadas: 'Atrasadas',
  concluidas: 'Concluídas',
};
const FILTERS = (Object.keys(FILTER_LABEL) as TaskFilter[]).map((value) => ({
  value,
  label: FILTER_LABEL[value],
}));

const EMPTY_TEXT: Record<TaskFilter, string> = {
  hoje: 'Nada para hoje. Digite uma tarefa acima e pressione Enter.',
  proximos: 'Nenhuma tarefa nos próximos 7 dias.',
  atrasadas: 'Nenhuma tarefa atrasada. Bom trabalho!',
  concluidas: 'Você ainda não concluiu nenhuma tarefa.',
};

function TaskRow({ task }: { task: Task }) {
  const subject = useData((s) => s.subjects.find((x) => x.id === task.subjectId));
  const setStatus = useData((s) => s.setEventStatus);
  const done = task.status === 'concluido';
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border-hair bg-surface px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Checkbox
          label={task.title}
          checked={done}
          onChange={(e) => setStatus(task.id, e.target.checked ? 'concluido' : 'pendente')}
        />
        <div className="flex items-center gap-3 pl-6 text-sm text-muted">
          <SubjectLabel subject={subject} />
          <span>{format(parseISO(task.end), "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="tile"
          size="sm"
          aria-label={`Editar ${task.title}`}
          onClick={() => openEventForm({ event: task })}
        >
          <Pencil aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
        <Button
          variant="tile"
          size="sm"
          aria-label={`Excluir ${task.title}`}
          onClick={() => deleteEventWithUndo(task.id)}
        >
          <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
      </div>
    </li>
  );
}

export function TasksPage() {
  const events = useData((s) => s.events);
  const createEvent = useData((s) => s.createEvent);
  const [filter, setFilter] = useState<TaskFilter>('hoje');
  const [title, setTitle] = useState('');
  const now = useMemo(() => appNow(), []);

  const tasks = useMemo(() => events.filter(isTask), [events]);
  const list = useMemo(() => filterTasks(tasks, filter, now), [tasks, filter, now]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    createEvent(quickTaskDraft(value, now));
    setTitle('');
    setFilter('hoje');
  };

  return (
    <PageShell
      title="Tarefas"
      description="Entregas e pendências, do que vence hoje ao que já passou."
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
      <SegmentedControl
        aria-label="Filtro de tarefas"
        options={FILTERS}
        value={filter}
        onChange={setFilter}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhuma tarefa aqui"
          description={EMPTY_TEXT[filter]}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
