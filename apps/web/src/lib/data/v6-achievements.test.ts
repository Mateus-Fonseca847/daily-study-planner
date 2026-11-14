import { describe, expect, it } from 'vitest';
import {
  dataSnapshotSchema,
  isPristineSnapshot,
  createInitialSnapshot,
  type Achievement,
  type DataSnapshot,
} from '@daily/shared';
import { readBackupFile } from './backup';
import { DATA_VERSION, parseEnvelope, serializeEnvelope } from './envelope';
import {
  LEGACY_V5_KEY,
  LocalStorageRepository,
  MemoryStorage,
  PRE_V6_KEY,
  STORAGE_KEY,
} from './local-storage-repository';
import { createDataStore } from './store';
import { FIXED_NOW, makeSnapshot, memoryRepo, task } from './test-utils';

const AT = '2026-11-10T10:30:00';
const medal = (id: string, levels: string[], featured = false): Achievement => ({
  id,
  level: levels.length,
  levels,
  featured,
});
const v5 = () => {
  const {
    achievements: _a,
    onboarding,
    ...rest
  } = dataSnapshotSchema.parse(makeSnapshot({ events: [task('a')] }));
  void _a;
  return { ...rest, onboarding: { waterHabitCreated: onboarding.waterHabitCreated } };
};

describe('migração v5 → v6 (medalhas)', () => {
  const raw = JSON.stringify({ app: 'daily', version: 5, data: v5() });

  it('acrescenta a coleção vazia e deixa a concessão retroativa pendente (idempotente)', () => {
    const result = parseEnvelope(raw, FIXED_NOW);
    if (!result.ok) throw new Error(result.error);
    expect(result.migratedFrom).toBe(5);
    expect(result.snapshot.achievements).toEqual([]);
    expect(result.snapshot.onboarding.achievementsSeededAt).toBeNull();
    expect(result.snapshot.events).toEqual(dataSnapshotSchema.parse(v5()).events);
    const again = parseEnvelope(
      JSON.stringify({ app: 'daily', version: DATA_VERSION, data: result.snapshot }),
      FIXED_NOW,
    );
    expect(again.ok && again.snapshot).toEqual(result.snapshot);
  });

  it('repositório: lê daily:v5, guarda daily:v5:pre-v6 e nunca reescreve daily:v5', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V5_KEY, raw);
    const repo = new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    expect(repo.issue).toBeNull();
    expect(storage.getItem(PRE_V6_KEY)).toBe(raw);
    expect(storage.getItem(LEGACY_V5_KEY)).toBe(raw);
    expect(STORAGE_KEY).toBe('daily:v6');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).version).toBe(6);
  });

  it('importa v1 a v6, exporta v6 e recusa v7', () => {
    expect(readBackupFile(raw).ok).toBe(true);
    const v6 = {
      ...dataSnapshotSchema.parse(makeSnapshot()),
      achievements: [medal('ritmo', [AT])],
    };
    const file = serializeEnvelope(dataSnapshotSchema.parse(v6), FIXED_NOW);
    expect(JSON.parse(file).version).toBe(6);
    const back = readBackupFile(file);
    expect(back.ok && back.snapshot.achievements).toEqual([medal('ritmo', [AT])]);
    expect(readBackupFile(JSON.stringify({ app: 'daily', version: 7, data: v6 })).ok).toBe(false);
    expect(
      readBackupFile(JSON.stringify({ version: 1, data: { subjects: [], events: [] } })).ok,
    ).toBe(true);
  });

  it('valida: ids repetidos e histórico de níveis que não bate são recusados; id desconhecido fica', () => {
    const base = dataSnapshotSchema.parse(makeSnapshot());
    const parse = (achievements: unknown) =>
      dataSnapshotSchema.safeParse({ ...base, achievements }).success;
    expect(parse([medal('futura-medalha', [AT])])).toBe(true);
    expect(parse([medal('ritmo', [AT]), medal('ritmo', [AT])])).toBe(false);
    expect(parse([{ id: 'ritmo', level: 2, levels: [AT], featured: false }])).toBe(false);
  });

  it('snapshot com medalha não é “virgem” (a nuvem não a apaga num dispositivo novo)', () => {
    const empty = createInitialSnapshot();
    expect(isPristineSnapshot(empty)).toBe(true);
    expect(isPristineSnapshot({ ...empty, achievements: [medal('ritmo', [AT])] })).toBe(false);
  });
});

describe('store: medalhas', () => {
  const store = (snapshot: Partial<DataSnapshot> = {}) => {
    const { repo } = memoryRepo();
    repo.replaceAll(dataSnapshotSchema.parse(makeSnapshot(snapshot)));
    return createDataStore(repo, () => 'id');
  };

  it('applyAchievements grava numa escrita: medalhas, marca retroativa e preparedAt', () => {
    const exam = task('p', {
      type: 'prova',
      start: '2026-12-01T08:00:00',
      end: '2026-12-01T10:00:00',
    });
    const s = store({ events: [exam] });
    s.getState().applyAchievements({
      changes: [medal('planejado', [AT])],
      seededAt: AT,
      prepared: [{ id: 'p', preparedAt: AT }],
    });
    const state = s.getState();
    expect(state.achievements).toEqual([medal('planejado', [AT])]);
    expect(state.onboarding.achievementsSeededAt).toBe(AT);
    expect(state.events[0]).toMatchObject({ preparedAt: AT });

    s.getState().applyAchievements({ changes: [], prepared: [{ id: 'p', preparedAt: null }] });
    expect(s.getState().events[0]).not.toHaveProperty('preparedAt');
  });

  it('subir de nível substitui o registro; nada é removido', () => {
    const s = store({ achievements: [medal('ritmo', [AT]), medal('hidratado', [AT])] });
    s.getState().applyAchievements({ changes: [medal('ritmo', [AT, AT])] });
    expect(s.getState().achievements).toEqual([medal('ritmo', [AT, AT]), medal('hidratado', [AT])]);
  });

  it('até 3 destaques: o 4º pede troca; com a troca, sai o escolhido', () => {
    const s = store({
      achievements: ['a', 'b', 'c', 'd'].map((id, i) => medal(id, [AT], i < 3)),
    });
    expect(s.getState().setAchievementFeatured('d', true)).toBe('limite');
    expect(s.getState().achievements.filter((a) => a.featured)).toHaveLength(3);
    expect(s.getState().setAchievementFeatured('d', true, 'a')).toBe('ok');
    expect(
      s
        .getState()
        .achievements.filter((a) => a.featured)
        .map((a) => a.id),
    ).toEqual(['b', 'c', 'd']);
    s.getState().setAchievementFeatured('b', false);
    expect(s.getState().achievements.find((a) => a.id === 'b')!.featured).toBe(false);
  });
});

describe('backup com o perfil social (fora de data)', () => {
  it('o campo social vai no topo do arquivo e a importação o ignora', async () => {
    const { createBackupFile } = await import('./backup');
    const snap = dataSnapshotSchema.parse(makeSnapshot());
    const file = createBackupFile(snap, FIXED_NOW, { perfil: { username: 'ana' } });
    const json = JSON.parse(file.content) as Record<string, unknown>;
    expect(json.social).toEqual({ perfil: { username: 'ana' } });
    expect(json.version).toBe(6);
    const back = readBackupFile(file.content);
    expect(back.ok && back.snapshot).toEqual(snap);
    expect(JSON.parse(createBackupFile(snap, FIXED_NOW).content)).not.toHaveProperty('social');
  });
});
