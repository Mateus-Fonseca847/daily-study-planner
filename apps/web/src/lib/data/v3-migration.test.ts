import { describe, expect, it } from 'vitest';
import { EVERY_DAY } from '@daily/shared';
import { readBackupFile } from './backup';
import { parseEnvelope } from './envelope';
import {
  LEGACY_V2_KEY,
  LocalStorageRepository,
  MemoryStorage,
  PRE_V3_KEY,
  STORAGE_KEY,
} from './local-storage-repository';
import { FIXED_NOW } from './test-utils';

/** Dado salvo no formato v2, com metas (uma arquivada, uma com ícone desconhecido) e registros. */
const v2Data = {
  subjects: [],
  events: [],
  preferences: {
    name: 'Leo',
    waterGoalMl: 2500,
    cupMl: 250,
    focusDurationSec: 1500,
    lockByDefault: false,
  },
  goals: [
    {
      id: 'goal-sleep',
      title: 'Dormir 7h',
      icon: 'moon',
      kind: 'manual',
      order: 0,
      createdAt: '2026-09-01T08:00:00',
      archivedAt: null,
    },
    {
      id: 'goal-water',
      title: 'Beber água',
      icon: 'droplets',
      kind: 'auto-agua',
      order: 1,
      createdAt: '2026-09-01T08:00:00',
      archivedAt: null,
    },
    {
      id: 'goal-old',
      title: 'Ler',
      icon: 'book-open',
      kind: 'manual',
      order: 2,
      createdAt: '2026-09-10T08:00:00',
      archivedAt: '2026-10-05T09:00:00',
    },
    {
      id: 'goal-study',
      title: 'Blocos de hoje',
      icon: 'target',
      kind: 'auto-estudo',
      order: 3,
      createdAt: '2026-09-01T08:00:00',
      archivedAt: null,
    },
  ],
  goalLogs: [
    { id: 'goal-sleep:2026-10-01', goalId: 'goal-sleep', date: '2026-10-01', done: true },
    { id: 'goal-sleep:2026-10-02', goalId: 'goal-sleep', date: '2026-10-02', done: false },
    { id: 'goal-old:2026-10-01', goalId: 'goal-old', date: '2026-10-01', done: true },
  ],
  waterLogs: [{ id: 'w1', date: '2026-10-01', ml: 250, time: '09:00' }],
  focusSessions: [],
};
const v2Raw = JSON.stringify({
  app: 'daily',
  version: 2,
  savedAt: '2026-10-10T00:00:00.000Z',
  data: v2Data,
});

describe('migração v2 → v3', () => {
  const migrated = () => {
    const result = parseEnvelope(v2Raw, FIXED_NOW);
    if (!result.ok) throw new Error(result.error);
    return result;
  };

  it('cada meta vira um hábito, preservando título, datas, ordem e arquivamento', () => {
    const { snapshot, migratedFrom } = migrated();
    expect(migratedFrom).toBe(2);
    expect(snapshot.habits.map((h) => [h.id, h.name, h.order])).toEqual([
      ['goal-sleep', 'Dormir 7h', 0],
      ['goal-water', 'Beber água', 1],
      ['goal-old', 'Ler', 2],
      ['goal-study', 'Blocos de hoje', 3],
    ]);
    const old = snapshot.habits.find((h) => h.id === 'goal-old');
    expect(old?.archivedAt).toBe('2026-10-05T09:00:00');
    expect(old?.createdAt).toBe('2026-09-10T08:00:00');
    expect(old?.rules[0]?.since).toBe('2026-09-10');
    expect(snapshot.preferences.name).toBe('Leo');
    expect(snapshot.waterLogs).toHaveLength(1);
    expect('goals' in snapshot).toBe(false);
  });

  it('tipo, fonte, unidade e meta seguem o tipo da meta antiga', () => {
    const habits = migrated().snapshot.habits;
    expect(habits.find((h) => h.id === 'goal-sleep')).toMatchObject({
      type: 'check',
      source: 'manual',
      unit: '',
    });
    expect(habits.find((h) => h.id === 'goal-sleep')?.rules[0]?.repeat).toEqual(EVERY_DAY);
    expect(habits.find((h) => h.id === 'goal-water')).toMatchObject({
      type: 'quantidade',
      source: 'agua',
      unit: 'ml',
    });
    expect(habits.find((h) => h.id === 'goal-water')?.rules[0]?.target).toBe(2500); // meta de água das preferências
    expect(habits.find((h) => h.id === 'goal-study')).toMatchObject({
      type: 'check',
      source: 'blocos',
    });
  });

  it('ícone fora do conjunto usa o padrão e as cores são distribuídas pela paleta', () => {
    const habits = migrated().snapshot.habits;
    expect(habits.find((h) => h.id === 'goal-study')?.icon).toBe('target');
    expect(habits.find((h) => h.id === 'goal-sleep')?.icon).toBe('moon');
    expect(new Set(habits.map((h) => h.color)).size).toBe(4);
  });

  it('registros de meta viram registros de hábito com valor 1 ou 0, sem perder nenhum', () => {
    const { snapshot } = migrated();
    expect(snapshot.habitLogs.map((l) => [l.id, l.habitId, l.value])).toEqual([
      ['goal-sleep:2026-10-01', 'goal-sleep', 1],
      ['goal-sleep:2026-10-02', 'goal-sleep', 0],
      ['goal-old:2026-10-01', 'goal-old', 1],
    ]);
  });

  it('é idempotente: migrar o resultado de novo não muda nada', () => {
    const first = migrated().snapshot;
    const again = parseEnvelope(
      JSON.stringify({ app: 'daily', version: 3, savedAt: 'x', data: first }),
      FIXED_NOW,
    );
    expect(again.ok && again.snapshot).toEqual(first);
    expect(again.ok && again.migratedFrom).toBeNull();
  });

  it('dado v2 ilegível segue o fluxo de corrupção (aviso), sem inventar hábitos', () => {
    const broken = JSON.stringify({
      version: 2,
      data: { ...v2Data, goals: [{ id: 'x', title: '' }] },
    });
    expect(parseEnvelope(broken, FIXED_NOW).ok).toBe(false);
  });
});

describe('repositório: do v2 salvo para o v3', () => {
  it('migra ao abrir, guarda o v2 original em daily:v2:pre-v3 e regrava em daily:v3', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V2_KEY, v2Raw);
    const repo = new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    expect(repo.issue).toBeNull();
    expect(repo.habits.list()).toHaveLength(4);
    expect(storage.getItem(PRE_V3_KEY)).toBe(v2Raw);
    expect(storage.getItem(LEGACY_V2_KEY)).toBe(v2Raw); // o v2 nunca é alterado
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').version).toBe(3);
  });

  it('com o v3 presente, o v2 é ignorado', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V2_KEY, v2Raw);
    new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    const reopened = new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    reopened.habits.update('goal-sleep', { name: 'Dormir cedo' });
    expect(new LocalStorageRepository(storage).habits.get('goal-sleep')?.name).toBe('Dormir cedo');
  });
});

describe('importação v1, v2 e v3', () => {
  it('aceita um arquivo v2 e devolve hábitos', () => {
    const result = readBackupFile(v2Raw, FIXED_NOW);
    expect(result.ok && result.migratedFrom).toBe(2);
    expect(result.ok && result.snapshot.habits).toHaveLength(4);
  });

  it('rejeita versão do futuro e hábito com regra inválida', () => {
    expect(readBackupFile(JSON.stringify({ version: 4, data: {} })).ok).toBe(false);
    const bad = JSON.stringify({
      version: 3,
      data: {
        subjects: [],
        events: [],
        preferences: v2Data.preferences,
        habits: [
          {
            id: 'h',
            name: 'X',
            icon: 'target',
            color: 'azul',
            type: 'quantidade',
            unit: 'ml',
            source: 'manual',
            rules: [
              { since: '2026-10-01', repeat: { kind: 'a-cada-n-dias', interval: 1 }, target: 5 },
            ],
            createdAt: '2026-10-01T08:00:00',
            order: 0,
          },
        ],
        habitLogs: [],
        waterLogs: [],
        focusSessions: [],
      },
    });
    expect(readBackupFile(bad).ok).toBe(false);
  });
});
