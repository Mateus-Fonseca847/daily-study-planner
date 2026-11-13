import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialSnapshot, type DataSnapshot } from '@daily/shared';
import { createDataStore } from '../data/store';
import { memoryRepo } from '../data/test-utils';
import { fakeCloud, last, settle, setup, withSubject } from './test-helpers';

/** O que um app v3 gravou na nuvem: tipos, status e cores antigos, conteúdos de prova. */
const v3Cloud = {
  subjects: [{ id: 'mat', name: 'Matemática', color: 'azul' }],
  events: [
    {
      id: 'p',
      type: 'prova',
      title: 'Prova',
      start: '2026-11-20T08:00:00',
      end: '2026-11-20T10:00:00',
      subjectId: 'mat',
      status: 'em-andamento',
      notes: '',
      contents: [{ id: 'c1', title: 'Limites', done: true, order: 0 }],
    },
    {
      id: 'b',
      type: 'estudo',
      title: 'Bloco',
      start: '2026-11-19T14:00:00',
      end: '2026-11-19T15:00:00',
      subjectId: 'mat',
      status: 'pendente',
      notes: '',
      examId: 'p',
    },
  ],
  preferences: {
    name: '',
    waterGoalMl: 2000,
    cupMl: 250,
    focusDurationSec: 1500,
    lockByDefault: false,
  },
  habits: [],
  habitLogs: [],
  waterLogs: [],
  focusSessions: [],
};

/** Local de um dispositivo novo que já criou o hábito de água automático. */
function deviceWithAutoWater(): DataSnapshot {
  const { repo } = memoryRepo();
  const store = createDataStore(repo);
  store.getState().ensureWaterHabit(new Date(2026, 10, 13, 9, 0));
  return store.getState().snapshot();
}

describe('sincronização com o formato v4', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('(a) nuvem v3 é baixada e migrada; a nuvem não é reescrita só por migrar', async () => {
    const cloud = fakeCloud({ data: v3Cloud, version: 3 });
    const t = setup(cloud);
    await t.engine.start();
    expect(last(t.status)).toBe('synced');
    expect(t.snap.events.map((e) => [e.id, e.type, e.status])).toEqual([
      ['p', 'prova', 'pendente'],
      ['b', 'tarefa', 'pendente'],
    ]);
    expect(t.snap.events[0]?.subtasks).toEqual([
      { id: 'c1', title: 'Limites', done: true, order: 0 },
    ]);
    expect(t.snap.subjects[0]?.color).toBe('petroleo');
    expect(t.snap.onboarding.waterHabitCreated).toBe(true);
    // Sem edição real, nada é enviado: a linha continua v3 na revisão 1.
    await settle();
    await vi.advanceTimersByTimeAsync(500);
    await settle();
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
    expect(cloud.row).toMatchObject({ revision: 1, version: 3 });
  });

  it('(a) a primeira edição real grava a nuvem já no v4', async () => {
    const cloud = fakeCloud({ data: v3Cloud, version: 3 });
    const t = setup(cloud);
    await t.engine.start();
    t.edit({
      ...t.snap,
      subjects: [...t.snap.subjects, { id: 'fis', name: 'Física', color: 'ciano' }],
    });
    await settle();
    await vi.advanceTimersByTimeAsync(150);
    await settle();
    expect(cloud.calls.update).toBe(1);
    expect(cloud.row).toMatchObject({ revision: 2, version: 4 });
  });

  it('(d) dispositivo novo com só o hábito de água automático conta como vazio: baixa a nuvem', async () => {
    const local = deviceWithAutoWater();
    expect(local.habits).toHaveLength(1);
    const cloud = fakeCloud({ data: v3Cloud, version: 3 });
    const t = setup(cloud, local);
    await t.engine.start();
    expect(last(t.status)).toBe('synced');
    expect(t.snap.events).toHaveLength(2);
    // A água local some (a conta já tinha dados) e não volta: a marca veio da nuvem migrada.
    expect(t.snap.habits).toEqual([]);
    expect(t.snap.onboarding.waterHabitCreated).toBe(true);
  });

  it('(d) com um dado de verdade além da água, o primeiro login pede para escolher', async () => {
    const local = { ...deviceWithAutoWater(), subjects: withSubject('local').subjects };
    const cloud = fakeCloud({ data: v3Cloud, version: 3 });
    const t = setup(cloud, local);
    await t.engine.start();
    expect(last(t.status)).toBe('conflict');
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('(d) conta nova (nuvem vazia): sobe o local com a água automática', async () => {
    const cloud = fakeCloud();
    const t = setup(cloud, deviceWithAutoWater());
    await t.engine.start();
    expect(cloud.calls.insert).toBe(1);
    expect((cloud.row?.data as DataSnapshot).habits[0]?.source).toBe('agua');
  });

  it('(e) app antigo (v3) diante de uma nuvem v4: bloqueia, avisa e não escreve', async () => {
    const cloud = fakeCloud({ data: withSubject('nuvem'), version: 4 });
    const old = setup(cloud, withSubject('antigo'), { revision: 1, hash: 'x' }, { dataVersion: 3 });
    await old.engine.start();
    expect(last(old.status)).toBe('outdated');
    old.edit(withSubject('antigo-2'));
    await settle();
    await vi.advanceTimersByTimeAsync(500);
    await old.engine.flush();
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
    expect(cloud.row).toMatchObject({ revision: 1, version: 4 });
  });

  it('(e) corrida: o v4 grava entre a leitura e o envio do app antigo, que para sem sobrescrever', async () => {
    // O app antigo entende o que está na nuvem (a versão dele): aqui, um snapshot simples.
    const cloud = fakeCloud({ data: withSubject('base'), version: 3 });
    const oldMeta = { revision: 1, hash: 'antigo' };
    const old = setup(cloud, createInitialSnapshot(), oldMeta, { dataVersion: 3 });
    // O app antigo lê a nuvem (v3, revisão 1)…
    const fetch = cloud.api.fetch;
    let first = true;
    cloud.api.fetch = async () => {
      const row = await fetch();
      if (first) {
        first = false;
        // …e, antes de ele enviar, um dispositivo atualizado grava o v4 (revisão 2).
        cloud.set({ revision: 2, version: 4, data: withSubject('v4'), updatedAt: 't' });
      }
      return row;
    };
    old.edit(withSubject('antigo'));
    await old.engine.start();
    await settle();
    expect(last(old.status)).toBe('outdated');
    expect(cloud.row).toMatchObject({ revision: 2, version: 4 });
    expect((cloud.row?.data as DataSnapshot).subjects[0]?.id).toBe('v4');
  });
});
