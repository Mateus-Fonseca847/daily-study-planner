import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EVENT_TYPES, isExam, type EventType, type StudyEvent } from '@daily/shared';
import { useData } from '../../lib/data/app-store';
import { appNow } from '../../lib/fixture';
import { EVENT_FORM_LABEL, EVENT_STATUS_LABEL } from '../../lib/event-meta';
import {
  hasEndTime,
  initialEventValues,
  NEW_SUBJECT,
  suggestEnd,
  validateEventForm,
  type EventFormErrors,
  type EventFormValues,
} from '../../lib/forms/event-form';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { ContentsEditor } from './ContentsEditor';

interface EventFormModalProps {
  event?: StudyEvent | undefined;
  type?: EventType | undefined;
  date?: string | undefined;
  onClose: () => void;
}

const TYPE_OPTIONS = EVENT_TYPES.map((t) => ({ value: t, label: EVENT_FORM_LABEL[t] }));
const STATUS_OPTIONS = Object.entries(EVENT_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}));

export function EventFormModal({ event, type, date, onClose }: EventFormModalProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const subjects = useData((s) => s.subjects);
  const events = useData((s) => s.events);
  const [values, setValues] = useState<EventFormValues>(() =>
    initialEventValues({ event, type, date }, appNow()),
  );
  const [errors, setErrors] = useState<EventFormErrors>({});

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Sem matéria' },
      ...subjects.map((s) => ({ value: s.id, label: s.name })),
      { value: NEW_SUBJECT, label: '+ Nova matéria…' },
    ],
    [subjects],
  );
  const examOptions = useMemo(
    () => [
      { value: '', label: 'Nenhuma' },
      ...events.filter(isExam).map((e) => ({
        value: e.id,
        label: `${e.title} — ${format(parseISO(e.start), "d 'de' MMM", { locale: ptBR })}`,
      })),
    ],
    [events],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateEventForm(values, subjects, () => crypto.randomUUID());
    if (!result.ok) {
      setErrors(result.errors);
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    const store = useData.getState();
    let draft = result.draft;
    if (result.newSubject) {
      const created = store.createSubject(result.newSubject);
      draft = { ...draft, subjectId: created?.id ?? null };
    }
    if (event) store.updateEvent({ ...draft, id: event.id } as StudyEvent);
    else store.createEvent(draft);
    onClose();
  };

  const isTask = !hasEndTime(values.type);
  const title = event
    ? `Editar ${EVENT_FORM_LABEL[event.type].toLowerCase()}`
    : `Nova ${EVENT_FORM_LABEL[values.type].toLowerCase()}`;

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        id={formId}
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4 pb-2"
      >
        <SelectField
          label="Tipo"
          value={values.type}
          options={TYPE_OPTIONS}
          onChange={(e) => {
            const next = e.target.value as EventType;
            setValues((prev) => ({ ...prev, type: next }));
          }}
        />
        <TextField
          label="Título"
          data-autofocus
          value={values.title}
          error={errors.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <SelectField
          label="Matéria"
          value={values.subjectId}
          options={subjectOptions}
          onChange={(e) => set('subjectId', e.target.value)}
        />
        {values.subjectId === NEW_SUBJECT && (
          <TextField
            label="Nome da nova matéria"
            value={values.newSubjectName}
            error={errors.newSubjectName}
            onChange={(e) => set('newSubjectName', e.target.value)}
          />
        )}
        <div className={isTask ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3'}>
          <TextField
            label={isTask ? 'Data do prazo' : 'Data'}
            type="date"
            value={values.date}
            error={errors.date}
            onChange={(e) => set('date', e.target.value)}
          />
          <TextField
            label={isTask ? 'Horário do prazo' : 'Início'}
            type="time"
            value={values.startTime}
            error={errors.startTime}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                startTime: e.target.value,
                endTime:
                  hasEndTime(prev.type) && prev.endTime <= e.target.value
                    ? suggestEnd(e.target.value)
                    : prev.endTime,
              }))
            }
          />
          {!isTask && (
            <TextField
              label="Término"
              type="time"
              value={values.endTime}
              error={errors.endTime}
              onChange={(e) => set('endTime', e.target.value)}
            />
          )}
        </div>
        <SelectField
          label="Status"
          value={values.status}
          options={STATUS_OPTIONS}
          onChange={(e) => set('status', e.target.value as EventFormValues['status'])}
        />
        {values.type === 'estudo' && (
          <SelectField
            label="Vincular à prova (opcional)"
            value={values.examId}
            options={examOptions}
            onChange={(e) => set('examId', e.target.value)}
          />
        )}
        {values.type === 'prova' && (
          <ContentsEditor
            rows={values.contents}
            error={errors.contents}
            onChange={(rows) => set('contents', rows)}
          />
        )}
        <TextAreaField
          label="Notas"
          value={values.notes}
          error={errors.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </form>
    </Modal>
  );
}
