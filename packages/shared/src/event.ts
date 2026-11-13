import { z } from 'zod';

/** Tipos de compromisso (v4). A Tarefa é o padrão. */
export const EVENT_TYPES = ['tarefa', 'prova', 'especial'] as const;
/** Status (v4): cada um tem cor, ícone e texto reservados. */
export const EVENT_STATUSES = ['pendente', 'concluido', 'cancelado'] as const;

export const DEFAULT_EVENT_TYPE = 'tarefa' as const;

export const eventTypeSchema = z.enum(EVENT_TYPES);
export const eventStatusSchema = z.enum(EVENT_STATUSES);

const id = z.string().min(1);
const localDateTime = z.iso.datetime({ local: true });

/** Subtarefa (numa prova a UI chama a lista de “Conteúdos”; o modelo é um só). */
export const subtaskSchema = z.object({
  id,
  title: z.string().trim().min(1, 'Informe a subtarefa.').max(120, 'Use no máximo 120 caracteres.'),
  done: z.boolean(),
  /** Posição na lista (0, 1, 2…). */
  order: z.number().int().min(0),
});

/** Compromisso do calendário: Tarefa, Prova ou Especial. */
export const studyEventSchema = z
  .object({
    id,
    type: eventTypeSchema,
    title: z.string().trim().min(1, 'Informe o título.').max(120, 'Use no máximo 120 caracteres.'),
    /** Início/prazo em ISO 8601 local (sem fuso). */
    start: localDateTime,
    /** Término em ISO 8601 local; nunca antes do início (igual ao início = pontual). */
    end: localDateTime,
    /** Matéria opcional. */
    subjectId: id.nullable().default(null),
    status: eventStatusSchema.default('pendente'),
    notes: z.string().max(2000, 'Use no máximo 2000 caracteres.').default(''),
    subtasks: z.array(subtaskSchema).default([]),
    /** Quando foi criado (ISO local). Dados migrados usam o início. */
    createdAt: localDateTime,
  })
  .refine((e) => e.end >= e.start, {
    message: 'O término não pode ser antes do início.',
    path: ['end'],
  });

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type Subtask = z.infer<typeof subtaskSchema>;
export type StudyEvent = z.infer<typeof studyEventSchema>;
/** Prova: um compromisso com `type: 'prova'`. */
export type Exam = StudyEvent & { type: 'prova' };

export const isExam = (event: StudyEvent): event is Exam => event.type === 'prova';

/** Pendente: ainda exige atenção. */
export const isOpen = (event: Pick<StudyEvent, 'status'>): boolean => event.status === 'pendente';

/** Rótulo da lista de subtarefas: “Conteúdos” numa prova, “Subtarefas” nos demais. */
export const subtaskListLabel = (type: EventType): string =>
  type === 'prova' ? 'Conteúdos' : 'Subtarefas';
