import { describe, expect, it } from 'vitest';
import { activeFocusSchema } from './focus';
import { goalSchema } from './legacy-goals';
import { DEFAULT_PREFERENCES, preferencesSchema } from './preferences';
import { createInitialSnapshot, dataSnapshotSchema } from './snapshot';

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
};
const subjects = [{ id: 'mat', name: 'Matemática', color: 'azul' }];

describe('dataSnapshotSchema', () => {
  it('aceita dados válidos e aplica padrões (notas vazias, sem conteúdos)', () => {
    const result = dataSnapshotSchema.parse({ ...base, subjects, events: [event] });
    expect(result.events[0]).toMatchObject({ notes: '', contents: [] });
  });

  it('rejeita fim antes do início, matéria inexistente e prova inexistente', () => {
    const parse = (events: unknown[], subs: unknown[] = subjects) =>
      dataSnapshotSchema.safeParse({ ...base, subjects: subs, events }).success;
    expect(parse([{ ...event, end: '2026-11-10T08:00:00' }])).toBe(false);
    expect(parse([event], [])).toBe(false);
    expect(parse([{ ...event, id: 'b', type: 'estudo', examId: 'nao-existe' }])).toBe(false);
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
    expect(bad({ focusSessions: [{ ...session, blockId: 'nada' }] })).toBe(false);
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
    expect(activeFocusSchema.parse(active).link).toEqual({
      subjectId: null,
      examId: null,
      blockId: null,
    });
    expect(activeFocusSchema.safeParse({ ...active, durationSec: 30 }).success).toBe(false);
    expect(activeFocusSchema.safeParse({ ...active, durationSec: 181 * 60 }).success).toBe(false);
  });
});
