import { describe, expect, it } from 'vitest';
import { activeFocusSchema } from './focus';
import { goalSchema } from './legacy-goals';
import { DEFAULT_PREFERENCES, preferencesSchema } from './preferences';
import { createInitialSnapshot, dataSnapshotSchema, isPristineSnapshot } from './snapshot';

const CREATED = '2026-11-10T09:00:00';
const base = createInitialSnapshot();
const event = {
  id: 'e1',
  type: 'prova',
  title: 'Prova',
  start: '2026-11-10T09:00:00',
  end: '2026-11-10T11:00:00',
  subjectId: 'mat',
  status: 'pendente',
  createdAt: CREATED,
};
const subjects = [{ id: 'mat', name: 'Matemática', color: 'ciano' }];

describe('dataSnapshotSchema', () => {
  it('aceita dados válidos e aplica padrões (notas vazias, sem subtarefas)', () => {
    const result = dataSnapshotSchema.parse({ ...base, subjects, events: [event] });
    expect(result.events[0]).toMatchObject({ notes: '', subtasks: [] });
  });

  it('rejeita fim antes do início, matéria inexistente e tipos/status antigos', () => {
    const parse = (events: unknown[], subs: unknown[] = subjects) =>
      dataSnapshotSchema.safeParse({ ...base, subjects: subs, events }).success;
    expect(parse([{ ...event, end: '2026-11-10T08:00:00' }])).toBe(false);
    expect(parse([event], [])).toBe(false);
    expect(parse([{ ...event, type: 'estudo' }])).toBe(false);
    expect(parse([{ ...event, status: 'em-andamento' }])).toBe(false);
    expect(parse([{ ...event, type: 'tarefa', subjectId: null }])).toBe(true);
  });

  it('descansos: hábito existente ou todos (null), sem repetição', () => {
    const rest = (id: string, habitId: string | null) => ({ id, habitId, date: '2026-11-10' });
    const parse = (restDays: unknown[]) =>
      dataSnapshotSchema.safeParse({ ...base, restDays }).success;
    expect(parse([rest('r1', null)])).toBe(true);
    expect(parse([rest('r1', 'nao-existe')])).toBe(false);
    expect(parse([rest('r1', null), rest('r2', null)])).toBe(false);
  });

  it('rejeita registros e sessões que apontam para algo inexistente', () => {
    const bad = (patch: object) => dataSnapshotSchema.safeParse({ ...base, ...patch }).success;
    expect(
      bad({
        habitLogs: [
          { id: 'x:2026-11-10', habitId: 'x', date: '2026-11-10', value: 1, updatedAt: CREATED },
        ],
      }),
    ).toBe(false);
    const session = {
      id: 's',
      startedAt: CREATED,
      plannedSec: 60,
      actualSec: 60,
      status: 'concluida',
    };
    expect(bad({ focusSessions: [{ ...session, examId: 'nada' }] })).toBe(false);
    expect(bad({ focusSessions: [session] })).toBe(true);
  });

  it('o estado inicial traz as preferências padrão e nenhum hábito', () => {
    expect(dataSnapshotSchema.safeParse(base).success).toBe(true);
    expect(base.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(base.habits).toEqual([]);
    expect(base.habitLogs).toEqual([]);
  });
});

describe('preferências, metas e sessão ativa', () => {
  it('têm os padrões pedidos', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      name: '',
      waterGoalMl: 2000,
      cupMl: 250,
      focusDurationSec: 1500,
      lockByDefault: false,
    });
  });

  it('validam limites com mensagens em pt-BR', () => {
    const result = preferencesSchema.safeParse({ focusDurationSec: 181 * 60, cupMl: 10 });
    expect(result.success).toBe(false);
    const messages = !result.success && result.error.issues.map((i) => i.message);
    expect(messages).toContain('A duração máxima é de 3 horas.');
    expect(messages).toContain('O copo deve ter pelo menos 50 ml.');
  });

  it('o schema legado de metas (v2) segue válido para migrar arquivos antigos', () => {
    const goal = {
      id: 'g',
      title: 'X',
      icon: 'moon',
      kind: 'manual',
      order: 0,
      createdAt: CREATED,
    };
    expect(goalSchema.safeParse(goal).success).toBe(true);
    expect(goalSchema.safeParse({ ...goal, icon: 'rocket' }).success).toBe(false);
    expect(goalSchema.parse(goal).archivedAt).toBeNull();
  });

  it('a sessão ativa aceita 1 a 180 minutos e vínculo opcional', () => {
    const active = { id: 'a', status: 'rodando', durationSec: 1500, tabId: 't' };
    expect(activeFocusSchema.parse(active).link).toEqual({ subjectId: null, examId: null });
    // Sessão ativa salva por uma versão antiga (com `blockId`): a chave é descartada na leitura.
    const old = { ...active, link: { subjectId: null, examId: null, blockId: 'b' } };
    expect(activeFocusSchema.parse(old).link).toEqual({ subjectId: null, examId: null });
    expect(activeFocusSchema.safeParse({ ...active, durationSec: 30 }).success).toBe(false);
    expect(activeFocusSchema.safeParse({ ...active, durationSec: 181 * 60 }).success).toBe(false);
  });
});

describe('isPristineSnapshot', () => {
  const water = {
    id: 'agua',
    name: 'Água',
    icon: 'droplets',
    color: 'ciano',
    type: 'quantidade',
    unit: 'ml',
    source: 'agua',
    rules: [
      {
        since: '2026-11-10',
        repeat: { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] },
        target: 2000,
      },
    ],
    createdAt: CREATED,
    order: 0,
  };
  it('estado inicial e “só o hábito de água automático” contam como vazio', () => {
    expect(isPristineSnapshot(base)).toBe(true);
    const withWater = dataSnapshotSchema.parse({
      ...base,
      habits: [water],
      onboarding: { waterHabitCreated: true },
    });
    expect(isPristineSnapshot(withWater)).toBe(true);
  });
  it('qualquer dado do usuário deixa de ser vazio', () => {
    const parsed = (patch: object) => dataSnapshotSchema.parse({ ...base, ...patch });
    expect(isPristineSnapshot(parsed({ subjects }))).toBe(false);
    expect(
      isPristineSnapshot(
        parsed({
          habits: [
            {
              ...water,
              source: 'manual',
              type: 'check',
              unit: '',
              rules: [{ ...water.rules[0], target: null }],
            },
          ],
        }),
      ),
    ).toBe(false);
    expect(
      isPristineSnapshot(parsed({ preferences: { ...DEFAULT_PREFERENCES, name: 'Ana' } })),
    ).toBe(false);
    expect(
      isPristineSnapshot(
        parsed({ waterLogs: [{ id: 'w', date: '2026-11-10', ml: 250, time: '10:00' }] }),
      ),
    ).toBe(false);
  });
});
