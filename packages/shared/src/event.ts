import { z } from 'zod';
import { recurrenceSchema } from './recurrence';

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
    /**
     * Repetição (só Tarefa e Especial). Numa série, `status` e o `done` das subtarefas não valem:
     * o estado é de cada ocorrência (coleção `exceptions`); as subtarefas são o modelo.
     */
    recurrence: recurrenceSchema.optional(),
  })
  .refine((e) => e.end >= e.start, {
    message: 'O término não pode ser antes do início.',
    path: ['end'],
  })
  .refine((e) => !(e.recurrence && e.type === 'prova'), {
    message: 'Prova não se repete.',
    path: ['recurrence'],
  })
  .refine(
    (e) => !(e.recurrence?.end.kind === 'em' && e.recurrence.end.date < e.start.slice(0, 10)),
    {
      message: 'A data final não pode ser antes do início.',
      path: ['recurrence', 'end'],
    },
  );

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type Subtask = z.infer<typeof subtaskSchema>;
export type StudyEvent = z.infer<typeof studyEventSchema>;
/** Prova: um compromisso com `type: 'prova'`. */
export type Exam = StudyEvent & { type: 'prova' };

/** O compromisso é uma série recorrente. */
export const isRecurring = (event: Pick<StudyEvent, 'recurrence'>): boolean =>
  event.recurrence !== undefined;

/**
 * Exceção de uma ocorrência de série (`id` = `eventoId@aaaa-mm-dd`, a data original). `pulada`:
 * a ocorrência não existe; `alterada`: mudanças pontuais, status e subtarefas desta ocorrência.
 */
export const occurrenceExceptionSchema = z.object({
  id,
  eventId: id,
  originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  kind: z.enum(['pulada', 'alterada']),
  /** Valem só nesta ocorrência (`start`/`end` completos permitem movê-la). */
  changes: z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'Informe o título.')
        .max(120, 'Use no máximo 120 caracteres.'),
      start: localDateTime,
      end: localDateTime,
      notes: z.string().max(2000, 'Use no máximo 2000 caracteres.'),
    })
    .partial()
    .optional(),
  /** Ausente = pendente. */
  status: z.enum(['concluido', 'cancelado']).optional(),
  /** Ids das subtarefas-modelo concluídas nesta ocorrência. */
  doneSubtasks: z.array(id).optional(),
});

export type OccurrenceException = z.infer<typeof occurrenceExceptionSchema>;

export const isExam = (event: StudyEvent): event is Exam => event.type === 'prova';

/** Pendente: ainda exige atenção. */
export const isOpen = (event: Pick<StudyEvent, 'status'>): boolean => event.status === 'pendente';

/** Rótulo da lista de subtarefas: “Conteúdos” numa prova, “Subtarefas” nos demais. */
export const subtaskListLabel = (type: EventType): string =>
  type === 'prova' ? 'Conteúdos' : 'Subtarefas';
