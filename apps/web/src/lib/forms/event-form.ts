import { addMinutes, format, isValid, parseISO } from 'date-fns';
import {
  DEFAULT_EVENT_TYPE,
  EVENT_TYPES,
  SUBJECT_COLORS,
  studyEventSchema,
  type EventStatus,
  type EventType,
  type StudyEvent,
  type Subject,
  type Recurrence,
  type Subtask,
} from '@daily/shared';
import { validateRule } from '../recurrence/presets';
import { z } from 'zod';
import type { Draft } from '../data/repository';

/** Valor do select de matéria que significa “criar uma nova”. */
export const NEW_SUBJECT = '__new__';

export interface SubtaskRow {
  id: string;
  title: string;
  done: boolean;
}

export interface EventFormValues {
  type: EventType;
  title: string;
  /** Id da matéria, `''` (sem matéria) ou `NEW_SUBJECT`. */
  subjectId: string;
  newSubjectName: string;
  /** Data do prazo/início (`yyyy-MM-dd`). */
  date: string;
  /** Hora do prazo/início (`HH:mm`). */
  startTime: string;
  /** Término (`HH:mm`) no mesmo dia; `''` = sem término (compromisso pontual). */
  endTime: string;
  status: EventStatus;
  notes: string;
  subtasks: SubtaskRow[];
  /** Repetição (só Tarefa e Especial); `null` = não repete. */
  recurrence: Recurrence | null;
}

export type EventFormField = keyof EventFormValues;
export type EventFormErrors = Partial<Record<EventFormField, string>>;

export type EventFormResult =
  | { ok: true; draft: Draft<StudyEvent>; newSubject: Draft<Subject> | null }
  | { ok: false; errors: EventFormErrors };

/** Hora padrão do prazo quando a criação não vem de um horário da grade. */
const DEFAULT_TIME: Record<EventType, string> = {
  tarefa: '23:59',
  prova: '08:00',
  especial: '09:00',
};

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export const sortedSubtasks = (subtasks: readonly Subtask[]): Subtask[] =>
  [...subtasks].sort((a, b) => a.order - b.order);

export function initialEventValues(
  init: { event?: StudyEvent; type?: EventType; date?: string; time?: string },
  today: Date,
): EventFormValues {
  const { event } = init;
  if (event) {
    const start = event.start.slice(11, 16);
    const end = event.end.slice(11, 16);
    return {
      type: event.type,
      title: event.title,
      subjectId: event.subjectId ?? '',
      newSubjectName: '',
      date: event.start.slice(0, 10),
      startTime: start,
      endTime: event.end === event.start ? '' : end,
      status: event.status,
      notes: event.notes,
      subtasks: sortedSubtasks(event.subtasks).map(({ id, title, done }) => ({ id, title, done })),
      recurrence: event.recurrence ?? null,
    };
  }
  const type = init.type ?? DEFAULT_EVENT_TYPE;
  return {
    type,
    title: '',
    subjectId: '',
    newSubjectName: '',
    date: init.date ?? format(today, 'yyyy-MM-dd'),
    startTime: init.time ?? DEFAULT_TIME[type],
    // Criar a partir de um horário da grade: dura 1 h, para aparecer como um bloco.
    endTime: init.time !== undefined ? suggestEnd(init.time) : '',
    status: 'pendente',
    notes: '',
    subtasks: [],
    recurrence: null,
  };
}

const formSchema = z
  .object({
    type: z.enum(EVENT_TYPES),
    title: z.string().trim().min(1, 'Informe o título.').max(120, 'Use no máximo 120 caracteres.'),
    subjectId: z.string(),
    newSubjectName: z.string().trim().max(60, 'Use no máximo 60 caracteres.'),
    date: z
      .string()
      .refine(
        (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && isValid(parseISO(v)),
        'Informe uma data válida.',
      ),
    startTime: z.string().regex(timeRe, 'Informe um horário válido.'),
    endTime: z.string().refine((v) => v === '' || timeRe.test(v), 'Informe um horário válido.'),
    notes: z.string().max(2000, 'Use no máximo 2000 caracteres.'),
  })
  .superRefine((v, ctx) => {
    if (v.subjectId === NEW_SUBJECT && v.newSubjectName === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['newSubjectName'],
        message: 'Informe o nome da matéria.',
      });
    }
    if (v.endTime !== '' && timeRe.test(v.startTime) && v.endTime < v.startTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'O término não pode ser antes do início.',
      });
    }
  });

/** Valida o formulário (mensagens em pt-BR) e monta o rascunho do compromisso. */
export function validateEventForm(
  values: EventFormValues,
  subjects: readonly Subject[],
  newId: () => string,
  createdAt: string,
): EventFormResult {
  const parsed = formSchema.safeParse(values);
  const errors: EventFormErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as EventFormField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }
  const rows = values.subtasks.filter((c) => c.title.trim() !== '');
  if (values.recurrence) {
    const problem =
      values.type === 'prova'
        ? 'Prova não se repete.'
        : validateRule(values.recurrence, values.date);
    if (problem) errors.recurrence = problem;
  }
  if (rows.some((c) => c.title.trim().length > 120)) {
    errors.subtasks = 'Cada item pode ter no máximo 120 caracteres.';
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };

  const v = parsed.data;
  const newSubject =
    v.subjectId === NEW_SUBJECT
      ? {
          name: v.newSubjectName,
          color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length] ?? 'ciano',
        }
      : null;
  const subtasks: Subtask[] = rows.map((row, order) => ({
    id: row.id || newId(),
    title: row.title.trim(),
    done: row.done,
    order,
  }));
  const draft: Draft<StudyEvent> = {
    type: v.type,
    title: v.title,
    status: values.status,
    // Substituído pelo id da matéria recém-criada quando `newSubject` existe.
    subjectId: v.subjectId === '' || v.subjectId === NEW_SUBJECT ? null : v.subjectId,
    start: `${v.date}T${v.startTime}:00`,
    end: `${v.date}T${v.endTime === '' ? v.startTime : v.endTime}:00`,
    notes: v.notes,
    subtasks,
    createdAt,
    ...(values.recurrence && v.type !== 'prova' ? { recurrence: values.recurrence } : {}),
  };

  // Rede de segurança: o schema do domínio é a palavra final.
  const check = studyEventSchema.safeParse({ ...draft, id: 'draft' });
  if (!check.success) {
    return { ok: false, errors: { title: check.error.issues[0]?.message ?? 'Dados inválidos.' } };
  }
  return { ok: true, draft, newSubject };
}

/** Término sugerido (1 h depois) ao criar pela grade ou ao mudar o início. */
export function suggestEnd(startTime: string): string {
  const parsed = parseISO(`2000-01-01T${startTime}:00`);
  if (!isValid(parsed)) return startTime;
  const end = addMinutes(parsed, 60);
  return end.getDate() === parsed.getDate() ? format(end, 'HH:mm') : '23:59';
}
