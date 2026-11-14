import { format } from 'date-fns';
import { create } from 'zustand';
import {
  hasUserData,
  habitLogId,
  restDayId,
  type Achievement,
  type ActiveFocus,
  type DataSnapshot,
  type EventStatus,
  type FocusSession,
  type Habit,
  type HabitLog,
  type OccurrenceException,
  type Onboarding,
  type Recurrence,
  type Preferences,
  type RestDay,
  type StudyEvent,
  type Subject,
  type WaterLog,
} from '@daily/shared';
import { mergeAchievements, setFeatured } from '../achievements/evaluate';
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
import { waterHabitDraft } from '../habits/suggestions';
import { manualFocusSession, type ManualFocusEntry } from '../focus/manual';
import { moveSubtask, type MoveDirection } from './subtasks';
import {
  applyOccurrenceEdit,
  deleteOccurrence,
  seriesOf,
  setOccurrenceStatus,
  setRecurrence,
  toggleOccurrenceSubtask,
  type EditScope,
} from './series';
import {
  applySubjectDeletion,
  duplicateEventDraft,
  removeEvents,
  type SubjectDeletion,
} from './rules';
import type { WaterEntry } from '../water/day';
import { StorageWriteError, type DataRepository, type Draft, type LoadIssue } from './repository';

export interface DataState {
  subjects: Subject[];
  events: StudyEvent[];
  preferences: Preferences;
  habits: Habit[];
  habitLogs: HabitLog[];
  waterLogs: WaterLog[];
  focusSessions: FocusSession[];
  restDays: RestDay[];
  /** Exceções por ocorrência das séries (status, subtarefas e mudanças pontuais). */
  exceptions: OccurrenceException[];
  /** Medalhas conquistadas (permanentes). */
  achievements: Achievement[];
  onboarding: Onboarding;
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
  duplicateEvent(id: string, now: Date): StudyEvent | undefined;
  /** Num id de ocorrência (`serie@data`), vale só para aquela ocorrência (nunca pergunta escopo). */
  setEventStatus(id: string, status: EventStatus): void;
  /** Edita uma ocorrência de série com o escopo escolhido. */
  editOccurrence(id: string, scope: EditScope, draft: Draft<StudyEvent>, now: Date): void;
  /** Exclui uma ocorrência de série com o escopo escolhido. */
  deleteOccurrence(id: string, scope: EditScope): void;
  /** Define ou tira a repetição (“Repetir…”). */
  setRecurrence(eventId: string, recurrence: Recurrence | null): void;
  addSubtask(eventId: string, title: string): void;
  /** Num id de ocorrência, marca só naquela ocorrência. */
  toggleSubtask(eventId: string, subtaskId: string): void;
  renameSubtask(eventId: string, subtaskId: string, title: string): void;
  deleteSubtask(eventId: string, subtaskId: string): void;
  moveSubtask(eventId: string, subtaskId: string, direction: MoveDirection): void;
  /**
   * Marca (ou desmarca) dias de descanso. `habitId = null` vale para todos os hábitos. Idempotente
   * pelo id determinístico.
   */
  setRestDays(habitId: string | null, dates: readonly string[], rest: boolean): void;
  /**
   * Primeiro uso: cria o hábito “Água” uma única vez. Só com os dados totalmente vazios; em conta
   * que já tem dados apenas marca a flag. Nunca recria depois de excluído.
   */
  ensureWaterHabit(now: Date): void;
  /** Tempo de foco registrado à mão (Perfil e Modo Foco). */
  addManualFocus(entry: ManualFocusEntry): FocusSession | undefined;
  updatePreferences(patch: Partial<Preferences>): void;
  /** Soma um copo (tamanho das preferências) ao dia de `now`. */
  addWater(now: Date): WaterLog | undefined;
  removeWater(id: string): void;
  /**
   * Define os registros de água de um dia: quem tem `id` é mantido/atualizado, quem não tem é criado
   * e os que ficaram de fora são removidos. Serve a adicionar, editar, excluir, ajustar o total e
   * desfazer (reenviando o estado anterior, com os mesmos ids).
   */
  setWaterDay(date: string, entries: readonly WaterEntry[]): void;
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
  /**
   * Grava o resultado de uma avaliação de medalhas numa escrita só: medalhas novas ou que subiram
   * de nível, a marca da concessão retroativa e as marcas `preparedAt` das provas.
   */
  applyAchievements(result: AchievementWrite): void;
  /** Destaca (até 3) ou tira do destaque; com 3 marcadas, `replace` diz qual sai. */
  setAchievementFeatured(id: string, featured: boolean, replace?: string): 'limite' | 'ok';
  replaceAll(snapshot: DataSnapshot): void;
  /** Relê o armazenamento (outra aba/janela gravou). */
  reload(): void;
  restoreBackup(): boolean;
  startFresh(): void;
  clearSaveError(): void;
}

export type DataStore = DataState & DataActions;

export interface AchievementWrite {
  changes: readonly Achievement[];
  /** Concessão retroativa feita agora (grava `onboarding.achievementsSeededAt`). */
  seededAt?: string;
  prepared?: readonly { id: string; preparedAt: string | null }[];
}

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
      exceptions: repo.snapshot().exceptions,
      achievements: repo.snapshot().achievements,
      restDays: repo.restDays.list(),
      onboarding: repo.onboarding.get(),
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
      duplicateEvent: (id, now) =>
        run(() => {
          const event = eventById(id);
          return event
            ? repo.events.create(duplicateEventDraft(event, newId, toLocalIso(now)))
            : undefined;
        }),
      setEventStatus: (id, status) =>
        void run(() =>
          seriesOf(repo.snapshot(), id)
            ? repo.replaceAll(setOccurrenceStatus(repo.snapshot(), id, status))
            : repo.events.update(id, { status }),
        ),
      editOccurrence: (id, scope, draft, now) =>
        void run(() =>
          repo.replaceAll(
            applyOccurrenceEdit(repo.snapshot(), id, scope, draft, newId, toLocalIso(now)),
          ),
        ),
      applyAchievements: ({ changes, seededAt, prepared = [] }) =>
        void run(() => {
          if (changes.length === 0 && !seededAt && prepared.length === 0) return;
          const current = repo.snapshot();
          const marks = new Map(prepared.map((p) => [p.id, p.preparedAt]));
          repo.replaceAll({
            ...current,
            events: current.events.map((e) => {
              if (!marks.has(e.id)) return e;
              const at = marks.get(e.id);
              const { preparedAt: _old, ...rest } = e;
              void _old;
              return at ? { ...rest, preparedAt: at } : rest;
            }),
            achievements: mergeAchievements(current.achievements, changes),
            onboarding: seededAt
              ? { ...current.onboarding, achievementsSeededAt: seededAt }
              : current.onboarding,
          });
        }),
      setAchievementFeatured: (id, featured, replace) => {
        const current = repo.snapshot();
        const next = setFeatured(current.achievements, id, featured, replace);
        if (next === 'limite') return 'limite';
        run(() => repo.replaceAll({ ...current, achievements: next }));
        return 'ok';
      },
      deleteOccurrence: (id, scope) =>
        void run(() => repo.replaceAll(deleteOccurrence(repo.snapshot(), id, scope))),
      setRecurrence: (eventId, recurrence) =>
        void run(() => repo.replaceAll(setRecurrence(repo.snapshot(), eventId, recurrence))),
      addSubtask: (eventId, title) =>
        void run(() => {
          const event = eventById(eventId);
          const clean = title.trim();
          if (!event || clean === '') return;
          const order = Math.max(-1, ...event.subtasks.map((c) => c.order)) + 1;
          repo.events.update(eventId, {
            subtasks: [...event.subtasks, { id: newId(), title: clean, done: false, order }],
          });
        }),
      toggleSubtask: (eventId, subtaskId) =>
        void run(() => {
          if (seriesOf(repo.snapshot(), eventId)) {
            repo.replaceAll(toggleOccurrenceSubtask(repo.snapshot(), eventId, subtaskId));
            return;
          }
          const event = eventById(eventId);
          if (!event) return;
          repo.events.update(eventId, {
            subtasks: event.subtasks.map((c) => (c.id === subtaskId ? { ...c, done: !c.done } : c)),
          });
        }),
      renameSubtask: (eventId, subtaskId, title) =>
        void run(() => {
          const event = eventById(eventId);
          const clean = title.trim();
          if (!event || clean === '') return;
          repo.events.update(eventId, {
            subtasks: event.subtasks.map((c) => (c.id === subtaskId ? { ...c, title: clean } : c)),
          });
        }),
      deleteSubtask: (eventId, subtaskId) =>
        void run(() => {
          const event = eventById(eventId);
          if (!event) return;
          const rest = event.subtasks
            .filter((c) => c.id !== subtaskId)
            .sort((a, b) => a.order - b.order)
            .map((c, order) => ({ ...c, order }));
          repo.events.update(eventId, { subtasks: rest });
        }),
      moveSubtask: (eventId, subtaskId, direction) =>
        void run(() => {
          const event = eventById(eventId);
          if (!event) return;
          repo.events.update(eventId, {
            subtasks: moveSubtask(event.subtasks, subtaskId, direction),
          });
        }),
      setRestDays: (habitId, dates, rest) =>
        void run(() => {
          for (const date of dates) {
            const id = restDayId(habitId, date);
            if (rest) repo.restDays.upsert({ id, habitId, date });
            else repo.restDays.delete(id);
          }
        }),
      ensureWaterHabit: (now) =>
        void run(() => {
          // Dado ilegível em disco: não grava nada por cima antes de o usuário decidir.
          if (repo.issue || repo.onboarding.get().waterHabitCreated) return;
          if (!hasUserData(repo.snapshot())) {
            const draft = waterHabitDraft(repo.preferences.get().waterGoalMl);
            repo.habits.create(newHabit(draft, now, 0));
          }
          repo.onboarding.update({ waterHabitCreated: true });
        }),
      addManualFocus: (entry) => run(() => repo.focusSessions.create(manualFocusSession(entry))),
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
      setWaterDay: (date, entries) =>
        void run(() => {
          const keep = new Set(entries.flatMap((entry) => (entry.id ? [entry.id] : [])));
          for (const log of repo.waterLogs.list()) {
            if (log.date === date && !keep.has(log.id)) repo.waterLogs.delete(log.id);
          }
          for (const entry of entries) {
            const { id, ...fields } = { ...entry, date };
            if (id) repo.waterLogs.upsert({ id, ...fields });
            else repo.waterLogs.create(fields);
          }
        }),
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
