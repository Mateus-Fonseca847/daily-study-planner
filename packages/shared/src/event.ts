import { z } from 'zod';

export const EVENT_TYPES = ['prova', 'estudo', 'entrega', 'revisao', 'especial'] as const;
export const EVENT_STATUSES = ['pendente', 'em-andamento', 'concluido', 'cancelado'] as const;

export const eventTypeSchema = z.enum(EVENT_TYPES);
export const eventStatusSchema = z.enum(EVENT_STATUSES);

const id = z.string().min(1);
const localDateTime = z.iso.datetime({ local: true });

export const contentItemSchema = z.object({
  id,
  title: z.string().trim().min(1, 'Informe o conteúdo.').max(120, 'Use no máximo 120 caracteres.'),
  done: z.boolean(),
  /** Posição na lista (0, 1, 2…). */
  order: z.number().int().min(0),
});

/** Campos comuns a todo evento. */
const baseFields = {
  id,
  title: z.string().trim().min(1, 'Informe o título.').max(120, 'Use no máximo 120 caracteres.'),
  /** Início em ISO 8601 local (sem fuso). */
  start: localDateTime,
  /** Fim em ISO 8601 local; nunca antes do início. */
  end: localDateTime,
  subjectId: id.nullable(),
  status: eventStatusSchema,
  notes: z.string().max(2000, 'Use no máximo 2000 caracteres.').default(''),
};

/** Prova: evento com lista de conteúdos (mini tarefas). */
export const examSchema = z.object({
  ...baseFields,
  type: z.literal('prova'),
  contents: z.array(contentItemSchema).default([]),
});

/** Bloco de estudo: pode estar vinculado a uma prova. */
export const studyBlockSchema = z.object({
  ...baseFields,
  type: z.literal('estudo'),
  examId: id.nullable().default(null),
});

/** Tarefa/entrega: `end` é o prazo (pode ser igual a `start`). */
export const taskSchema = z.object({ ...baseFields, type: z.literal('entrega') });
export const reviewSchema = z.object({ ...baseFields, type: z.literal('revisao') });
export const specialEventSchema = z.object({ ...baseFields, type: z.literal('especial') });

export const studyEventSchema = z
  .discriminatedUnion('type', [
    examSchema,
    studyBlockSchema,
    taskSchema,
    reviewSchema,
    specialEventSchema,
  ])
  .refine((e) => e.end >= e.start, {
    message: 'O término não pode ser antes do início.',
    path: ['end'],
  });

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type ContentItem = z.infer<typeof contentItemSchema>;
export type Exam = z.infer<typeof examSchema>;
export type StudyBlock = z.infer<typeof studyBlockSchema>;
export type Task = z.infer<typeof taskSchema>;
export type StudyEvent = z.infer<typeof studyEventSchema>;

export const isExam = (event: StudyEvent): event is Exam => event.type === 'prova';
export const isStudyBlock = (event: StudyEvent): event is StudyBlock => event.type === 'estudo';
export const isTask = (event: StudyEvent): event is Task => event.type === 'entrega';

/** Pendente ou em andamento: ainda exige atenção. */
export const isOpen = (event: Pick<StudyEvent, 'status'>): boolean =>
  event.status === 'pendente' || event.status === 'em-andamento';
