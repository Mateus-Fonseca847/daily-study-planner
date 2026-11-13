import { createInitialSnapshot, type DataSnapshot } from '@daily/shared';
import { DATA_VERSION } from '../data/envelope';
import { subject } from '../data/test-utils';
import {
  createSyncEngine,
  type CloudApi,
  type CloudRow,
  type EngineDeps,
  type MetaStore,
  type SyncStatus,
} from './engine';
import { canonicalJson } from './canonical';
import type { SyncMeta } from './reconcile';

/** Utilitários dos testes de sincronização (nuvem falsa em memória e engine montado). */

export function fakeCloud(initial: { data: unknown; version?: number } | null = null) {
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

export function setup(
  cloud: ReturnType<typeof fakeCloud>,
  local = createInitialSnapshot(),
  meta: SyncMeta | null = null,
  extra: Partial<EngineDeps> = {},
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
    ...extra,
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

export const withSubject = (id: string): DataSnapshot => ({
  ...createInitialSnapshot(),
  subjects: [subject(id)],
});
/** Deixa o SHA-256 (assíncrono de verdade) terminar antes de avançar o relógio falso. */
export const tick = () => new Promise<void>((r) => setImmediate(r));
export const settle = async () => {
  for (let i = 0; i < 25; i += 1) await tick();
};
export const last = (s: Partial<SyncStatus>[]) => s.filter((p) => p.phase).at(-1)?.phase;
