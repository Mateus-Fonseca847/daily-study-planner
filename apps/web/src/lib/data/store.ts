import { format } from 'date-fns';
import { create } from 'zustand';
import {
  habitLogId,
  isExam,
  type ActiveFocus,
  type DataSnapshot,
  type EventStatus,
  type FocusSession,
  type Habit,
  type HabitLog,
  type Preferences,
  type StudyEvent,
  type Subject,
  type WaterLog,
} from '@daily/shared';
import { dayKey, toLocalIso } from '../dates';
import {
  applyHabitEdit,
  canEditDay,
  duplicateHabitDraft,
  newHabit,
  removeHabit,
  type HabitDraft,
  type HabitEdit,
} from '../habits/edit';
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
  habits: Habit[];
  habitLogs: HabitLog[];
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
  createHabit(draft: HabitDraft, now: Date): Habit | undefined;
  /** Edita o hábito; repetição, meta e horário viram uma nova regra a partir de hoje. */
  updateHabit(id: string, edit: HabitEdit, now: Date): void;
  duplicateHabit(id: string, now: Date): Habit | undefined;
  archiveHabit(id: string, now: Date): void;
  restoreHabit(id: string): void;
  /** Remove o hábito e os registros dele (o “Desfazer” restaura tudo pelo snapshot). */
  deleteHabit(id: string): void;
  /** Define a ordem pelos ids. */
  reorderHabits(ids: readonly string[]): void;
  /**
   * Registra o valor de um hábito manual num dia (check: 0 ou 1). Só dias passados ou hoje, nos
   * últimos 366 dias. Devolve `false` quando o registro é bloqueado.
   */
  setHabitValue(id: string, date: string, value: number, now: Date): boolean;
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
      habits: repo.habits.list(),
      habitLogs: repo.habitLogs.list(),
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
      createHabit: (draft, now) =>
        run(() =>
          repo.habits.create(
            newHabit(draft, now, Math.max(-1, ...repo.habits.list().map((h) => h.order)) + 1),
          ),
        ),
      updateHabit: (id, edit, now) =>
        void run(() => {
          const habit = repo.habits.get(id);
          if (habit) repo.habits.update(id, applyHabitEdit(habit, edit, dayKey(now)));
        }),
      duplicateHabit: (id, now) =>
        run(() => {
          const habit = repo.habits.get(id);
          if (!habit) return undefined;
          const order = Math.max(-1, ...repo.habits.list().map((h) => h.order)) + 1;
          return repo.habits.create(
            duplicateHabitDraft(habit, dayKey(now), toLocalIso(now), order),
          );
        }),
      archiveHabit: (id, now) =>
        void run(() => repo.habits.update(id, { archivedAt: toLocalIso(now) })),
      restoreHabit: (id) => void run(() => repo.habits.update(id, { archivedAt: null })),
      deleteHabit: (id) => void run(() => repo.replaceAll(removeHabit(repo.snapshot(), id))),
      reorderHabits: (ids) =>
        void run(() => ids.forEach((id, order) => repo.habits.update(id, { order }))),
      setHabitValue: (id, date, value, now) =>
        run(() => {
          const habit = repo.habits.get(id);
          if (!habit || !canEditDay(habit, date, dayKey(now))) return false;
          repo.habitLogs.upsert({
            id: habitLogId(id, date),
            habitId: id,
            date,
            value: Math.max(0, value),
            updatedAt: toLocalIso(now),
          });
          return true;
        }) ?? false,
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
