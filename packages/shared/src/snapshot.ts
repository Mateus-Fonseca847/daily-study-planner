import { z } from 'zod';
import { isExam, occurrenceExceptionSchema, studyEventSchema } from './event';
import { occurrenceId } from './recurrence';
import { focusSessionSchema } from './focus';
import { habitLogSchema, habitSchema, restDaySchema } from './habits';
import { DEFAULT_PREFERENCES, preferencesSchema } from './preferences';
import { subjectSchema } from './subject';
import { waterLogSchema } from './water';

/** Marcas de primeiro uso que precisam valer em todos os dispositivos (por isso sincronizam). */
export const onboardingSchema = z.object({
  /** O hábito “Água” automático já foi criado (ou a conta já tinha dados): nunca recriar. */
  waterHabitCreated: z.boolean().default(false),
});

export type Onboarding = z.infer<typeof onboardingSchema>;

/** Todos os dados do usuário (o que é salvo, exportado e importado). Formato da versão 5. */
export const dataSnapshotSchema = z
  .object({
    subjects: z.array(subjectSchema),
    events: z.array(studyEventSchema),
    preferences: preferencesSchema,
    habits: z.array(habitSchema),
    habitLogs: z.array(habitLogSchema),
    waterLogs: z.array(waterLogSchema),
    focusSessions: z.array(focusSessionSchema),
    restDays: z.array(restDaySchema).default([]),
    /** Exceções por ocorrência das séries (v5). */
    exceptions: z.array(occurrenceExceptionSchema).default([]),
    onboarding: onboardingSchema.default({ waterHabitCreated: false }),
  })
  .superRefine((snapshot, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });
    const ids = (items: readonly { id: string }[]) => new Set(items.map((i) => i.id));

    const subjectIds = ids(snapshot.subjects);
    const eventIds = ids(snapshot.events);
    const examIds = new Set(snapshot.events.filter(isExam).map((e) => e.id));
    const habitIds = ids(snapshot.habits);

    const collections: [string, readonly { id: string }[], Set<string>, string][] = [
      ['subjects', snapshot.subjects, subjectIds, 'matérias'],
      ['events', snapshot.events, eventIds, 'eventos'],
      ['habits', snapshot.habits, habitIds, 'hábitos'],
      ['habitLogs', snapshot.habitLogs, ids(snapshot.habitLogs), 'registros de hábito'],
      ['waterLogs', snapshot.waterLogs, ids(snapshot.waterLogs), 'registros de água'],
      ['focusSessions', snapshot.focusSessions, ids(snapshot.focusSessions), 'sessões de foco'],
      ['restDays', snapshot.restDays, ids(snapshot.restDays), 'dias de descanso'],
      ['exceptions', snapshot.exceptions, ids(snapshot.exceptions), 'exceções de ocorrência'],
    ];
    for (const [key, items, unique, label] of collections) {
      if (unique.size !== items.length) issue(`Há ${label} com ids repetidos.`, [key]);
    }

    snapshot.events.forEach((event, index) => {
      if (event.subjectId !== null && !subjectIds.has(event.subjectId)) {
        issue('O evento aponta para uma matéria que não existe.', ['events', index, 'subjectId']);
      }
      const subtaskIds = new Set(event.subtasks.map((s) => s.id));
      if (subtaskIds.size !== event.subtasks.length) {
        issue('Há subtarefas com ids repetidos.', ['events', index, 'subtasks']);
      }
    });
    snapshot.habitLogs.forEach((log, index) => {
      if (!habitIds.has(log.habitId)) {
        issue('O registro aponta para um hábito que não existe.', ['habitLogs', index, 'habitId']);
      }
    });
    const recurringIds = new Set(
      snapshot.events.filter((e) => e.recurrence !== undefined).map((e) => e.id),
    );
    snapshot.exceptions.forEach((ex, index) => {
      if (!recurringIds.has(ex.eventId)) {
        issue('A exceção aponta para uma série que não existe.', ['exceptions', index, 'eventId']);
      }
      if (ex.id !== occurrenceId(ex.eventId, ex.originalDate)) {
        issue('O id da exceção não corresponde à ocorrência.', ['exceptions', index, 'id']);
      }
    });
    const restKeys = new Set<string>();
    snapshot.restDays.forEach((rest, index) => {
      if (rest.habitId !== null && !habitIds.has(rest.habitId)) {
        issue('O descanso aponta para um hábito que não existe.', ['restDays', index, 'habitId']);
      }
      const key = `${rest.habitId ?? '*'}:${rest.date}`;
      if (restKeys.has(key)) issue('Há dias de descanso repetidos.', ['restDays', index]);
      restKeys.add(key);
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
    restDays: [],
    exceptions: [],
    onboarding: { waterHabitCreated: false },
  };
}

/**
 * “Virgem”: nada que o usuário tenha criado. O hábito de água automático (sem registros) e as
 * preferências padrão não contam — um dispositivo novo continua aceitando os dados da nuvem.
 */
export function isPristineSnapshot(snapshot: DataSnapshot): boolean {
  const onlyAutoWater =
    snapshot.habits.length === 0 ||
    (snapshot.habits.length === 1 &&
      snapshot.habits[0]!.source === 'agua' &&
      snapshot.habits[0]!.archivedAt === null);
  const prefs = snapshot.preferences;
  const defaultPrefs = (Object.keys(DEFAULT_PREFERENCES) as (keyof typeof prefs)[]).every(
    (key) => prefs[key] === DEFAULT_PREFERENCES[key],
  );
  return (
    snapshot.subjects.length === 0 &&
    snapshot.events.length === 0 &&
    snapshot.habitLogs.length === 0 &&
    snapshot.waterLogs.length === 0 &&
    snapshot.focusSessions.length === 0 &&
    snapshot.restDays.length === 0 &&
    snapshot.exceptions.length === 0 &&
    onlyAutoWater &&
    defaultPrefs
  );
}

/** Há algum dado do usuário (para não criar o hábito de água numa conta que já existe). */
export const hasUserData = (snapshot: Omit<DataSnapshot, 'onboarding'>): boolean =>
  snapshot.subjects.length > 0 ||
  snapshot.events.length > 0 ||
  snapshot.habits.length > 0 ||
  snapshot.habitLogs.length > 0 ||
  snapshot.waterLogs.length > 0 ||
  snapshot.focusSessions.length > 0;
