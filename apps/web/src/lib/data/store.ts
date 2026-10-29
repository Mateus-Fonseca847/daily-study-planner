import { format } from 'date-fns';
import { create } from 'zustand';
import {
  goalLogId,
  isExam,
  type ActiveFocus,
  type DataSnapshot,
  type EventStatus,
  type FocusSession,
  type Goal,
  type GoalIcon,
  type GoalLog,
  type Preferences,
  type StudyEvent,
  type Subject,
  type WaterLog,
} from '@daily/shared';
import { dayKey, toLocalIso } from '../dates';
import {
  applySubjectDeletion,
  duplicateEventDraft,
  removeEvents,
  type SubjectDeletion,
} from './rules';
import { StorageWriteError, type DataRepository, type Draft, type LoadIssue } from './repository';

export interface DataState {
  subjects: Subject[];
  events: StudyEvent[];
  preferences: Preferences;
  goals: Goal[];
  goalLogs: GoalLog[];
  waterLogs: WaterLog[];
  focusSessions: FocusSession[];
  /** Sessão de foco em andamento (fora do snapshot/backup). */
  focusActive: ActiveFocus | null;
  issue: LoadIssue | null;
  /** Mensagem quando a última gravação falhou (os dados seguem na memória). */
  saveError: string | null;
}

export interface DataActions {
  snapshot(): DataSnapshot;
  createSubject(draft: Draft<Subject>): Subject | undefined;
  updateSubject(subject: Subject): void;
  deleteSubject(id: string, resolution?: SubjectDeletion): void;
  createEvent(draft: Draft<StudyEvent>): StudyEvent | undefined;
  updateEvent(event: StudyEvent): void;
  deleteEvent(id: string): void;
  duplicateEvent(id: string): StudyEvent | undefined;
  setEventStatus(id: string, status: EventStatus): void;
  toggleContent(eventId: string, contentId: string): void;
  addContent(eventId: string, title: string): void;
  updatePreferences(patch: Partial<Preferences>): void;
  /** Soma um copo (tamanho das preferências) ao dia de `now`. */
  addWater(now: Date): WaterLog | undefined;
  removeWater(id: string): void;
  /** Marca/desmarca uma meta manual num dia (`yyyy-MM-dd`). */
  setGoalDone(goalId: string, date: string, done: boolean): void;
  createGoal(now: Date, draft: { title: string; icon: GoalIcon }): Goal | undefined;
  updateGoal(id: string, patch: { title?: string; icon?: GoalIcon }): void;
  /** Define a ordem das metas pela lista de ids. */
  reorderGoals(ids: readonly string[]): void;
  archiveGoal(id: string, now: Date): void;
  /** Idempotente pelo `id` (duas abas podem finalizar a mesma sessão). */
  addFocusSession(session: FocusSession): void;
  setFocusActive(active: ActiveFocus | null): void;
  replaceAll(snapshot: DataSnapshot): void;
  /** Relê o armazenamento (outra aba/janela gravou). */
  reload(): void;
  restoreBackup(): boolean;
  startFresh(): void;
  clearSaveError(): void;
}

export type DataStore = DataState & DataActions;

/** Cria o store de dados sobre qualquer `DataRepository` (a UI nunca toca o storage). */
export function createDataStore(
  repo: DataRepository,
  newId: () => string = () => crypto.randomUUID(),
) {
  return create<DataStore>()((set) => {
    const read = (): Omit<DataState, 'saveError'> => ({
      subjects: repo.subjects.list(),
      events: repo.events.list(),
      preferences: repo.preferences.get(),
      goals: repo.goals.list(),
      goalLogs: repo.goalLogs.list(),
      waterLogs: repo.waterLogs.list(),
      focusSessions: repo.focusSessions.list(),
      focusActive: repo.focusActive.get(),
      issue: repo.issue,
    });
    const sync = (): void => set(read());

    /** Executa uma mutação; falha de gravação vira aviso, não exceção. */
    const run = <T>(mutation: () => T): T | undefined => {
      try {
        const result = mutation();
        set({ saveError: null });
        return result;
      } catch (error) {
        if (error instanceof StorageWriteError) {
          set({ saveError: error.message });
          return undefined;
        }
        throw error;
      } finally {
        sync();
      }
    };

    const eventById = (id: string) => repo.events.get(id);

    return {
      ...read(),
      saveError: null,

      snapshot: () => repo.snapshot(),
      createSubject: (draft) => run(() => repo.subjects.create(draft)),
      updateSubject: (subject) =>
        void run(() =>
          repo.subjects.update(subject.id, { name: subject.name, color: subject.color }),
        ),
      deleteSubject: (id, resolution) =>
        void run(() => repo.replaceAll(applySubjectDeletion(repo.snapshot(), id, resolution))),
      createEvent: (draft) => run(() => repo.events.create(draft)),
      updateEvent: (event) => {
        const { id, ...patch } = event;
        void run(() => repo.events.update(id, patch));
      },
      deleteEvent: (id) =>
        void run(() => repo.replaceAll(removeEvents(repo.snapshot(), new Set([id])))),
      duplicateEvent: (id) =>
        run(() => {
          const event = eventById(id);
          return event ? repo.events.create(duplicateEventDraft(event, newId)) : undefined;
        }),
      setEventStatus: (id, status) => void run(() => repo.events.update(id, { status })),
      toggleContent: (eventId, contentId) =>
        void run(() => {
          const event = eventById(eventId);
          if (!event || !isExam(event)) return;
          repo.events.update(eventId, {
            contents: event.contents.map((c) => (c.id === contentId ? { ...c, done: !c.done } : c)),
          });
        }),
      addContent: (eventId, title) =>
        void run(() => {
          const event = eventById(eventId);
          if (!event || !isExam(event)) return;
          repo.events.update(eventId, {
            contents: [
              ...event.contents,
              { id: newId(), title, done: false, order: event.contents.length },
            ],
          });
        }),
      updatePreferences: (patch) => void run(() => repo.preferences.update(patch)),
      addWater: (now) =>
        run(() =>
          repo.waterLogs.create({
            date: dayKey(now),
            ml: repo.preferences.get().cupMl,
            time: format(now, 'HH:mm'),
          }),
        ),
      removeWater: (id) => void run(() => repo.waterLogs.delete(id)),
      setGoalDone: (goalId, date, done) =>
        void run(() => repo.goalLogs.upsert({ id: goalLogId(goalId, date), goalId, date, done })),
      createGoal: (now, draft) =>
        run(() =>
          repo.goals.create({
            title: draft.title,
            icon: draft.icon,
            kind: 'manual',
            order: Math.max(-1, ...repo.goals.list().map((g) => g.order)) + 1,
            createdAt: toLocalIso(now),
            archivedAt: null,
          }),
        ),
      updateGoal: (id, patch) => void run(() => repo.goals.update(id, patch)),
      reorderGoals: (ids) =>
        void run(() => ids.forEach((id, order) => repo.goals.update(id, { order }))),
      archiveGoal: (id, now) =>
        void run(() => repo.goals.update(id, { archivedAt: toLocalIso(now) })),
      addFocusSession: (session) => void run(() => repo.focusSessions.upsert(session)),
      setFocusActive: (active) => void run(() => repo.focusActive.set(active)),
      replaceAll: (snapshot) => void run(() => repo.replaceAll(snapshot)),
      reload: () => {
        repo.reload();
        sync();
      },
      restoreBackup: () => run(() => repo.restoreBackup()) ?? false,
      startFresh: () => void run(() => repo.startFresh()),
      clearSaveError: () => set({ saveError: null }),
    };
  });
}
