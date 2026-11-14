import { describe, expect, it } from 'vitest';
import { dataSnapshotSchema, DEFAULT_PREFERENCES } from '@daily/shared';
import { COLOR_V3_TO_V4, DATA_VERSION, migrateData, parseEnvelope, remapColors } from './envelope';
import {
  LEGACY_RETENTION_DAYS,
  LEGACY_V3_KEY,
  LocalStorageRepository,
  MemoryStorage,
  MIGRATED_AT_KEY,
  PRE_V4_KEY,
  STORAGE_KEY,
} from './local-storage-repository';
import { readBackupFile } from './backup';
import { FIXED_NOW } from './test-utils';

const at = (day: string, time = '09:00') => `${day}T${time}:00`;
const v3Event = (id: string, type: string, status = 'pendente', extra: object = {}) => ({
  id,
  type,
  title: id,
  start: at('2026-11-10'),
  end: at('2026-11-10', '10:00'),
  subjectId: null,
  status,
  notes: '',
  ...extra,
});

/** Um v3 realista com tudo o que muda na v4. */
const v3Data = {
  subjects: [
    { id: 'mat', name: 'Matemática', color: 'azul' },
    { id: 'fis', name: 'Física', color: 'turquesa' },
    { id: 'qui', name: 'Química', color: 'amarelo' },
    { id: 'red', name: 'Redação', color: 'rosa' },
  ],
  events: [
    v3Event('prova', 'prova', 'em-andamento', {
      contents: [
        { id: 'c1', title: 'Limites', done: true, order: 0 },
        { id: 'c2', title: 'Derivadas', done: false, order: 1 },
      ],
    }),
    v3Event('bloco', 'estudo', 'concluido', { examId: 'prova' }),
    v3Event('entrega', 'entrega', 'cancelado'),
    v3Event('revisao', 'revisao', 'em-andamento'),
    v3Event('especial', 'especial'),
  ],
  preferences: { ...DEFAULT_PREFERENCES, waterGoalMl: 2500 },
  habits: [
    {
      id: 'estudo',
      name: 'Cumprir blocos',
      icon: 'book-open',
      color: 'verde',
      type: 'check',
      unit: '',
      source: 'blocos',
      rules: [{ since: '2026-10-01', repeat: { kind: 'dias-da-semana', days: [1, 2, 3, 4, 5] } }],
      createdAt: at('2026-10-01'),
      order: 0,
    },
    {
      id: 'agua',
      name: 'Água',
      icon: 'droplets',
      color: 'amarelo',
      type: 'quantidade',
      unit: 'ml',
      source: 'agua',
      rules: [
        {
          since: '2026-10-01',
          repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
          target: 2500,
        },
      ],
      createdAt: at('2026-10-01'),
      order: 1,
    },
  ],
  habitLogs: [],
  waterLogs: [],
  focusSessions: [
    {
      id: 's1',
      startedAt: at('2026-11-09'),
      plannedSec: 1500,
      actualSec: 1500,
      status: 'concluida',
      subjectId: 'mat',
      examId: 'prova',
      blockId: 'bloco',
    },
  ],
};
const v3Raw = JSON.stringify({ app: 'daily', version: 3, savedAt: 'x', data: v3Data });

function migrated() {
  const result = parseEnvelope(v3Raw, FIXED_NOW);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('migração v3 → v4', () => {
  it('tipos: entrega, estudo e revisão viram tarefa; prova e especial ficam', () => {
    const { snapshot } = migrated();
    expect(snapshot.events.map((e) => [e.id, e.type])).toEqual([
      ['prova', 'prova'],
      ['bloco', 'tarefa'],
      ['entrega', 'tarefa'],
      ['revisao', 'tarefa'],
      ['especial', 'especial'],
    ]);
  });

  it('status: “em andamento” vira pendente; os demais ficam', () => {
    const status = Object.fromEntries(migrated().snapshot.events.map((e) => [e.id, e.status]));
    expect(status).toEqual({
      prova: 'pendente',
      bloco: 'concluido',
      entrega: 'cancelado',
      revisao: 'pendente',
      especial: 'pendente',
    });
  });

  it('conteúdos da prova viram subtarefas com os mesmos ids, ordem e estado', () => {
    const [prova, ...rest] = migrated().snapshot.events;
    expect(prova?.subtasks).toEqual([
      { id: 'c1', title: 'Limites', done: true, order: 0 },
      { id: 'c2', title: 'Derivadas', done: false, order: 1 },
    ]);
    expect(prova).not.toHaveProperty('contents');
    for (const event of rest) expect(event.subtasks).toEqual([]);
  });

  it('blocos: o vínculo com a prova sai do evento e da sessão; createdAt = início', () => {
    const { snapshot } = migrated();
    const bloco = snapshot.events.find((e) => e.id === 'bloco');
    expect(bloco).not.toHaveProperty('examId');
    expect(bloco?.createdAt).toBe(bloco?.start);
    expect(snapshot.focusSessions[0]).toEqual({
      id: 's1',
      startedAt: at('2026-11-09'),
      plannedSec: 1500,
      actualSec: 1500,
      status: 'concluida',
      subjectId: 'mat',
      examId: 'prova',
      origin: 'cronometro',
      note: '',
    });
  });

  it('hábito com fonte blocos vira manual de check; os demais preservam fonte e meta', () => {
    const { habits } = migrated().snapshot;
    expect(habits[0]).toMatchObject({ id: 'estudo', source: 'manual', type: 'check', unit: '' });
    expect(habits[1]).toMatchObject({ id: 'agua', source: 'agua' });
    expect(habits[1]?.rules[0]?.target).toBe(2500);
  });

  it('cores: remapeia preservando o que não conflita, sem repetir quando há cor livre', () => {
    const { subjects, habits } = migrated().snapshot;
    // azul → petróleo; turquesa → ciano; amarelo → ciano (já usado) → primeira livre; rosa fica.
    expect(subjects.map((s) => s.color)).toEqual(['petroleo', 'ciano', 'gelo', 'rosa']);
    expect(habits.map((h) => h.color)).toEqual(['gelo', 'ciano']);
  });

  it('a tabela de cores cobre as 8 cores antigas e nunca usa vermelho, verde, amarelo ou laranja', () => {
    expect(Object.keys(COLOR_V3_TO_V4).sort()).toEqual(
      ['amarelo', 'azul', 'laranja', 'rosa', 'turquesa', 'verde', 'vermelho', 'violeta'].sort(),
    );
    for (const color of Object.values(COLOR_V3_TO_V4)) {
      expect(['vermelho', 'verde', 'amarelo', 'laranja']).not.toContain(color);
    }
    // Idempotente: cores que já são da paleta nova ficam.
    expect(remapColors([{ color: 'lilas' }, { color: 'lilas' }])).toEqual([
      { color: 'lilas' },
      { color: 'lilas' },
    ]);
  });

  it('cria descansos vazios e marca a água como criada quando já há dados', () => {
    const { snapshot } = migrated();
    expect(snapshot.restDays).toEqual([]);
    expect(snapshot.onboarding).toEqual({ waterHabitCreated: true });
    const empty = parseEnvelope(
      JSON.stringify({
        version: 3,
        data: { ...v3Data, subjects: [], events: [], habits: [], focusSessions: [] },
      }),
      FIXED_NOW,
    );
    expect(empty.ok && empty.snapshot.onboarding).toEqual({ waterHabitCreated: false });
  });

  it('é idempotente: rodar sobre a saída não muda nada', () => {
    const first = migrated().snapshot;
    expect(migrateData(3, first, FIXED_NOW)).toEqual(first);
    const again = parseEnvelope(
      JSON.stringify({ app: 'daily', version: DATA_VERSION, data: first }),
      FIXED_NOW,
    );
    expect(again.ok && again.snapshot).toEqual(first);
    expect(again.ok && again.migratedFrom).toBeNull();
    expect(dataSnapshotSchema.safeParse(first).success).toBe(true);
  });

  it('dado v3 ilegível segue o fluxo de corrupção (nada é inventado)', () => {
    const broken = JSON.stringify({ version: 3, data: { ...v3Data, events: 'x' } });
    expect(parseEnvelope(broken, FIXED_NOW).ok).toBe(false);
  });
});

describe('importação', () => {
  it('aceita v4 e recusa versões mais novas que a do app', () => {
    const v4 = JSON.stringify({ app: 'daily', version: 4, data: migrated().snapshot });
    expect(readBackupFile(v4).ok).toBe(true);
    const future = JSON.stringify({
      app: 'daily',
      version: DATA_VERSION + 1,
      data: migrated().snapshot,
    });
    const result = readBackupFile(future);
    expect(result.ok).toBe(false);
  });

  it('aceita v3 (migra na leitura)', () => {
    expect(readBackupFile(v3Raw).ok).toBe(true);
  });
});

describe('repositório: do v3 salvo para o v4', () => {
  it('migra ao abrir, guarda o original em daily:v3:pre-v4 e nunca altera daily:v3', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V3_KEY, v3Raw);
    const repo = new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    expect(repo.issue).toBeNull();
    expect(repo.events.list()).toHaveLength(5);
    expect(storage.getItem(PRE_V4_KEY)).toBe(v3Raw);
    expect(storage.getItem(LEGACY_V3_KEY)).toBe(v3Raw);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').version).toBe(5);
    expect(storage.getItem(MIGRATED_AT_KEY)).toBe(String(FIXED_NOW.getTime()));
  });

  it('com daily:v4 presente, não relê o v3 (uma aba antiga não sobrescreve)', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V3_KEY, v3Raw);
    new LocalStorageRepository(storage, { now: () => FIXED_NOW }).subjects.create({
      name: 'Nova',
      color: 'ciano',
    });
    // Uma aba antiga grava no v3 depois da migração…
    storage.setItem(
      LEGACY_V3_KEY,
      JSON.stringify({ version: 3, data: { ...v3Data, subjects: [] } }),
    );
    const reopened = new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    // …e o app novo continua lendo o v4.
    expect(reopened.subjects.list().map((s) => s.name)).toContain('Nova');
  });

  it(`remove daily:v3 e o pre-v4 ${LEGACY_RETENTION_DAYS} dias depois da migração`, () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V3_KEY, v3Raw);
    new LocalStorageRepository(storage, { now: () => FIXED_NOW });
    const day = 24 * 60 * 60 * 1000;
    const later = (days: number) => new Date(FIXED_NOW.getTime() + days * day);

    new LocalStorageRepository(storage, { now: () => later(LEGACY_RETENTION_DAYS - 1) });
    expect(storage.getItem(LEGACY_V3_KEY)).not.toBeNull();
    expect(storage.getItem(PRE_V4_KEY)).not.toBeNull();

    new LocalStorageRepository(storage, { now: () => later(LEGACY_RETENTION_DAYS) });
    expect(storage.getItem(LEGACY_V3_KEY)).toBeNull();
    expect(storage.getItem(PRE_V4_KEY)).toBeNull();
    expect(storage.getItem(MIGRATED_AT_KEY)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
