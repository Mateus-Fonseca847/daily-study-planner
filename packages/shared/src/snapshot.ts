import { z } from 'zod';
import { isExam, studyEventSchema } from './event';
import { focusSessionSchema } from './focus';
import { habitLogSchema, habitSchema } from './habits';
import { DEFAULT_PREFERENCES, preferencesSchema } from './preferences';
import { subjectSchema } from './subject';
import { waterLogSchema } from './water';

/** Todos os dados do usuário (o que é salvo, exportado e importado). Formato da versão 3. */
export const dataSnapshotSchema = z
  .object({
    subjects: z.array(subjectSchema),
    events: z.array(studyEventSchema),
    preferences: preferencesSchema,
    habits: z.array(habitSchema),
    habitLogs: z.array(habitLogSchema),
    waterLogs: z.array(waterLogSchema),
    focusSessions: z.array(focusSessionSchema),
  })
  .superRefine((snapshot, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });
    const ids = (items: readonly { id: string }[]) => new Set(items.map((i) => i.id));

    const subjectIds = ids(snapshot.subjects);
    const eventIds = ids(snapshot.events);
    const examIds = new Set(snapshot.events.filter(isExam).map((e) => e.id));
    const blockIds = new Set(snapshot.events.filter((e) => e.type === 'estudo').map((e) => e.id));
    const habitIds = ids(snapshot.habits);

    const collections: [string, readonly { id: string }[], Set<string>, string][] = [
      ['subjects', snapshot.subjects, subjectIds, 'matérias'],
      ['events', snapshot.events, eventIds, 'eventos'],
      ['habits', snapshot.habits, habitIds, 'hábitos'],
      ['habitLogs', snapshot.habitLogs, ids(snapshot.habitLogs), 'registros de hábito'],
      ['waterLogs', snapshot.waterLogs, ids(snapshot.waterLogs), 'registros de água'],
      ['focusSessions', snapshot.focusSessions, ids(snapshot.focusSessions), 'sessões de foco'],
    ];
    for (const [key, items, unique, label] of collections) {
      if (unique.size !== items.length) issue(`Há ${label} com ids repetidos.`, [key]);
    }

    snapshot.events.forEach((event, index) => {
      if (event.subjectId !== null && !subjectIds.has(event.subjectId)) {
        issue('O evento aponta para uma matéria que não existe.', ['events', index, 'subjectId']);
      }
      if (event.type === 'estudo' && event.examId !== null && !examIds.has(event.examId)) {
        issue('O bloco de estudo aponta para uma prova que não existe.', [
          'events',
          index,
          'examId',
        ]);
      }
    });
    snapshot.habitLogs.forEach((log, index) => {
      if (!habitIds.has(log.habitId)) {
        issue('O registro aponta para um hábito que não existe.', ['habitLogs', index, 'habitId']);
      }
    });
    snapshot.focusSessions.forEach((session, index) => {
      const bad = (value: string | null, valid: Set<string>) => value !== null && !valid.has(value);
      if (bad(session.subjectId, subjectIds)) {
        issue('A sessão aponta para uma matéria que não existe.', [
          'focusSessions',
          index,
          'subjectId',
        ]);
      }
      if (bad(session.examId, examIds)) {
        issue('A sessão aponta para uma prova que não existe.', ['focusSessions', index, 'examId']);
      }
      if (bad(session.blockId, blockIds)) {
        issue('A sessão aponta para um bloco que não existe.', ['focusSessions', index, 'blockId']);
      }
    });
  });

export type DataSnapshot = z.infer<typeof dataSnapshotSchema>;

/** Estado do primeiro acesso: sem matérias, eventos nem hábitos, com as preferências padrão. */
export function createInitialSnapshot(): DataSnapshot {
  return {
    subjects: [],
    events: [],
    preferences: { ...DEFAULT_PREFERENCES },
    habits: [],
    habitLogs: [],
    waterLogs: [],
    focusSessions: [],
  };
}
