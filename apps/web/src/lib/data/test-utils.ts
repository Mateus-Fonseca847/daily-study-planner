import {
  createInitialSnapshot,
  type DataSnapshot,
  type Exam,
  type StudyBlock,
  type Subject,
  type Task,
} from '@daily/shared';
import { LocalStorageRepository, MemoryStorage } from './local-storage-repository';

export const subject = (id: string, name = id): Subject => ({ id, name, color: 'azul' });

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
  contents: [
    { id: `${id}-c0`, title: 'Limites', done: true, order: 0 },
    { id: `${id}-c1`, title: 'Derivadas', done: false, order: 1 },
  ],
  ...overrides,
});

export const block = (
  id: string,
  subjectId: string | null = null,
  examId: string | null = null,
): StudyBlock => ({
  id,
  type: 'estudo',
  title: `Bloco ${id}`,
  start: '2026-11-09T14:00:00',
  end: '2026-11-09T15:00:00',
  subjectId,
  examId,
  status: 'pendente',
  notes: '',
});

export const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  type: 'entrega',
  title: `Tarefa ${id}`,
  start: '2026-11-10T23:59:00',
  end: '2026-11-10T23:59:00',
  subjectId: null,
  status: 'pendente',
  notes: '',
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
    events: [exam('e1', 'mat'), block('b1', 'mat', 'e1'), task('t1', { subjectId: 'fis' })],
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
