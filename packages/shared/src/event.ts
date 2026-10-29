import { z } from 'zod';

export const EVENT_TYPES = ['prova', 'estudo', 'entrega', 'revisao', 'especial'] as const;
export const EVENT_STATUSES = ['agendada', 'em-andamento', 'concluida'] as const;

export const eventTypeSchema = z.enum(EVENT_TYPES);
export const eventStatusSchema = z.enum(EVENT_STATUSES);

export const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const contentItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean(),
});

export const studyEventSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    type: eventTypeSchema,
    status: eventStatusSchema,
    subjectId: z.string().min(1),
    /** Início em ISO 8601 (data + hora locais). */
    start: z.iso.datetime({ local: true }),
    /** Fim em ISO 8601; deve ser posterior ao início. */
    end: z.iso.datetime({ local: true }),
    /** Conteúdos a revisar — usado em provas. */
    contents: z.array(contentItemSchema).default([]),
  })
  .refine((e) => e.end > e.start, { message: 'end deve ser posterior a start', path: ['end'] });

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type ContentItem = z.infer<typeof contentItemSchema>;
export type StudyEvent = z.infer<typeof studyEventSchema>;
