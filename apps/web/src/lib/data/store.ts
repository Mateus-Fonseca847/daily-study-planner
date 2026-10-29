import { create } from 'zustand';
import {
  isExam,
  type DataSnapshot,
  type EventStatus,
  type StudyEvent,
  type Subject,
} from '@daily/shared';
import {
  duplicateEventDraft,
  applySubjectDeletion,
  removeEvents,
  type SubjectDeletion,
} from './rules';
import { StorageWriteError, type DataRepository, type Draft, type LoadIssue } from './repository';

export interface DataState {
  subjects: Subject[];
  events: StudyEvent[];
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
  replaceAll(snapshot: DataSnapshot): void;
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
    const sync = (): void =>
      set({ subjects: repo.subjects.list(), events: repo.events.list(), issue: repo.issue });

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
      subjects: repo.subjects.list(),
      events: repo.events.list(),
      issue: repo.issue,
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
      replaceAll: (snapshot) => void run(() => repo.replaceAll(snapshot)),
      restoreBackup: () => run(() => repo.restoreBackup()) ?? false,
      startFresh: () => void run(() => repo.startFresh()),
      clearSaveError: () => set({ saveError: null }),
    };
  });
}
