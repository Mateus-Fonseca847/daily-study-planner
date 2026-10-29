import { addMinutes, format, isValid, parseISO } from 'date-fns';
import {
  EVENT_TYPES,
  SUBJECT_COLORS,
  studyEventSchema,
  type ContentItem,
  type EventStatus,
  type EventType,
  type StudyEvent,
  type Subject,
} from '@daily/shared';
import { z } from 'zod';
import type { Draft } from '../data/repository';

/** Valor do select de matéria que significa “criar uma nova”. */
export const NEW_SUBJECT = '__new__';

export interface ContentRow {
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
  date: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  notes: string;
  /** Prova a que um bloco de estudo está vinculado (`''` = nenhuma). */
  examId: string;
  contents: ContentRow[];
}

export type EventFormField = keyof EventFormValues | 'contents';
export type EventFormErrors = Partial<Record<EventFormField, string>>;

export type EventFormResult =
  | { ok: true; draft: Draft<StudyEvent>; newSubject: Draft<Subject> | null }
  | { ok: false; errors: EventFormErrors };

const DEFAULT_TIMES: Record<EventType, [string, string]> = {
  prova: ['08:00', '10:00'],
  estudo: ['14:00', '15:00'],
  entrega: ['23:59', '23:59'],
  revisao: ['19:00', '19:30'],
  especial: ['09:00', '10:00'],
};

export const hasEndTime = (type: EventType): boolean => type !== 'entrega';

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export function initialEventValues(
  init: { event?: StudyEvent; type?: EventType; date?: string },
  today: Date,
): EventFormValues {
  const { event } = init;
  if (event) {
    return {
      type: event.type,
      title: event.title,
      subjectId: event.subjectId ?? '',
      newSubjectName: '',
      date: event.start.slice(0, 10),
      startTime: event.start.slice(11, 16),
      endTime: event.end.slice(11, 16),
      status: event.status,
      notes: event.notes,
      examId: event.type === 'estudo' ? (event.examId ?? '') : '',
      contents:
        event.type === 'prova'
          ? [...event.contents]
              .sort((a, b) => a.order - b.order)
              .map(({ id, title, done }) => ({ id, title, done }))
          : [],
    };
  }
  const type = init.type ?? 'prova';
  const [startTime, endTime] = DEFAULT_TIMES[type];
  return {
    type,
    title: '',
    subjectId: '',
    newSubjectName: '',
    date: init.date ?? format(today, 'yyyy-MM-dd'),
    startTime,
    endTime,
    status: 'pendente',
    notes: '',
    examId: '',
    contents: [],
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
    endTime: z.string().regex(timeRe, 'Informe um horário válido.'),
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
    if (
      hasEndTime(v.type) &&
      timeRe.test(v.startTime) &&
      timeRe.test(v.endTime) &&
      v.endTime <= v.startTime
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'O término deve ser depois do início.',
      });
    }
  });

/** Valida o formulário (mensagens em pt-BR) e monta o rascunho do evento. */
export function validateEventForm(
  values: EventFormValues,
  subjects: readonly Subject[],
  newId: () => string,
): EventFormResult {
  const parsed = formSchema.safeParse(values);
  const errors: EventFormErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as EventFormField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }
  const rows = values.contents.filter((c) => c.title.trim() !== '');
  if (values.type === 'prova' && rows.some((c) => c.title.trim().length > 120)) {
    errors.contents = 'Cada conteúdo pode ter no máximo 120 caracteres.';
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };

  const v = parsed.data;
  const endTime = hasEndTime(v.type) ? v.endTime : v.startTime;
  const newSubject =
    v.subjectId === NEW_SUBJECT
      ? {
          name: v.newSubjectName,
          color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length] ?? 'azul',
        }
      : null;
  const base = {
    title: v.title,
    status: values.status,
    // Substituído pelo id da matéria recém-criada quando `newSubject` existe.
    subjectId: v.subjectId === '' || v.subjectId === NEW_SUBJECT ? null : v.subjectId,
    start: `${v.date}T${v.startTime}:00`,
    end: `${v.date}T${endTime}:00`,
    notes: v.notes,
  };
  const contents: ContentItem[] = rows.map((row, order) => ({
    id: row.id || newId(),
    title: row.title.trim(),
    done: row.done,
    order,
  }));
  const candidate =
    v.type === 'prova'
      ? { ...base, type: 'prova' as const, contents }
      : v.type === 'estudo'
        ? { ...base, type: 'estudo' as const, examId: values.examId === '' ? null : values.examId }
        : { ...base, type: v.type };

  // Rede de segurança: o schema do domínio é a palavra final.
  const check = studyEventSchema.safeParse({ ...candidate, id: 'draft' });
  if (!check.success) {
    return { ok: false, errors: { title: check.error.issues[0]?.message ?? 'Dados inválidos.' } };
  }
  return { ok: true, draft: candidate as Draft<StudyEvent>, newSubject };
}

/** Término sugerido (1 h depois) ao mudar o início num formulário com horário final. */
export function suggestEnd(startTime: string): string {
  const parsed = parseISO(`2000-01-01T${startTime}:00`);
  if (!isValid(parsed)) return startTime;
  const end = addMinutes(parsed, 60);
  return end.getDate() === parsed.getDate() ? format(end, 'HH:mm') : '23:59';
}
