import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart3,
  CalendarClock,
  CircleDot,
  Clock3,
  Copy,
  Library,
  MoreHorizontal,
  NotebookPen,
  RotateCcw,
  Shapes,
  Trash2,
  XCircle,
} from 'lucide-react';
import { EVENT_TYPES, subtaskListLabel, subtaskProgress, type EventType } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { MetaRow, MoreOptionsToggle } from '../../components/ui/MetaRow';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { cn } from '../../lib/cn';
import {
  cancelEventWithUndo,
  deleteEventWithUndo,
  duplicateEventWithToast,
} from '../../lib/data/actions';
import { useData } from '../../lib/data/app-store';
import { moveSubtask } from '../../lib/data/subtasks';
import { toLocalIso } from '../../lib/dates';
import { EVENT_TYPE_META } from '../../lib/event-meta';
import { appNow } from '../../lib/fixture';
import {
  initialEventValues,
  NEW_SUBJECT,
  sortedSubtasks,
  suggestEnd,
  validateEventForm,
  type EventFormErrors,
  type EventFormValues,
} from '../../lib/forms/event-form';
import { CompleteButton } from './CompleteButton';
import { StatusControl } from './StatusControl';
import { SubtaskList } from './SubtaskList';

interface TaskPanelProps {
  /** Compromisso existente (ver/editar). Sem ele, o painel cria. */
  eventId?: string | undefined;
  type?: EventType | undefined;
  date?: string | undefined;
  time?: string | undefined;
  onClose: () => void;
}

const TYPE_OPTIONS = EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_META[t].label }));

const INPUT =
  'h-field min-w-0 rounded-md bg-hover px-2 text-base text-fg placeholder:text-muted aria-invalid:outline-1 aria-invalid:outline-danger';

const FieldError = ({ message }: { message: string | undefined }) =>
  message ? <p className="w-full text-sm text-danger">{message}</p> : null;

/**
 * Painel de tarefa: um só componente para criar, ver e editar Tarefa, Prova e Especial. No desktop
 * é um painel à direita; no celular, tela cheia. Criar mostra o essencial e guarda o resto em
 * “Mais opções”; ver/editar aplica cada mudança direto (sem botão Salvar).
 */
export function TaskPanel({ eventId, type, date, time, onClose }: TaskPanelProps) {
  const ids = {
    form: useId(),
    title: useId(),
    date: useId(),
    time: useId(),
    end: useId(),
    subject: useId(),
    newSubject: useId(),
    notes: useId(),
    more: useId(),
  };
  const formRef = useRef<HTMLFormElement>(null);
  const subjects = useData((s) => s.subjects);
  const event = useData((s) => (eventId ? s.events.find((e) => e.id === eventId) : undefined));
  const editing = eventId !== undefined;

  const [values, setValues] = useState<EventFormValues>(() =>
    initialEventValues({ event, type, date, time }, appNow()),
  );
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [moreOpen, setMoreOpen] = useState(false);

  // Excluído (por outra aba, pelo menu ou pelo “Desfazer” de uma criação): fecha.
  useEffect(() => {
    if (editing && !event) onClose();
  }, [editing, event, onClose]);

  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Sem matéria' },
      ...subjects.map((s) => ({ value: s.id, label: s.name })),
      { value: NEW_SUBJECT, label: '+ Nova matéria…' },
    ],
    [subjects],
  );

  /** Valida e grava. Na edição, preserva as subtarefas vivas e a data de criação. */
  const save = (next: EventFormValues): boolean => {
    const createdAt = event?.createdAt ?? toLocalIso(appNow());
    const result = validateEventForm(next, subjects, () => crypto.randomUUID(), createdAt);
    if (!result.ok) {
      setErrors(result.errors);
      return false;
    }
    setErrors({});
    const store = useData.getState();
    let draft = result.draft;
    if (result.newSubject) {
      const created = store.createSubject(result.newSubject);
      draft = { ...draft, subjectId: created?.id ?? null };
      setValues((prev) => ({ ...prev, subjectId: created?.id ?? '', newSubjectName: '' }));
    }
    // Na edição, status e subtarefas vêm do compromisso vivo (mudam por ações próprias).
    if (event) {
      store.updateEvent({ ...draft, status: event.status, subtasks: event.subtasks, id: event.id });
    } else store.createEvent(draft);
    return true;
  };

  /** Muda um campo; na edição, grava na hora (campos de texto gravam ao sair, via `commit`). */
  const change = <K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
    persist = editing,
  ) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (persist) save(next);
  };
  const commit = () => {
    if (editing) save(values);
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (save(values)) onClose();
    else
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
  };

  const label = subtaskListLabel(values.type);
  const liveSubtasks = event ? sortedSubtasks(event.subtasks) : values.subtasks;
  const progress = subtaskProgress(liveSubtasks);
  const typeName = EVENT_TYPE_META[values.type].label.toLowerCase();
  const title = editing ? (event?.title ?? 'Tarefa') : `Nova ${typeName}`;

  const store = useData.getState;
  const subtaskHandlers = event
    ? {
        onAdd: (t: string) => store().addSubtask(event.id, t),
        onToggle: (id: string) => store().toggleSubtask(event.id, id),
        onRename: (id: string, t: string) => store().renameSubtask(event.id, id, t),
        onDelete: (id: string) => store().deleteSubtask(event.id, id),
        onMove: (id: string, d: 'up' | 'down') => store().moveSubtask(event.id, id, d),
      }
    : {
        onAdd: (t: string) =>
          change('subtasks', [
            ...values.subtasks,
            { id: crypto.randomUUID(), title: t, done: false },
          ]),
        onToggle: (id: string) =>
          change(
            'subtasks',
            values.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
          ),
        onRename: (id: string, t: string) =>
          change(
            'subtasks',
            values.subtasks.map((s) => (s.id === id ? { ...s, title: t } : s)),
          ),
        onDelete: (id: string) =>
          change(
            'subtasks',
            values.subtasks.filter((s) => s.id !== id),
          ),
        onMove: (id: string, d: 'up' | 'down') =>
          change(
            'subtasks',
            moveSubtask(
              values.subtasks.map((s, order) => ({ ...s, order })),
              id,
              d,
            ).map(({ id: sid, title: st, done }) => ({ id: sid, title: st, done })),
          ),
      };

  const menuItems: MenuItem[] = event
    ? [
        {
          label: 'Duplicar',
          icon: Copy,
          onSelect: () => duplicateEventWithToast(event.id),
        },
        event.status === 'cancelado'
          ? {
              label: 'Reabrir',
              icon: RotateCcw,
              onSelect: () => useData.getState().setEventStatus(event.id, 'pendente'),
            }
          : {
              label: 'Cancelar',
              icon: XCircle,
              onSelect: () => cancelEventWithUndo(event.id),
            },
        {
          label: 'Excluir',
          icon: Trash2,
          onSelect: () => {
            onClose();
            deleteEventWithUndo(event.id);
          },
        },
      ]
    : [];

  return (
    <Modal
      title={title}
      onClose={onClose}
      variant="side"
      hideTitle={editing}
      headerActions={
        event && (
          <>
            <CompleteButton event={event} />
            <Menu
              label={`Ações de ${event.title}`}
              align="end"
              items={menuItems}
              trigger={(props) => (
                <button
                  type="button"
                  aria-label={`Ações de ${event.title}`}
                  className="inline-flex size-control-sm items-center justify-center rounded-full bg-surface text-soft hover:text-fg coarse:size-touch"
                  {...props}
                >
                  <MoreHorizontal aria-hidden strokeWidth={1.5} className="size-icon" />
                </button>
              )}
            />
          </>
        )
      }
      footer={
        !editing && (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form={ids.form}>
              {`Criar ${typeName}`}
            </Button>
          </>
        )
      }
    >
      <form
        id={ids.form}
        ref={formRef}
        noValidate
        onSubmit={onCreate}
        className="flex flex-col gap-4 pb-2"
      >
        <div>
          <label htmlFor={ids.title} className="sr-only">
            Título
          </label>
          <input
            id={ids.title}
            data-autofocus={editing ? undefined : true}
            placeholder="Título"
            value={values.title}
            maxLength={120}
            aria-invalid={errors.title ? true : undefined}
            onChange={(e) => change('title', e.target.value, false)}
            onBlur={commit}
            className={cn(
              'w-full rounded-md bg-transparent px-1 py-1 text-display font-semibold tracking-tight text-fg placeholder:text-subtle',
              event?.status === 'concluido' && 'line-through',
              event?.status === 'cancelado' && 'line-through opacity-60',
            )}
          />
          <FieldError message={errors.title} />
        </div>

        <div className="flex flex-col gap-3">
          <MetaRow icon={Shapes} label="Tipo">
            <SegmentedControl
              aria-label="Tipo"
              compact
              options={TYPE_OPTIONS}
              value={values.type}
              onChange={(next) => change('type', next)}
            />
          </MetaRow>

          {event && (
            <MetaRow icon={CircleDot} label="Status">
              <StatusControl
                value={event.status}
                onChange={(s) => useData.getState().setEventStatus(event.id, s)}
              />
            </MetaRow>
          )}

          {event && (
            <MetaRow icon={Clock3} label="Criada em">
              <span className="text-base text-soft">
                {format(parseISO(event.createdAt), "d 'de' MMM 'de' yyyy, HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </MetaRow>
          )}

          <MetaRow icon={CalendarClock} label="Prazo" htmlFor={ids.date}>
            <input
              id={ids.date}
              type="date"
              aria-label="Data do prazo"
              value={values.date}
              aria-invalid={errors.date ? true : undefined}
              onChange={(e) => change('date', e.target.value)}
              className={INPUT}
            />
            <input
              id={ids.time}
              type="time"
              aria-label="Hora do prazo"
              value={values.startTime}
              aria-invalid={errors.startTime ? true : undefined}
              onChange={(e) => {
                const start = e.target.value;
                const end =
                  values.endTime !== '' && values.endTime < start
                    ? suggestEnd(start)
                    : values.endTime;
                const next = { ...values, startTime: start, endTime: end };
                setValues(next);
                if (editing) save(next);
              }}
              className={INPUT}
            />
            <FieldError message={errors.date ?? errors.startTime} />
          </MetaRow>

          {liveSubtasks.length > 0 && (
            <MetaRow icon={BarChart3} label="Progresso">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ProgressBar value={progress.ratio} aria-label={`Progresso de ${label}`} />
                <span className="shrink-0 text-sm font-medium text-soft tabular-nums">
                  {Math.round(progress.ratio * 100)}%
                </span>
              </div>
            </MetaRow>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="flex items-baseline justify-between text-md font-semibold">
            {label}
            {liveSubtasks.length > 0 && (
              <span className="text-sm font-normal text-muted">
                {progress.done} de {progress.total}
              </span>
            )}
          </h3>
          <SubtaskList
            label={label}
            items={liveSubtasks}
            error={errors.subtasks}
            {...subtaskHandlers}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={ids.notes} className="flex items-center gap-2 text-md font-semibold">
            <NotebookPen aria-hidden strokeWidth={1.5} className="size-icon-sm text-muted" />
            Descrição
          </label>
          <textarea
            id={ids.notes}
            value={values.notes}
            maxLength={2000}
            rows={4}
            placeholder="Notas, links, o que for preciso lembrar"
            onChange={(e) => change('notes', e.target.value, false)}
            onBlur={commit}
            className="w-full resize-y rounded-card-sm border-hair bg-surface p-3 text-base text-fg placeholder:text-muted"
          />
        </div>

        <div className="flex flex-col gap-3">
          <MoreOptionsToggle
            open={moreOpen}
            controls={ids.more}
            onToggle={() => setMoreOpen((open) => !open)}
          />
          {moreOpen && (
            <div id={ids.more} className="flex flex-col gap-3">
              <MetaRow icon={Library} label="Matéria" htmlFor={ids.subject}>
                <select
                  id={ids.subject}
                  value={values.subjectId}
                  onChange={(e) =>
                    change('subjectId', e.target.value, e.target.value !== NEW_SUBJECT && editing)
                  }
                  className={cn(INPUT, 'flex-1')}
                >
                  {subjectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {values.subjectId === NEW_SUBJECT && (
                  <>
                    <input
                      id={ids.newSubject}
                      aria-label="Nome da nova matéria"
                      placeholder="Nome da matéria"
                      value={values.newSubjectName}
                      maxLength={60}
                      aria-invalid={errors.newSubjectName ? true : undefined}
                      onChange={(e) => change('newSubjectName', e.target.value, false)}
                      onBlur={commit}
                      className={cn(INPUT, 'flex-1')}
                    />
                    <FieldError message={errors.newSubjectName} />
                  </>
                )}
              </MetaRow>
              <MetaRow icon={Clock3} label="Término" htmlFor={ids.end}>
                <input
                  id={ids.end}
                  type="time"
                  value={values.endTime}
                  aria-invalid={errors.endTime ? true : undefined}
                  onChange={(e) => change('endTime', e.target.value)}
                  className={INPUT}
                />
                {values.endTime !== '' && (
                  <Button variant="secondary" onClick={() => change('endTime', '')}>
                    Sem término
                  </Button>
                )}
                <FieldError message={errors.endTime} />
              </MetaRow>
              {!editing && (
                <MetaRow icon={CircleDot} label="Status">
                  <StatusControl value={values.status} onChange={(s) => change('status', s)} />
                </MetaRow>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
