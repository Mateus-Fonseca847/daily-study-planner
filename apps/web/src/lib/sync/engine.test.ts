import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialSnapshot, type DataSnapshot } from '@daily/shared';
import { DATA_VERSION } from '../data/envelope';
import { subject } from '../data/test-utils';
import {
  createSyncEngine,
  type CloudApi,
  type CloudRow,
  type MetaStore,
  type SyncStatus,
} from './engine';
import { canonicalJson } from './canonical';
import type { SyncMeta } from './reconcile';

function fakeCloud(initial: { data: unknown; version?: number } | null = null) {
  let row: CloudRow | null = initial
    ? { revision: 1, version: initial.version ?? DATA_VERSION, data: initial.data, updatedAt: 't' }
    : null;
  const calls = { insert: 0, update: 0, fetch: 0 };
  const api: CloudApi = {
    fetch: async () => {
      calls.fetch += 1;
      return row;
    },
    insert: async (data, version) => {
      calls.insert += 1;
      if (row) return 'conflict';
      row = { revision: 1, version, data: structuredClone(data), updatedAt: 't' };
      return row;
    },
    update: async (expected, data, version) => {
      calls.update += 1;
      if (!row || row.revision !== expected) return 'conflict';
      row = { revision: row.revision + 1, version, data: structuredClone(data), updatedAt: 't' };
      return row;
    },
  };
  return {
    api,
    calls,
    get row() {
      return row;
    },
    set: (r: CloudRow | null) => (row = r),
  };
}

function setup(
  cloud: ReturnType<typeof fakeCloud>,
  local = createInitialSnapshot(),
  meta: SyncMeta | null = null,
) {
  let snap: DataSnapshot = local;
  const listeners = new Set<() => void>();
  let stored = meta;
  const metaStore: MetaStore = { read: () => stored, write: (m) => (stored = m) };
  const status: Partial<SyncStatus>[] = [];
  const copies: DataSnapshot[] = [];
  const engine = createSyncEngine({
    api: cloud.api,
    local: {
      snapshot: () => snap,
      replace: (s) => {
        snap = s;
        listeners.forEach((l) => l());
      },
      subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
    },
    meta: metaStore,
    report: (p) => status.push(p),
    saveSafetyCopy: (s) => copies.push(s),
    fingerprint: async (v) => canonicalJson(v),
    debounceMs: 100,
    retryMs: 1000,
  });
  const edit = (next: DataSnapshot) => {
    snap = next;
    listeners.forEach((l) => l());
  };
  return {
    engine,
    edit,
    status,
    copies,
    get snap() {
      return snap;
    },
    get meta() {
      return stored;
    },
  };
}

const withSubject = (id: string): DataSnapshot => ({
  ...createInitialSnapshot(),
  subjects: [subject(id)],
});
/** Deixa o SHA-256 (assíncrono de verdade) terminar antes de avançar o relógio falso. */
const tick = () => new Promise<void>((r) => setImmediate(r));
const settle = async () => {
  for (let i = 0; i < 25; i += 1) await tick();
};
const last = (s: Partial<SyncStatus>[]) => s.filter((p) => p.phase).at(-1)?.phase;

describe('createSyncEngine', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('nuvem vazia: sobe os dados locais', async () => {
    const cloud = fakeCloud();
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    expect(cloud.calls.insert).toBe(1);
    expect(cloud.row?.revision).toBe(1);
    expect(t.meta?.revision).toBe(1);
    expect(last(t.status)).toBe('synced');
  });

  it('primeiro login com local virgem: baixa a nuvem sem apagar nada local relevante', async () => {
    const cloud = fakeCloud({ data: withSubject('nuvem') });
    const t = setup(cloud);
    await t.engine.start();
    expect(t.snap.subjects.map((s) => s.id)).toEqual(['nuvem']);
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('dados nos dois lados no primeiro login: pausa em conflito sem escrever', async () => {
    const cloud = fakeCloud({ data: withSubject('nuvem') });
    const t = setup(cloud, withSubject('local'));
    await t.engine.start();
    expect(last(t.status)).toBe('conflict');
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
    expect(t.snap.subjects[0]?.id).toBe('local');
  });

  it('conflito → usar a nuvem guarda cópia de segurança do local', async () => {
    const cloud = fakeCloud({ data: withSubject('nuvem') });
    const t = setup(cloud, withSubject('local'));
    await t.engine.start();
    await t.engine.resolveConflict('cloud');
    expect(t.snap.subjects[0]?.id).toBe('nuvem');
    expect(t.copies[0]?.subjects[0]?.id).toBe('local');
    expect(last(t.status)).toBe('synced');
  });

  it('conflito → usar este dispositivo sobrescreve a nuvem', async () => {
    const cloud = fakeCloud({ data: withSubject('nuvem') });
    const t = setup(cloud, withSubject('local'));
    await t.engine.start();
    await t.engine.resolveConflict('device');
    expect((cloud.row?.data as DataSnapshot).subjects[0]?.id).toBe('local');
    expect(cloud.row?.revision).toBe(2);
  });

  it('edição local depois de sincronizar: envia após o debounce, uma vez', async () => {
    const cloud = fakeCloud();
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    t.edit(withSubject('b'));
    t.edit(withSubject('c'));
    await settle();
    await vi.advanceTimersByTimeAsync(150);
    await settle();
    expect(cloud.calls.update).toBe(1);
    expect((cloud.row?.data as DataSnapshot).subjects[0]?.id).toBe('c');
  });

  it('aplicar dados da nuvem não dispara novo envio (sem eco)', async () => {
    const cloud = fakeCloud({ data: withSubject('nuvem') });
    const t = setup(cloud);
    await t.engine.start();
    await settle();
    await vi.advanceTimersByTimeAsync(500);
    await settle();
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('nuvem mudou em outro dispositivo e o local não: puxa', async () => {
    const cloud = fakeCloud();
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    cloud.set({ revision: 2, version: DATA_VERSION, data: withSubject('outro'), updatedAt: 't' });
    await t.engine.flush();
    expect(t.snap.subjects[0]?.id).toBe('outro');
  });

  it('revisão defasada no envio (corrida): refaz o ciclo e termina em conflito, sem perder dados', async () => {
    const cloud = fakeCloud();
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    t.edit(withSubject('b'));
    cloud.set({ revision: 2, version: DATA_VERSION, data: withSubject('outro'), updatedAt: 't' });
    await settle();
    await vi.advanceTimersByTimeAsync(150);
    await settle();
    expect(last(t.status)).toBe('conflict');
    expect((cloud.row?.data as DataSnapshot).subjects[0]?.id).toBe('outro');
    expect(t.snap.subjects[0]?.id).toBe('b');
  });

  it('nuvem em versão mais nova do app: bloqueia e não escreve', async () => {
    const cloud = fakeCloud({ data: withSubject('x'), version: DATA_VERSION + 1 });
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    expect(last(t.status)).toBe('outdated');
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('dados inválidos na nuvem: erro e nada é sobrescrito', async () => {
    const cloud = fakeCloud({ data: { lixo: true } });
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    expect(last(t.status)).toBe('error');
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('falha de rede: marca erro e tenta de novo depois', async () => {
    const cloud = fakeCloud();
    let fail = true;
    const original = cloud.api.fetch;
    cloud.api.fetch = async () => {
      if (fail) throw new Error('rede');
      return original();
    };
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    expect(last(t.status)).toBe('error');
    fail = false;
    await settle();
    await vi.advanceTimersByTimeAsync(1100);
    await settle();
    expect(last(t.status)).toBe('synced');
    expect(cloud.calls.insert).toBe(1);
  });

  it('isDirty reflete alterações não enviadas', async () => {
    const cloud = fakeCloud();
    const t = setup(cloud, withSubject('a'));
    await t.engine.start();
    expect(await t.engine.isDirty()).toBe(false);
    t.edit(withSubject('b'));
    expect(await t.engine.isDirty()).toBe(true);
  });
});
