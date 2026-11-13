import {
  createInitialSnapshot,
  type DataSnapshot,
  type Exam,
  type StudyEvent,
  type Subject,
} from '@daily/shared';
import { LocalStorageRepository, MemoryStorage } from './local-storage-repository';

export const subject = (id: string, name = id): Subject => ({ id, name, color: 'ciano' });

export const exam = (
  id: string,
  subjectId: string | null = null,
  overrides: Partial<Exam> = {},
): Exam => ({
  id,
  type: 'prova',
  title: `Prova ${id}`,
  start: '2026-11-10T09:00:00',
  end: '2026-11-10T11:00:00',
  subjectId,
  status: 'pendente',
  notes: '',
  subtasks: [
    { id: `${id}-c0`, title: 'Limites', done: true, order: 0 },
    { id: `${id}-c1`, title: 'Derivadas', done: false, order: 1 },
  ],
  createdAt: '2026-11-01T08:00:00',
  ...overrides,
});

/** Tarefa com duração (o antigo bloco de estudo vira isto na v4). */
export const timedTask = (
  id: string,
  subjectId: string | null = null,
  overrides: Partial<StudyEvent> = {},
): StudyEvent => ({
  id,
  type: 'tarefa',
  title: `Bloco ${id}`,
  start: '2026-11-09T14:00:00',
  end: '2026-11-09T15:00:00',
  subjectId,
  status: 'pendente',
  notes: '',
  subtasks: [],
  createdAt: '2026-11-01T08:00:00',
  ...overrides,
});

export const task = (id: string, overrides: Partial<StudyEvent> = {}): StudyEvent => ({
  id,
  type: 'tarefa',
  title: `Tarefa ${id}`,
  start: '2026-11-10T23:59:00',
  end: '2026-11-10T23:59:00',
  subjectId: null,
  status: 'pendente',
  notes: '',
  subtasks: [],
  createdAt: '2026-11-01T08:00:00',
  ...overrides,
});

export const FIXED_NOW = new Date('2026-11-01T12:00:00');

/** Estado inicial determinístico com os dados informados. */
export const makeSnapshot = (patch: Partial<DataSnapshot> = {}): DataSnapshot => ({
  ...createInitialSnapshot(),
  ...patch,
});

export const snapshot = (): DataSnapshot =>
  makeSnapshot({
    subjects: [subject('mat', 'Matemática'), subject('fis', 'Física')],
    events: [exam('e1', 'mat'), task('t1', { subjectId: 'fis' })],
  });

/** Repositório sobre memória com ids previsíveis (`id-1`, `id-2`…). */
export function memoryRepo(storage = new MemoryStorage()) {
  let n = 0;
  const repo = new LocalStorageRepository(storage, {
    newId: () => `id-${++n}`,
    now: () => FIXED_NOW,
  });
  return { repo, storage };
}
