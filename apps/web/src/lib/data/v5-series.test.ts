import { describe, expect, it } from 'vitest';
import { dataSnapshotSchema, type DataSnapshot, type StudyEvent } from '@daily/shared';
import { expandEvents, findView } from '../recurrence/expand';
import { readBackupFile } from './backup';
import { DATA_VERSION, parseEnvelope } from './envelope';
import {
  LEGACY_V4_KEY,
  LocalStorageRepository,
  MemoryStorage,
  PRE_V5_KEY,
  STORAGE_KEY,
} from './local-storage-repository';
import {
  applyOccurrenceEdit,
  deleteOccurrence,
  setOccurrenceStatus,
  setRecurrence,
  toggleOccurrenceSubtask,
} from './series';
import { createDataStore } from './store';
import { FIXED_NOW, makeSnapshot, memoryRepo, task } from './test-utils';

const CREATED = '2026-11-20T09:00:00';
/** Treino toda segunda e quarta às 19h (1 h), desde quarta 11/11/2026. */
const training = (patch: Partial<StudyEvent> = {}): StudyEvent =>
  task('treino', {
    title: 'Treino',
    start: '2026-11-11T19:00:00',
    end: '2026-11-11T20:00:00',
    subtasks: [
      { id: 'aq', title: 'Aquecer', done: false, order: 0 },
      { id: 'co', title: 'Correr', done: false, order: 1 },
    ],
    recurrence: { freq: 'semanal', interval: 1, weekdays: [1, 3], end: { kind: 'nunca' } },
    ...patch,
  });
const base = (): DataSnapshot => dataSnapshotSchema.parse(makeSnapshot({ events: [training()] }));
const NOV = { from: '2026-11-01', to: '2026-11-30' };
const view = (s: DataSnapshot, w = NOV) => expandEvents(s.events, s.exceptions, w);
const titles = (s: DataSnapshot, w = NOV) =>
  view(s, w).map((o) => `${o.start.slice(5, 16)} ${o.title} ${o.status}`);
let n = 0;
const newId = () => `nova-${++n}`;
const draftOf = (s: DataSnapshot, id: string, patch: Partial<StudyEvent> = {}) => {
  const {
    id: _id,
    seriesId: _s,
    originalDate: _o,
    ...rest
  } = findView(s.events, s.exceptions, id)!;
  void _id;
  void _s;
  void _o;
  const series = s.events.find((e) => e.id === id.split('@')[0])!;
  return { ...rest, subtasks: series.subtasks, ...patch };
};

describe('migração v4 → v5', () => {
  const v4 = {
    ...makeSnapshot({ events: [task('a')] }),
    exceptions: undefined,
  };
  const raw = JSON.stringify({ app: 'daily', version: 4, data: v4 });

  it('acrescenta as exceções vazias, sem mudar nenhum evento (idempotente)', () => {
    const result = parseEnvelope(raw, FIXED_NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.migratedFrom).toBe(4);
    expect(result.snapshot.exceptions).toEqual([]);
    expect(result.snapshot.events[0]).not.toHaveProperty('recurrence');
    const again = parseEnvelope(
      JSON.stringify({ app: 'daily', version: DATA_VERSION, data: result.snapshot }),
      FIXED_NOW,
    );
    expect(again.ok && again.snapshot).toEqual(result.snapshot);
  });

  it('repositório: lê daily:v4, guarda daily:v4:pre-v5 e nunca reescreve daily:v4', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V4_KEY, raw);
    const repo = new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    expect(repo.issue).toBeNull();
    expect(storage.getItem(PRE_V5_KEY)).toBe(raw);
    expect(storage.getItem(LEGACY_V4_KEY)).toBe(raw);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).version).toBe(DATA_VERSION);
  });

  it('importa v1 a v6 e recusa v7', () => {
    expect(readBackupFile(raw).ok).toBe(true);
    expect(readBackupFile(JSON.stringify({ app: 'daily', version: 5, data: base() })).ok).toBe(
      true,
    );
    expect(readBackupFile(JSON.stringify({ app: 'daily', version: 7, data: base() })).ok).toBe(
      false,
    );
    expect(
      readBackupFile(JSON.stringify({ version: 1, data: { subjects: [], events: [] } })).ok,
    ).toBe(true);
  });

  it('o schema recusa prova recorrente, data final antes do início e exceção órfã', () => {
    const bad = (patch: Partial<DataSnapshot>) =>
      dataSnapshotSchema.safeParse({ ...base(), ...patch }).error?.issues[0]?.message;
    expect(bad({ events: [training({ type: 'prova' })] })).toBe('Prova não se repete.');
    expect(
      bad({
        events: [
          training({
            recurrence: {
              freq: 'diaria',
              interval: 1,
              end: { kind: 'em', date: '2026-11-01' },
            },
          }),
        ],
      }),
    ).toBe('A data final não pode ser antes do início.');
    expect(
      bad({
        exceptions: [
          { id: 'x@2026-11-16', eventId: 'x', originalDate: '2026-11-16', kind: 'pulada' },
        ],
      }),
    ).toBe('A exceção aponta para uma série que não existe.');
  });
});

describe('ocorrências e exceções', () => {
  it('expande só a janela, com horário e duração da série', () => {
    expect(titles(base())).toEqual([
      '11-11T19:00 Treino pendente',
      '11-16T19:00 Treino pendente',
      '11-18T19:00 Treino pendente',
      '11-23T19:00 Treino pendente',
      '11-25T19:00 Treino pendente',
      '11-30T19:00 Treino pendente',
    ]);
    expect(view(base())[0]).toMatchObject({
      id: 'treino@2026-11-11',
      seriesId: 'treino',
      originalDate: '2026-11-11',
      end: '2026-11-11T20:00:00',
    });
  });

  it('concluir a de segunda não conclui a de quarta; cancelar e reabrir', () => {
    let s = setOccurrenceStatus(base(), 'treino@2026-11-16', 'concluido');
    s = setOccurrenceStatus(s, 'treino@2026-11-18', 'cancelado');
    expect(titles(s).slice(1, 4)).toEqual([
      '11-16T19:00 Treino concluido',
      '11-18T19:00 Treino cancelado',
      '11-23T19:00 Treino pendente',
    ]);
    s = setOccurrenceStatus(s, 'treino@2026-11-18', 'pendente');
    expect(s.exceptions.map((e) => e.id)).toEqual(['treino@2026-11-16']); // vazia some
    expect(dataSnapshotSchema.safeParse(s).success).toBe(true);
  });

  it('subtarefas reiniciam em cada ocorrência', () => {
    const s = toggleOccurrenceSubtask(base(), 'treino@2026-11-16', 'aq');
    const [, monday, wednesday] = view(s);
    expect(monday?.subtasks.map((t) => t.done)).toEqual([true, false]);
    expect(wednesday?.subtasks.map((t) => t.done)).toEqual([false, false]);
    expect(s.events[0]?.subtasks.every((t) => !t.done)).toBe(true); // o modelo não muda
  });

  it('pular (excluir “somente esta”) e alterar só uma ocorrência', () => {
    let s = deleteOccurrence(base(), 'treino@2026-11-16', 'esta');
    expect(titles(s)).not.toContain('11-16T19:00 Treino pendente');
    s = applyOccurrenceEdit(
      s,
      'treino@2026-11-18',
      'esta',
      draftOf(s, 'treino@2026-11-18', {
        title: 'Treino leve',
        start: '2026-11-18T07:00:00',
        end: '2026-11-18T08:00:00',
      }),
      newId,
      CREATED,
    );
    expect(titles(s).slice(1, 3)).toEqual([
      '11-18T07:00 Treino leve pendente',
      '11-23T19:00 Treino pendente',
    ]);
    expect(s.exceptions.find((e) => e.id === 'treino@2026-11-18')?.changes).toEqual({
      title: 'Treino leve',
      start: '2026-11-18T07:00:00',
      end: '2026-11-18T08:00:00',
    });
  });

  it('“todas”: muda a série e preserva o campo alterado só numa ocorrência', () => {
    let s = applyOccurrenceEdit(
      base(),
      'treino@2026-11-16',
      'esta',
      draftOf(base(), 'treino@2026-11-16', { title: 'Treino especial' }),
      newId,
      CREATED,
    );
    s = applyOccurrenceEdit(
      s,
      'treino@2026-11-23',
      'todas',
      draftOf(s, 'treino@2026-11-23', {
        title: 'Musculação',
        start: '2026-11-23T18:00:00',
        end: '2026-11-23T19:30:00',
      }),
      newId,
      CREATED,
    );
    expect(s.events[0]).toMatchObject({ start: '2026-11-11T18:00:00', end: '2026-11-11T19:30:00' });
    expect(titles(s).slice(0, 3)).toEqual([
      '11-11T18:00 Musculação pendente',
      '11-16T18:00 Treino especial pendente',
      '11-18T18:00 Musculação pendente',
    ]);
  });

  it('“esta e as próximas”: série termina na véspera, nasce outra e as exceções posteriores mudam', () => {
    let s = setOccurrenceStatus(base(), 'treino@2026-11-16', 'concluido');
    s = setOccurrenceStatus(s, 'treino@2026-11-25', 'concluido');
    s = applyOccurrenceEdit(
      s,
      'treino@2026-11-23',
      'proximas',
      draftOf(s, 'treino@2026-11-23', {
        title: 'Treino novo',
        start: '2026-11-23T06:00:00',
        end: '2026-11-23T07:00:00',
      }),
      newId,
      CREATED,
    );
    const [old, fresh] = s.events;
    expect(old?.recurrence?.end).toEqual({ kind: 'em', date: '2026-11-22' });
    expect(fresh).toMatchObject({
      title: 'Treino novo',
      start: '2026-11-23T06:00:00',
      createdAt: CREATED,
    });
    expect(fresh?.recurrence?.weekdays).toEqual([1, 3]);
    expect(titles(s)).toEqual([
      '11-11T19:00 Treino pendente',
      '11-16T19:00 Treino concluido',
      '11-18T19:00 Treino pendente',
      '11-23T06:00 Treino novo pendente',
      '11-25T06:00 Treino novo concluido', // a exceção posterior foi para a série nova
      '11-30T06:00 Treino novo pendente',
    ]);
    expect(s.exceptions.map((e) => e.id).sort()).toEqual([
      `${fresh!.id}@2026-11-25`,
      'treino@2026-11-16',
    ]);
    expect(dataSnapshotSchema.safeParse(s).success).toBe(true);
  });

  it('“esta e as próximas” com “após N” divide a contagem', () => {
    const counted = dataSnapshotSchema.parse(
      makeSnapshot({
        events: [
          training({
            recurrence: {
              freq: 'semanal',
              interval: 1,
              weekdays: [1, 3],
              end: { kind: 'apos', count: 5 },
            },
          }),
        ],
      }),
    );
    const s = applyOccurrenceEdit(
      counted,
      'treino@2026-11-18',
      'proximas',
      draftOf(counted, 'treino@2026-11-18', { title: 'Depois' }),
      newId,
      CREATED,
    );
    expect(s.events[1]?.recurrence?.end).toEqual({ kind: 'apos', count: 3 });
    expect(titles(s, { from: '2026-11-01', to: '2027-01-31' })).toHaveLength(5);
  });

  it('excluir “esta e as próximas” e “todas”', () => {
    let s = setOccurrenceStatus(base(), 'treino@2026-11-25', 'concluido');
    s = deleteOccurrence(s, 'treino@2026-11-23', 'proximas');
    expect(titles(s)).toHaveLength(3);
    expect(s.exceptions).toEqual([]);
    expect(deleteOccurrence(base(), 'treino@2026-11-18', 'todas').events).toEqual([]);
    expect(deleteOccurrence(base(), 'treino@2026-11-11', 'proximas').events).toEqual([]);
  });

  it('tirar a repetição remove as exceções; pôr de novo começa limpo', () => {
    let s = setOccurrenceStatus(base(), 'treino@2026-11-16', 'concluido');
    s = setRecurrence(s, 'treino', null);
    expect(s.events[0]).not.toHaveProperty('recurrence');
    expect(s.exceptions).toEqual([]);
    s = setRecurrence(s, 'treino', { freq: 'diaria', interval: 2, end: { kind: 'nunca' } });
    expect(view(s)).toHaveLength(10);
  });
});

describe('store: ids de ocorrência', () => {
  it('concluir e marcar subtarefa por id de ocorrência gravam exceções; desfazer restaura', () => {
    const { repo } = memoryRepo();
    repo.replaceAll(base());
    const store = createDataStore(repo);
    const before = store.getState().snapshot();
    store.getState().setEventStatus('treino@2026-11-16', 'concluido');
    store.getState().toggleSubtask('treino@2026-11-18', 'co');
    expect(store.getState().exceptions.map((e) => e.id)).toEqual([
      'treino@2026-11-16',
      'treino@2026-11-18',
    ]);
    // Avulsos continuam como antes.
    expect(store.getState().events[0]?.status).toBe('pendente');
    store.getState().replaceAll(before);
    expect(store.getState().exceptions).toEqual([]);
  });

  it('excluir a série pelo fluxo antigo também leva as exceções', () => {
    const { repo } = memoryRepo();
    repo.replaceAll(setOccurrenceStatus(base(), 'treino@2026-11-16', 'concluido'));
    const store = createDataStore(repo);
    store.getState().deleteEvent('treino');
    expect(store.getState().exceptions).toEqual([]);
  });
});
