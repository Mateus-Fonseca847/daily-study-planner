import { useId, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { SUBJECT_COLORS, subjectSchema, type Subject, type SubjectColor } from '@daily/shared';
import { useData } from '../../lib/data/app-store';
import { deleteSubjectWithUndo } from '../../lib/data/actions';
import { eventsOfSubject, type SubjectDeletion } from '../../lib/data/rules';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { SUBJECT_COLOR_CLASS } from '../ui/SubjectDot';

export function SubjectFormModal({
  subject,
  onClose,
}: {
  subject?: Subject | undefined;
  onClose: () => void;
}) {
  const formId = useId();
  const count = useData((s) => s.subjects.length);
  const [name, setName] = useState(subject?.name ?? '');
  const [color, setColor] = useState<SubjectColor>(
    subject?.color ?? SUBJECT_COLORS[count % SUBJECT_COLORS.length] ?? 'azul',
  );
  const [error, setError] = useState<string | undefined>();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = subjectSchema.safeParse({ id: subject?.id ?? 'draft', name, color });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nome inválido.');
      return;
    }
    const store = useData.getState();
    if (subject) store.updateSubject({ ...subject, name: parsed.data.name, color });
    else store.createSubject({ name: parsed.data.name, color });
    onClose();
  };

  return (
    <Modal
      title={subject ? 'Editar matéria' : 'Nova matéria'}
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
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4 pb-2">
        <TextField
          label="Nome"
          data-autofocus
          value={name}
          error={error}
          onChange={(e) => setName(e.target.value)}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium text-soft">Cor</legend>
          <div role="radiogroup" aria-label="Cor da matéria" className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  'inline-flex size-swatch items-center justify-center rounded-full',
                  SUBJECT_COLOR_CLASS[c],
                )}
              >
                {c === color && (
                  <Check aria-hidden strokeWidth={3} className="size-icon-sm text-accent-fg" />
                )}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

type Choice = 'delete' | 'move';

/** Exclusão de matéria: com eventos associados, é preciso escolher o destino deles. */
export function SubjectDeleteModal({
  subject,
  onClose,
}: {
  subject: Subject;
  onClose: () => void;
}) {
  const subjects = useData((s) => s.subjects);
  const events = useData((s) => s.events);
  const owned = eventsOfSubject({ events }, subject.id);
  const others = subjects.filter((s) => s.id !== subject.id);
  const [choice, setChoice] = useState<Choice>(others.length > 0 ? 'move' : 'delete');
  const [target, setTarget] = useState(others[0]?.id ?? '');

  const confirm = () => {
    const resolution: SubjectDeletion | undefined =
      owned.length === 0
        ? undefined
        : choice === 'delete'
          ? { kind: 'delete-events' }
          : { kind: 'move-events', toSubjectId: target };
    deleteSubjectWithUndo(subject.id, resolution);
    onClose();
  };

  return (
    <Modal
      title={`Excluir “${subject.name}”`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm}>Excluir matéria</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2 text-md">
        <p className="text-soft">
          Esta matéria tem {owned.length}{' '}
          {owned.length === 1 ? 'evento associado' : 'eventos associados'}. O que fazer com{' '}
          {owned.length === 1 ? 'ele' : 'eles'}?
        </p>
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Destino dos eventos</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="destino"
              checked={choice === 'move'}
              disabled={others.length === 0}
              onChange={() => setChoice('move')}
            />
            Mover para outra matéria
          </label>
          {choice === 'move' && others.length > 0 && (
            <SelectField
              label="Matéria de destino"
              value={target}
              options={others.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(e) => setTarget(e.target.value)}
            />
          )}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="destino"
              checked={choice === 'delete'}
              onChange={() => setChoice('delete')}
            />
            Apagar os eventos
          </label>
        </fieldset>
      </div>
    </Modal>
  );
}
