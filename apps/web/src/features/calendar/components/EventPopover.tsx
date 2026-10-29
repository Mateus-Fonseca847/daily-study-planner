import { Ellipsis, Trash2, X } from 'lucide-react';
import { examProgress, type StudyEvent } from '@daily/shared';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Popover } from '../../../components/ui/Popover';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { EVENT_STATUS_LABEL, EVENT_TYPE_META } from '../../../lib/event-meta';
import { subjectName } from '../../../mocks/subjects';
import { eventLongDate, eventTimeRange } from '../lib/format';

interface EventPopoverProps {
  event: StudyEvent;
  anchor: HTMLElement;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleContent: (contentId: string, done: boolean) => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-popover-label shrink-0 text-sm text-muted">{label}</dt>
      <dd className="flex h-control-sm min-w-0 flex-1 items-center rounded-md bg-hover px-2 text-sm">
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

export function EventPopover({
  event,
  anchor,
  onClose,
  onDelete,
  onToggleContent,
}: EventPopoverProps) {
  const progress = examProgress(event.contents);

  return (
    <Popover anchor={anchor} onClose={onClose} aria-label={`Detalhes: ${event.title}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="icon"
            size="xs"
            aria-label="Excluir evento"
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
          >
            <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          </Button>
          <Button variant="icon" size="xs" aria-label="Mais opções">
            <Ellipsis aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          </Button>
        </div>
        <Button variant="icon" size="xs" aria-label="Fechar" onClick={onClose}>
          <X aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
      </div>

      <h2 className="text-lg font-semibold tracking-tight">{event.title}</h2>
      <p className="mt-1 text-base text-muted">{eventLongDate(event)}</p>
      <p className="text-base text-muted">{eventTimeRange(event)}</p>

      <dl className="mt-4 flex flex-col gap-2">
        <Field label="Matéria" value={subjectName(event.subjectId)} />
        <Field label="Tipo" value={EVENT_TYPE_META[event.type].label} />
        <Field label="Status" value={EVENT_STATUS_LABEL[event.status]} />
      </dl>

      {event.type === 'prova' && event.contents.length > 0 && (
        <section aria-label="Conteúdos da prova" className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <h3 className="font-medium">Conteúdos</h3>
            <span className="text-muted">
              {progress.done}/{progress.total}
            </span>
          </div>
          <ProgressBar value={progress.ratio} aria-label="Progresso dos conteúdos" />
          <ul className="mt-1 flex flex-col gap-2">
            {event.contents.map((content) => (
              <li key={content.id}>
                <Checkbox
                  label={content.title}
                  checked={content.done}
                  onChange={(e) => onToggleContent(content.id, e.target.checked)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Popover>
  );
}
