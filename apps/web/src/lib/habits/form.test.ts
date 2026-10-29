import { describe, expect, it } from 'vitest';
import { habitSchema } from '@daily/shared';
import { newHabit } from './edit';
import { applySource, editFromForm, emptyForm, formFromHabit, validateForm } from './form';
import { habitSuggestions } from './suggestions';

const TODAY = '2026-11-10';
const errorsOf = (form: ReturnType<typeof emptyForm>) => {
  const result = validateForm(form);
  return result.ok ? {} : result.errors;
};

describe('formulário de hábito', () => {
  it('o formulário vazio só falha no nome', () => {
    expect(errorsOf(emptyForm(TODAY))).toEqual({ name: 'Informe o nome do hábito.' });
  });

  it('valida repetição, intervalo, meta, datas e horário com mensagens em pt-BR', () => {
    const base = { ...emptyForm(TODAY), name: 'Ler' };
    expect(errorsOf({ ...base, repeatMode: 'dias', days: [] }).days).toBe(
      'Escolha pelo menos um dia da semana.',
    );
    expect(errorsOf({ ...base, repeatMode: 'a-cada-n', interval: '1' }).interval).toBe(
      'O intervalo deve ser de pelo menos 2 dias.',
    );
    expect(errorsOf({ ...base, repeatMode: 'a-cada-n', interval: '2,5' }).interval).toBe(
      'Use um número inteiro de dias.',
    );
    expect(errorsOf({ ...base, type: 'quantidade', target: '' }).target).toBe('Informe a meta.');
    expect(errorsOf({ ...base, type: 'quantidade', target: '0' }).target).toBe(
      'A meta deve ser maior que zero.',
    );
    expect(errorsOf({ ...base, endsOn: '2026-11-01' }).endsOn).toBe(
      'O fim não pode ser antes do início.',
    );
    expect(errorsOf({ ...base, timeOn: true, duration: '0' }).time).toBe(
      'A duração deve ser de pelo menos 1 minuto.',
    );
    expect(errorsOf({ ...base, timeOn: true, timeStart: '25:00' }).time).toBe(
      'Informe um horário válido.',
    );
    expect(errorsOf({ ...base, name: 'x'.repeat(61) }).name).toBe('Use no máximo 60 caracteres.');
  });

  it('monta o rascunho: check ignora a meta; “todo dia” são os 7 dias; vírgula decimal vale', () => {
    const ok = validateForm({ ...emptyForm(TODAY), name: '  Ler  ', target: '9' });
    expect(ok.ok && ok.draft).toMatchObject({
      name: 'Ler',
      unit: '',
      target: null,
      endsOn: null,
      time: null,
    });
    expect(ok.ok && ok.draft.repeat).toEqual({
      kind: 'dias-da-semana',
      days: [0, 1, 2, 3, 4, 5, 6],
    });
    const qty = validateForm({
      ...emptyForm(TODAY),
      name: 'Água',
      type: 'quantidade',
      unit: 'L',
      target: '1,5',
    });
    expect(qty.ok && qty.draft.target).toBe(1.5);
  });

  it('fontes automáticas fixam tipo e unidade', () => {
    const water = applySource(emptyForm(TODAY), 'agua', 2500);
    expect(water).toMatchObject({ type: 'quantidade', unit: 'ml', target: '2500' });
    expect(applySource(emptyForm(TODAY), 'blocos', 2000)).toMatchObject({
      type: 'check',
      target: '',
    });
    expect(applySource(emptyForm(TODAY), 'foco', 2000)).toMatchObject({
      unit: 'min',
      target: '60',
    });
  });

  it('as 4 sugestões são válidas e a de hidratação usa a meta de água', () => {
    const suggestions = habitSuggestions(2500);
    expect(suggestions.map((s) => s.label)).toEqual(['Musculação', 'Hidratação', 'Luta', 'Estudo']);
    expect(suggestions[1]?.draft.target).toBe(2500);
    for (const { draft } of suggestions) {
      habitSchema.parse({ ...newHabit(draft, new Date(2026, 10, 10), 0), id: 'x' });
    }
  });

  it('editar: só repetição, meta e horário contam como mudança de regra', () => {
    const habit = habitSchema.parse({
      ...newHabit(habitSuggestions(2000)[0]!.draft, new Date(2026, 9, 1), 0),
      id: 'h',
    });
    const form = formFromHabit(habit, TODAY);
    expect(form).toMatchObject({
      name: 'Musculação',
      repeatMode: 'dias',
      days: [1, 3, 5],
      timeOn: true,
      timeStart: '07:00',
    });

    const same = validateForm({ ...form, name: 'Peso', color: 'azul' });
    expect(same.ok && editFromForm(habit, same.draft, TODAY).changesRule).toBe(false);
    const changed = validateForm({ ...form, days: [1, 3] });
    expect(changed.ok && editFromForm(habit, changed.draft, TODAY).changesRule).toBe(true);
  });
});
