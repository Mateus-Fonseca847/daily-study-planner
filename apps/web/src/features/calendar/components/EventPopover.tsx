import { useState, type FormEvent } from 'react';
import { Copy, Ellipsis, Pencil, Plus, Trash2, X } from 'lucide-react';
import { examProgress, type StudyEvent } from '@daily/shared';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Menu } from '../../../components/ui/Menu';
import { Popover } from '../../../components/ui/Popover';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { deleteEventWithUndo, duplicateEventWithToast } from '../../../lib/data/actions';
import { useData } from '../../../lib/data/app-store';
import { EVENT_STATUS_LABEL, EVENT_TYPE_META } from '../../../lib/event-meta';
import { openEventForm } from '../../../lib/ui-store';
import { eventLongDate, eventTimeRange } from '../lib/format';

interface EventPopoverProps {
  event: StudyEvent;
  anchor: HTMLElement;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-popover-label shrink-0 text-base text-muted">{label}</dt>
      <dd className="flex h-field min-w-0 flex-1 items-center rounded-md bg-hover px-2 text-base font-medium">
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

/** Adiciona um conteúdo no fim da lista (input inline + Enter). */
function AddContent({ eventId }: { eventId: string }) {
  const [title, setTitle] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    useData.getState().addContent(eventId, value);
    setTitle('');
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        aria-label="Novo conteúdo"
        placeholder="Adicionar conteúdo"
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        className="h-field min-w-0 flex-1 rounded-md bg-hover px-2 text-base text-fg placeholder:text-muted"
      />
      <Button type="submit" variant="tile" size="xs" aria-label="Adicionar conteúdo">
        <Plus aria-hidden strokeWidth={1.5} className="size-icon-sm" />
      </Button>
    </form>
  );
}

export function EventPopover({ event, anchor, onClose }: EventPopoverProps) {
  const subjects = useData((s) => s.subjects);
  const toggleContent = useData((s) => s.toggleContent);
  const subject = subjects.find((s) => s.id === event.subjectId);
  const contents =
    event.type === 'prova' ? [...event.contents].sort((a, b) => a.order - b.order) : [];
  const progress = examProgress(contents);

  return (
    <Popover anchor={anchor} onClose={onClose} aria-label={`Detalhes: ${event.title}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="tile"
            size="xs"
            aria-label="Excluir evento"
            onClick={() => {
              deleteEventWithUndo(event.id);
              onClose();
            }}
          >
            <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          </Button>
          <Menu
            label="Mais opções"
            items={[
              {
                label: 'Editar',
                icon: Pencil,
                onSelect: () => {
                  onClose();
                  openEventForm({ event });
                },
              },
              {
                label: 'Duplicar',
                icon: Copy,
                onSelect: () => {
                  duplicateEventWithToast(event.id);
                  onClose();
                },
              },
            ]}
            trigger={(props) => (
              <Button variant="tile" size="xs" aria-label="Mais opções" {...props}>
                <Ellipsis aria-hidden strokeWidth={1.5} className="size-icon-sm" />
              </Button>
            )}
          />
        </div>
        <Button variant="tile" size="xs" aria-label="Fechar" onClick={onClose}>
          <X aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
      </div>

      <h2 className="text-title font-semibold tracking-tight">{event.title}</h2>
      <p className="mt-1 text-md text-muted">{eventLongDate(event)}</p>
      <p className="text-md text-muted">{eventTimeRange(event)}</p>

      <dl className="mt-4 flex flex-col gap-1">
        <Field label="Matéria" value={subject?.name ?? 'Sem matéria'} />
        <Field label="Tipo" value={EVENT_TYPE_META[event.type].label} />
        <Field label="Status" value={EVENT_STATUS_LABEL[event.status]} />
      </dl>

      {event.type === 'prova' && (
        <section aria-label="Conteúdos da prova" className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <h3 className="font-medium">Conteúdos</h3>
            <span className="text-muted">
              {progress.done}/{progress.total}
            </span>
          </div>
          <ProgressBar value={progress.ratio} aria-label="Progresso dos conteúdos" />
          <ul className="mt-1 flex flex-col gap-2">
            {contents.map((content) => (
              <li key={content.id}>
                <Checkbox
                  label={content.title}
                  checked={content.done}
                  onChange={() => toggleContent(event.id, content.id)}
                />
              </li>
            ))}
          </ul>
          <AddContent eventId={event.id} />
        </section>
      )}
    </Popover>
  );
}
