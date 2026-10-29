import { describe, expect, it } from 'vitest';
import { EVERY_DAY, habitSchema } from '@daily/shared';
import { createDataStore } from '../data/store';
import { memoryRepo } from '../data/test-utils';
import { LocalStorageRepository } from '../data/local-storage-repository';
import {
  applyHabitEdit,
  canEditDay,
  duplicateHabitDraft,
  MAX_RETRO_DAYS,
  newHabit,
  type HabitDraft,
} from './edit';
import { monthLabels, monthlySummary, formatLongDay, formatAmount } from './summary';
import { buildHabitContext } from './context';

const NOW = new Date(2026, 10, 10, 9, 5); // terça, 10/11/2026
const TODAY = '2026-11-10';

const draft = (patch: Partial<HabitDraft> = {}): HabitDraft => ({
  name: 'Musculação',
  icon: 'dumbbell',
  color: 'laranja',
  type: 'check',
  unit: '',
  source: 'manual',
  repeat: { kind: 'dias-da-semana', days: [1, 3, 5] },
  target: null,
  time: { start: '07:00', durationMin: 60 },
  endsOn: null,
  ...patch,
});

const setup = () => {
  const { repo, storage } = memoryRepo();
  return { store: createDataStore(repo), storage };
};

describe('regra versionada ao editar', () => {
  const base = habitSchema.parse({ ...newHabit(draft(), new Date(2026, 9, 1), 0), id: 'h' });

  it('nome e cor mudam direto, sem criar regra', () => {
    expect(applyHabitEdit(base, { name: 'Peso', color: 'azul' }, TODAY)).toEqual({
      name: 'Peso',
      color: 'azul',
    });
  });

  it('repetição, meta ou horário criam uma nova regra a partir de hoje', () => {
    const patch = applyHabitEdit(base, { repeat: EVERY_DAY }, TODAY);
    expect(patch.rules).toHaveLength(2);
    expect(patch.rules?.[0]?.repeat).toEqual({ kind: 'dias-da-semana', days: [1, 3, 5] }); // o passado fica
    expect(patch.rules?.[1]).toMatchObject({
      since: TODAY,
      repeat: EVERY_DAY,
      time: base.rules[0]?.time,
    });
  });

  it('editar de novo no mesmo dia substitui a regra de hoje; sem mudança real, nada muda', () => {
    const once = habitSchema.parse({
      ...base,
      rules: applyHabitEdit(base, { repeat: EVERY_DAY }, TODAY).rules,
    });
    const twice = applyHabitEdit(once, { repeat: { kind: 'a-cada-n-dias', interval: 2 } }, TODAY);
    expect(twice.rules).toHaveLength(2);
    expect(twice.rules?.[1]?.repeat).toEqual({ kind: 'a-cada-n-dias', interval: 2 });
    expect(applyHabitEdit(base, { repeat: base.rules[0]?.repeat }, TODAY).rules).toBeUndefined();
  });

  it('check ignora meta e unidade', () => {
    const patch = applyHabitEdit(base, { target: 10, unit: 'x' }, TODAY);
    expect(patch.unit).toBe('');
    expect(patch.rules).toBeUndefined();
  });

  it('duplicar copia a regra em vigor começando hoje, com o nome “(cópia)”', () => {
    const copy = duplicateHabitDraft(base, TODAY, '2026-11-10T09:05:00', 3);
    expect(copy.name).toBe('Musculação (cópia)');
    expect(copy.rules).toHaveLength(1);
    expect(copy.rules[0]?.since).toBe(TODAY);
    expect(copy.order).toBe(3);
  });
});

describe('edição retroativa', () => {
  const manual = habitSchema.parse({ ...newHabit(draft(), new Date(2026, 0, 1), 0), id: 'm' });
  const auto = habitSchema.parse({
    ...newHabit(
      draft({ type: 'quantidade', source: 'agua', unit: 'ml', target: 2000 }),
      new Date(2026, 0, 1),
      1,
    ),
    id: 'a',
  });

  it('só manuais, só até hoje e até 366 dias atrás', () => {
    expect(canEditDay(manual, TODAY, TODAY)).toBe(true);
    expect(canEditDay(manual, '2026-11-09', TODAY)).toBe(true);
    expect(canEditDay(manual, '2026-11-11', TODAY)).toBe(false); // futuro
    expect(canEditDay(auto, '2026-11-09', TODAY)).toBe(false); // fonte automática
    expect(canEditDay(manual, '2025-11-09', TODAY)).toBe(true); // 366 dias
    expect(canEditDay(manual, '2025-11-08', TODAY)).toBe(false); // 367 dias
    expect(MAX_RETRO_DAYS).toBe(366);
  });
});

describe('ações de hábitos no store', () => {
  it('cria, edita (nova regra), duplica, reordena, arquiva e restaura, persistindo', () => {
    const { store, storage } = setup();
    const created = store.getState().createHabit(draft(), new Date(2026, 9, 1, 8, 0)); // criado antes de hoje
    store.getState().createHabit(draft({ name: 'Luta' }), NOW);
    const id = created?.id ?? '';
    expect(store.getState().habits.map((h) => h.order)).toEqual([0, 1]);

    store.getState().updateHabit(id, { repeat: EVERY_DAY, name: 'Peso' }, NOW);
    const edited = store.getState().habits.find((h) => h.id === id);
    expect(edited?.name).toBe('Peso');
    expect(edited?.rules).toHaveLength(2);

    const copy = store.getState().duplicateHabit(id, NOW);
    expect(copy?.name).toBe('Peso (cópia)');
    store.getState().reorderHabits([
      copy?.id ?? '',
      ...store
        .getState()
        .habits.filter((h) => h.id !== copy?.id)
        .map((h) => h.id),
    ]);
    expect(store.getState().habits.find((h) => h.id === copy?.id)?.order).toBe(0);

    store.getState().archiveHabit(id, NOW);
    expect(store.getState().habits.find((h) => h.id === id)?.archivedAt).toBe(
      '2026-11-10T09:05:00',
    );
    store.getState().restoreHabit(id);
    expect(store.getState().habits.find((h) => h.id === id)?.archivedAt).toBeNull();

    const reopened = createDataStore(new LocalStorageRepository(storage));
    expect(reopened.getState().habits).toHaveLength(3);
  });

  it('registra valores: define, sobrescreve, bloqueia futuro, antigo demais e fontes automáticas', () => {
    const { store } = setup();
    const gym = store.getState().createHabit(draft(), NOW)?.id ?? '';
    const water =
      store
        .getState()
        .createHabit(
          draft({ name: 'Água', type: 'quantidade', source: 'agua', unit: 'ml', target: 2000 }),
          NOW,
        )?.id ?? '';

    expect(store.getState().setHabitValue(gym, TODAY, 1, NOW)).toBe(true);
    expect(store.getState().setHabitValue(gym, TODAY, 1, NOW)).toBe(true);
    expect(store.getState().habitLogs).toHaveLength(1); // um registro por hábito e dia
    expect(store.getState().setHabitValue(gym, TODAY, 0, NOW)).toBe(true);
    expect(store.getState().habitLogs[0]?.value).toBe(0);

    expect(store.getState().setHabitValue(gym, '2026-11-09', 1, NOW)).toBe(true); // ontem
    expect(store.getState().setHabitValue(gym, '2026-11-11', 1, NOW)).toBe(false); // futuro
    expect(store.getState().setHabitValue(gym, '2025-01-01', 1, NOW)).toBe(false); // > 366 dias
    expect(store.getState().setHabitValue(water, TODAY, 500, NOW)).toBe(false); // automático
    expect(store.getState().setHabitValue('nao-existe', TODAY, 1, NOW)).toBe(false);
    expect(store.getState().habitLogs).toHaveLength(2);
  });

  it('excluir remove o hábito e os registros; o snapshot de antes restaura tudo (“Desfazer”)', () => {
    const { store } = setup();
    const id = store.getState().createHabit(draft(), NOW)?.id ?? '';
    store.getState().setHabitValue(id, TODAY, 1, NOW);
    const before = store.getState().snapshot();

    store.getState().deleteHabit(id);
    expect(store.getState().habits).toEqual([]);
    expect(store.getState().habitLogs).toEqual([]);

    store.getState().replaceAll(before);
    expect(store.getState().habits).toHaveLength(1);
    expect(store.getState().habitLogs).toHaveLength(1);
  });

  it('rejeita nome vazio e quantidade sem meta', () => {
    const { store } = setup();
    expect(() => store.getState().createHabit(draft({ name: '  ' }), NOW)).toThrow();
    expect(() =>
      store.getState().createHabit(draft({ type: 'quantidade', target: null }), NOW),
    ).toThrow();
  });
});

describe('resumos de texto', () => {
  it('rótulos de mês: só onde o mês muda e sem encavalar', () => {
    const columns = [
      ['2026-10-25', '2026-10-26'],
      ['2026-11-01', '2026-11-02'],
      ['2026-11-08', '2026-11-09'],
      ['2026-11-15', '2026-11-16'],
      ['2026-11-22', '2026-11-23'],
      ['2026-11-29', '2026-11-30'],
      ['2026-12-06', '2026-12-07'],
    ];
    expect(monthLabels(columns)).toEqual([null, 'nov', null, null, null, null, 'dez']);
  });

  it('data longa e valores', () => {
    expect(formatLongDay('2026-10-21')).toBe('qua., 21 de out.');
    expect(formatAmount(750, 'ml')).toBe('750 ml');
    expect(formatAmount(1.5, 'h')).toBe('1,5 h');
    expect(formatAmount(3, '')).toBe('3');
  });

  it('resumo mensal: dias agendados e cumpridos (pendente de hoje e futuro ficam fora)', () => {
    const habit = habitSchema.parse({
      ...newHabit(draft({ repeat: EVERY_DAY }), new Date(2026, 9, 1), 0),
      id: 'h',
    });
    const ctx = buildHabitContext(
      {
        habitLogs: [
          {
            id: 'h:2026-10-31',
            habitId: 'h',
            date: '2026-10-31',
            value: 1,
            updatedAt: '2026-10-31T09:00:00',
          },
          {
            id: 'h:2026-11-09',
            habitId: 'h',
            date: '2026-11-09',
            value: 1,
            updatedAt: '2026-11-09T09:00:00',
          },
        ],
        waterLogs: [],
        focusSessions: [],
        events: [],
      },
      TODAY,
    );
    const rows = monthlySummary(
      habit,
      ['2026-10-30', '2026-10-31', '2026-11-08', '2026-11-09', TODAY, '2026-11-11'],
      ctx,
    );
    expect(rows.map((r) => [r.month, r.scheduled, r.done])).toEqual([
      ['2026-10', 2, 1],
      ['2026-11', 2, 1],
    ]);
  });
});
