import { z } from 'zod';
import { isExam, studyEventSchema } from './event';
import { subjectSchema } from './subject';

/** Todos os dados do usuário (o que é salvo, exportado e importado). */
export const dataSnapshotSchema = z
  .object({
    subjects: z.array(subjectSchema),
    events: z.array(studyEventSchema),
  })
  .superRefine((snapshot, ctx) => {
    const subjectIds = new Set(snapshot.subjects.map((s) => s.id));
    const eventIds = new Set(snapshot.events.map((e) => e.id));
    const examIds = new Set(snapshot.events.filter(isExam).map((e) => e.id));

    if (subjectIds.size !== snapshot.subjects.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Há matérias com ids repetidos.',
        path: ['subjects'],
      });
    }
    if (eventIds.size !== snapshot.events.length) {
      ctx.addIssue({ code: 'custom', message: 'Há eventos com ids repetidos.', path: ['events'] });
    }
    snapshot.events.forEach((event, index) => {
      if (event.subjectId !== null && !subjectIds.has(event.subjectId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'O evento aponta para uma matéria que não existe.',
          path: ['events', index, 'subjectId'],
        });
      }
      if (event.type === 'estudo' && event.examId !== null && !examIds.has(event.examId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'O bloco de estudo aponta para uma prova que não existe.',
          path: ['events', index, 'examId'],
        });
      }
    });
  });

export type DataSnapshot = z.infer<typeof dataSnapshotSchema>;

export const EMPTY_SNAPSHOT: DataSnapshot = { subjects: [], events: [] };
