import { describe, expect, it } from 'vitest';
import type { ActiveFocus } from '@daily/shared';
import { createBackupFile, readBackupFile } from './backup';
import {
  FOCUS_KEY,
  LEGACY_KEY,
  LocalStorageRepository,
  MemoryStorage,
  PRE_MIGRATION_KEY,
  STORAGE_KEY,
} from './local-storage-repository';
import { createDataStore } from './store';
import { exam, FIXED_NOW, makeSnapshot, memoryRepo, snapshot, subject } from './test-utils';

/** Um arquivo/estado salvo no formato v1 (anterior ao Prompt 03). */
const v1Raw = JSON.stringify({
  app: 'daily',
  version: 1,
  savedAt: '2026-10-01T00:00:00.000Z',
  data: {
    subjects: [{ id: 'mat', name: 'Matemática', color: 'azul' }],
    events: [exam('e1', 'mat')],
  },
});

const active: ActiveFocus = {
  id: 'a1',
  status: 'rodando',
  durationSec: 1500,
  startedAtMs: 1_000,
  endsAtMs: 1_501_000,
  remainingMs: null,
  locked: true,
  link: { subjectId: null, examId: null, blockId: null },
  tabId: 'tab-1',
};

describe('primeiro acesso', () => {
  it('abre com preferências e as 4 metas padrão (criadas no relógio injetado)', () => {
    const { repo } = memoryRepo();
    const s = repo.snapshot();
    expect(s.preferences).toEqual({
      name: '',
      waterGoalMl: 2000,
      cupMl: 250,
      focusDurationSec: 1500,
      lockByDefault: false,
    });
    expect(s.goals).toHaveLength(4);
    expect(s.goals.every((g) => g.createdAt === '2026-11-01T12:00:00')).toBe(true);
    expect(s.goals.map((g) => g.kind)).toEqual(['manual', 'auto-agua', 'manual', 'auto-estudo']);
  });
});

describe('migração v1 → v2', () => {
  it('preserva tudo, cria preferências e metas e guarda o v1 original antes de migrar', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_KEY, v1Raw);
    const repo = new LocalStorageRepository(storage, { now: () => FIXED_NOW });

    expect(repo.issue).toBeNull();
    expect(repo.subjects.list().map((s) => s.name)).toEqual(['Matemática']);
    expect(repo.events.list().map((e) => e.id)).toEqual(['e1']);
    expect(repo.snapshot().goals).toHaveLength(4);
    expect(repo.snapshot().preferences.focusDurationSec).toBe(1500);

    expect(storage.getItem(PRE_MIGRATION_KEY)).toBe(v1Raw); // backup feito antes de migrar
    expect(storage.getItem(LEGACY_KEY)).toBe(v1Raw); // o v1 nunca é alterado
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').version).toBe(2);
  });

  it('só migra uma vez: com a chave v2 presente, o v1 é ignorado', () => {
    const { repo: first, storage } = memoryRepo();
    first.subjects.create({ name: 'Nova', color: 'rosa' });
    storage.setItem(LEGACY_KEY, v1Raw);
    const reopened = new LocalStorageRepository(storage);
    expect(reopened.subjects.list().map((s) => s.name)).toEqual(['Nova']);
  });

  it('um v1 corrompido vira aviso, sem perder o original', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_KEY, '{quebrado');
    const repo = new LocalStorageRepository(storage);
    expect(repo.issue).toMatchObject({ kind: 'corrupt' });
    expect(repo.snapshot().events).toEqual([]);
  });
});

describe('importar/exportar com v1 e v2', () => {
  it('aceita um arquivo v1 e o devolve já no formato v2', () => {
    const result = readBackupFile(v1Raw, FIXED_NOW);
    expect(result.ok && result.migratedFrom).toBe(1);
    expect(result.ok && result.snapshot.goals).toHaveLength(4);
    expect(result.ok && result.snapshot.events).toHaveLength(1);
  });

  it('aceita v2 e valida com zod (meta inexistente é rejeitada)', () => {
    const file = createBackupFile(snapshot(), FIXED_NOW);
    expect(JSON.parse(file.content).version).toBe(2);
    expect(readBackupFile(file.content).ok).toBe(true);

    const broken = JSON.parse(file.content);
    broken.data.goalLogs = [{ id: 'x:2026-11-01', goalId: 'x', date: '2026-11-01', done: true }];
    expect(readBackupFile(JSON.stringify(broken)).ok).toBe(false);
  });

  it('o histórico de sessões entra no arquivo; a sessão ativa não', () => {
    const { repo } = memoryRepo();
    repo.replaceAll(snapshot());
    repo.focusSessions.upsert({
      id: 's1',
      startedAt: '2026-11-01T10:00:00',
      plannedSec: 1500,
      actualSec: 1500,
      status: 'concluida',
      subjectId: 'mat',
      examId: null,
      blockId: null,
    });
    repo.focusActive.set(active);

    const content = createBackupFile(repo.snapshot(), FIXED_NOW).content;
    expect(content).toContain('"focusSessions"');
    expect(content).toContain('"s1"');
    expect(content).not.toContain('"tabId"');
    expect(content).not.toContain('endsAtMs');
  });
});

describe('sessão ativa e preferências no repositório', () => {
  it('a sessão ativa persiste numa chave própria e some ao ser limpa', () => {
    const { repo, storage } = memoryRepo();
    repo.focusActive.set(active);
    expect(storage.getItem(FOCUS_KEY)).not.toBeNull();
    expect(new LocalStorageRepository(storage).focusActive.get()).toEqual(active);
    repo.focusActive.set(null);
    expect(repo.focusActive.get()).toBeNull();
  });

  it('uma sessão ativa corrompida é ignorada (não quebra)', () => {
    const { repo, storage } = memoryRepo();
    storage.setItem(FOCUS_KEY, '{nada a ver');
    expect(repo.focusActive.get()).toBeNull();
    storage.setItem(FOCUS_KEY, JSON.stringify({ ...active, durationSec: 5 }));
    expect(repo.focusActive.get()).toBeNull();
  });

  it('atualiza preferências validando limites', () => {
    const { repo } = memoryRepo();
    expect(repo.preferences.update({ name: 'Ana', focusDurationSec: 50 * 60 + 30 })).toMatchObject({
      name: 'Ana',
      focusDurationSec: 3030,
    });
    expect(() => repo.preferences.update({ focusDurationSec: 500 * 60 })).toThrow();
    expect(repo.preferences.get().focusDurationSec).toBe(3030); // preserva segundos
  });

  it('upsert é idempotente (duas abas finalizando a mesma sessão)', () => {
    const { repo } = memoryRepo();
    const session = {
      id: 'dup',
      startedAt: '2026-11-01T10:00:00',
      plannedSec: 60,
      actualSec: 60,
      status: 'concluida' as const,
      subjectId: null,
      examId: null,
      blockId: null,
    };
    repo.focusSessions.upsert(session);
    repo.focusSessions.upsert(session);
    expect(repo.focusSessions.list()).toHaveLength(1);
  });
});

describe('sincronização entre abas', () => {
  it('reload reflete o que outra aba gravou (última escrita vence)', () => {
    const storage = new MemoryStorage();
    const tabA = memoryRepo(storage).repo;
    const tabB = memoryRepo(storage).repo;
    const storeA = createDataStore(tabA);

    tabB.subjects.create({ name: 'Criada na aba B', color: 'verde' });
    tabB.preferences.update({ name: 'Bia' });
    expect(storeA.getState().subjects).toHaveLength(0);

    storeA.getState().reload(); // o que o listener do evento `storage` faz
    expect(storeA.getState().subjects.map((s) => s.name)).toEqual(['Criada na aba B']);
    expect(storeA.getState().preferences.name).toBe('Bia');
  });

  it('reload também traz a sessão de foco ativa da outra aba', () => {
    const storage = new MemoryStorage();
    const storeA = createDataStore(memoryRepo(storage).repo);
    memoryRepo(storage).repo.focusActive.set(active);
    storeA.getState().reload();
    expect(storeA.getState().focusActive).toEqual(active);
  });

  it('o store expõe preferências, metas e sessões', () => {
    const { repo } = memoryRepo();
    repo.replaceAll(makeSnapshot({ subjects: [subject('mat')] }));
    const store = createDataStore(repo);
    store.getState().updatePreferences({ name: 'Leo' });
    store.getState().setFocusActive(active);
    expect(store.getState().preferences.name).toBe('Leo');
    expect(store.getState().focusActive?.id).toBe('a1');
    expect(store.getState().goals).toHaveLength(4);
  });
});
