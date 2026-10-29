import { Library, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Subject } from '@daily/shared';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SubjectDot } from '../../components/ui/SubjectDot';
import { deleteSubjectWithUndo } from '../../lib/data/actions';
import { useData } from '../../lib/data/app-store';
import { useUi, openSubjectForm } from '../../lib/ui-store';

function SubjectRow({ subject, eventCount }: { subject: Subject; eventCount: number }) {
  const onDelete = () => {
    if (eventCount === 0) deleteSubjectWithUndo(subject.id);
    else useUi.getState().open({ kind: 'subject-delete', subject });
  };
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border-hair bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <SubjectDot color={subject.color} />
        <span className="truncate text-md font-medium">{subject.name}</span>
        <span className="shrink-0 text-sm text-muted">
          {eventCount} {eventCount === 1 ? 'evento' : 'eventos'}
        </span>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="tile"
          size="sm"
          aria-label={`Editar ${subject.name}`}
          onClick={() => openSubjectForm(subject)}
        >
          <Pencil aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
        <Button variant="tile" size="sm" aria-label={`Excluir ${subject.name}`} onClick={onDelete}>
          <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
      </div>
    </li>
  );
}

export function SubjectsPage() {
  const subjects = useData((s) => s.subjects);
  const events = useData((s) => s.events);

  return (
    <PageShell
      title="Matérias"
      description="Organize seus estudos por matéria e escolha uma cor para cada uma."
      actions={
        <Button onClick={() => openSubjectForm()}>
          <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
          Nova matéria
        </Button>
      }
    >
      {subjects.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Nenhuma matéria ainda"
          description="Crie matérias para agrupar provas, tarefas e blocos de estudo."
        >
          <Button onClick={() => openSubjectForm()}>Criar matéria</Button>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {subjects.map((subject) => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              eventCount={events.filter((e) => e.subjectId === subject.id).length}
            />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
