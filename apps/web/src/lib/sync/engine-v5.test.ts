import { DATA_VERSION } from '../data/envelope';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialSnapshot, type DataSnapshot } from '@daily/shared';
import { parseEnvelope } from '../data/envelope';
import { createDataStore } from '../data/store';
import { memoryRepo, task } from '../data/test-utils';
import { canonicalJson } from './canonical';
import { fakeCloud, last, settle, setup, withSubject } from './test-helpers';

/** O que um app v4 gravou: sem a coleção `exceptions` (e sem recorrência). */
const { exceptions: _ex, ...v4Base } = createInitialSnapshot();
void _ex;
const v4Cloud = { ...v4Base, events: [task('t1')], onboarding: { waterHabitCreated: true } };

const migrated = (version: number, data: unknown): DataSnapshot => {
  const result = parseEnvelope(JSON.stringify({ version, data }), new Date());
  if (!result.ok) throw new Error(result.error);
  return result.snapshot;
};
const withExtra = (s: DataSnapshot): DataSnapshot => ({
  ...s,
  subjects: [...s.subjects, { id: 'nova', name: 'Nova', color: 'rosa' }],
});

describe('sincronização com o formato v5', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('(a) nuvem v4 é baixada e migrada; só uma edição real grava v5', async () => {
    const cloud = fakeCloud({ data: v4Cloud, version: 4 });
    const t = setup(cloud);
    await t.engine.start();
    expect(last(t.status)).toBe('synced');
    expect(t.snap.exceptions).toEqual([]);
    expect(t.snap.events.map((e) => e.id)).toEqual(['t1']);
    await settle();
    await vi.advanceTimersByTimeAsync(500);
    await settle();
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
    expect(cloud.row).toMatchObject({ revision: 1, version: 4 });

    t.edit(withExtra(t.snap));
    await settle();
    await vi.advanceTimersByTimeAsync(150);
    await settle();
    expect(cloud.row).toMatchObject({ revision: 2, version: DATA_VERSION });
  });

  it('(b) atualizar de v4 para v5 sem edições: sem conflito falso nem escrita (usa daily:v4:pre-v5)', async () => {
    const cloud = fakeCloud({ data: v4Cloud, version: 4 });
    // Outro dispositivo mudou a nuvem depois: sem o rebase, isso viraria conflito.
    const remote = withExtra(migrated(4, v4Cloud));
    cloud.set({ revision: 2, version: DATA_VERSION, data: remote, updatedAt: 't' });
    const asked: number[] = [];
    const t = setup(
      cloud,
      migrated(4, v4Cloud),
      { revision: 1, hash: canonicalJson(v4Cloud), version: 4 },
      {
        legacySynced: (version) => {
          asked.push(version);
          return version === 4 ? { version: 4, data: v4Cloud } : null;
        },
      },
    );
    await t.engine.start();
    expect(asked).toEqual([4]);
    expect(last(t.status)).toBe('synced');
    expect(t.snap.subjects.map((s) => s.id)).toContain('nova');
    expect(cloud.calls.update).toBe(0);
    expect(t.meta).toMatchObject({ revision: 2, version: DATA_VERSION });
  });

  it('(b) dispositivo que pula do v3 direto para o v5 também não vê conflito falso', async () => {
    const { exceptions: _e, restDays: _r, onboarding: _o, ...v3 } = createInitialSnapshot();
    void _e;
    void _r;
    void _o;
    const v3Data = { ...v3, events: [], subjects: [{ id: 'mat', name: 'Mat', color: 'azul' }] };
    const local = migrated(3, v3Data);
    const cloud = fakeCloud({ data: v3Data, version: 3 });
    cloud.set({ revision: 2, version: DATA_VERSION, data: withExtra(local), updatedAt: 't' });
    const t = setup(
      cloud,
      local,
      { revision: 1, hash: canonicalJson(v3Data) },
      {
        legacySynced: (version) => (version === 3 ? { version: 3, data: v3Data } : null),
      },
    );
    await t.engine.start();
    expect(last(t.status)).toBe('synced');
    expect(cloud.calls.update).toBe(0);
  });

  it('(c) edição local depois de atualizar e nuvem mudada em outro lugar: conflito real', async () => {
    const cloud = fakeCloud({ data: v4Cloud, version: 4 });
    const other = { ...migrated(4, v4Cloud), preferences: { ...v4Cloud.preferences, name: 'Bia' } };
    cloud.set({ revision: 2, version: DATA_VERSION, data: other, updatedAt: 't' });
    const t = setup(
      cloud,
      withExtra(migrated(4, v4Cloud)),
      { revision: 1, hash: canonicalJson(v4Cloud), version: 4 },
      { legacySynced: () => ({ version: 4, data: v4Cloud }) },
    );
    await t.engine.start();
    expect(last(t.status)).toBe('conflict');
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('(d) dispositivo novo só com a água automática baixa a nuvem v4', async () => {
    const { repo } = memoryRepo();
    const store = createDataStore(repo);
    store.getState().ensureWaterHabit(new Date(2026, 10, 13));
    const cloud = fakeCloud({ data: v4Cloud, version: 4 });
    const t = setup(cloud, store.getState().snapshot());
    await t.engine.start();
    expect(last(t.status)).toBe('synced');
    expect(t.snap.events.map((e) => e.id)).toEqual(['t1']);
  });

  it('(e) app v4 em cache diante de uma nuvem v5: bloqueia e não escreve', async () => {
    const cloud = fakeCloud({ data: withSubject('nuvem'), version: DATA_VERSION });
    const old = setup(
      cloud,
      withSubject('antigo'),
      { revision: 1, hash: 'x', version: 4 },
      { dataVersion: 4 },
    );
    await old.engine.start();
    expect(last(old.status)).toBe('outdated');
    old.edit(withSubject('antigo-2'));
    await settle();
    await vi.advanceTimersByTimeAsync(500);
    await old.engine.flush();
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('(e) corrida: o v5 grava entre a leitura e o envio do app v4, que para sem sobrescrever', async () => {
    const cloud = fakeCloud({ data: withSubject('base'), version: 4 });
    const fetch = cloud.api.fetch;
    let first = true;
    cloud.api.fetch = async () => {
      const row = await fetch();
      if (first) {
        first = false;
        cloud.set({ revision: 2, version: DATA_VERSION, data: withSubject('v5'), updatedAt: 't' });
      }
      return row;
    };
    const old = setup(
      cloud,
      createInitialSnapshot(),
      { revision: 1, hash: 'antigo', version: 4 },
      { dataVersion: 4 },
    );
    old.edit(withSubject('antigo'));
    await old.engine.start();
    await settle();
    expect(last(old.status)).toBe('outdated');
    expect(cloud.row).toMatchObject({ revision: 2, version: DATA_VERSION });
  });
});
