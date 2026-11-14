import { describe, expect, it } from 'vitest';
import {
  initialEventValues,
  NEW_SUBJECT,
  validateEventForm,
  type EventFormValues,
} from './event-form';
import { exam, subject, task } from '../data/test-utils';

const today = new Date(2026, 10, 10, 10, 0);
const CREATED = '2026-11-10T10:00:00';
const subjects = [subject('mat', 'Matemática')];
let n = 0;
const newId = () => `id-${++n}`;

const valid = (patch: Partial<EventFormValues> = {}): EventFormValues => ({
  ...initialEventValues({ type: 'prova', date: '2026-11-20' }, today),
  title: 'Prova de Cálculo',
  subjectId: 'mat',
  ...patch,
});

describe('initialEventValues (criação)', () => {
  it('o padrão é Tarefa, pendente, sem matéria e com prazo hoje às 23:59', () => {
    expect(initialEventValues({}, today)).toMatchObject({
      type: 'tarefa',
      status: 'pendente',
      subjectId: '',
      date: '2026-11-10',
      startTime: '23:59',
      endTime: '',
      subtasks: [],
    });
  });

  it('pelo calendário traz a data e a hora do clique (1 h de duração)', () => {
    expect(
      initialEventValues({ type: 'tarefa', date: '2026-11-12', time: '14:30' }, today),
    ).toMatchObject({ type: 'tarefa', date: '2026-11-12', startTime: '14:30', endTime: '15:30' });
  });
});

describe('validateEventForm', () => {
  it('monta subtarefas ordenadas em qualquer tipo, ignorando linhas em branco', () => {
    const result = validateEventForm(
      valid({
        type: 'tarefa',
        subtasks: [
          { id: '', title: ' Limites ', done: false },
          { id: 'x', title: '   ', done: false },
          { id: 'c2', title: 'Derivadas', done: true },
        ],
      }),
      subjects,
      newId,
      CREATED,
    );
    if (!result.ok) throw new Error('esperava sucesso');
    expect(result.draft.type).toBe('tarefa');
    expect(result.draft.createdAt).toBe(CREATED);
    expect(result.draft.subtasks.map((c) => [c.title, c.order, c.done])).toEqual([
      ['Limites', 0, false],
      ['Derivadas', 1, true],
    ]);
  });

  it('devolve mensagens em pt-BR por campo', () => {
    const result = validateEventForm(
      valid({ title: '  ', date: '2026-02-31', startTime: '10:00', endTime: '09:00' }),
      subjects,
      newId,
      CREATED,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toMatchObject({
      title: 'Informe o título.',
      date: 'Informe uma data válida.',
      endTime: 'O término não pode ser antes do início.',
    });
  });

  it('exige o nome ao criar matéria nova e a devolve com cor da paleta', () => {
    const missing = validateEventForm(valid({ subjectId: NEW_SUBJECT }), subjects, newId, CREATED);
    expect(!missing.ok && missing.errors.newSubjectName).toBe('Informe o nome da matéria.');

    const ok = validateEventForm(
      valid({ subjectId: NEW_SUBJECT, newSubjectName: ' Química ' }),
      subjects,
      newId,
      CREATED,
    );
    // Com uma matéria já criada, a sugestão é a 2ª cor do seletor (rodízio entre as 8).
    expect(ok.ok && ok.newSubject).toEqual({ name: 'Química', color: 'laranja' });
    expect(ok.ok && ok.draft.subjectId).toBeNull();
  });

  it('sem término o compromisso é pontual (início = fim)', () => {
    const result = validateEventForm(
      valid({ type: 'tarefa', startTime: '18:30', endTime: '' }),
      subjects,
      newId,
      CREATED,
    );
    expect(result.ok && [result.draft.start, result.draft.end]).toEqual([
      '2026-11-20T18:30:00',
      '2026-11-20T18:30:00',
    ]);
  });

  it('edição preserva os valores existentes (conteúdos viram subtarefas)', () => {
    const values = initialEventValues({ event: exam('e1', 'mat') }, today);
    expect(values).toMatchObject({
      type: 'prova',
      subjectId: 'mat',
      date: '2026-11-10',
      startTime: '09:00',
      endTime: '11:00',
    });
    expect(values.subtasks.map((c) => c.title)).toEqual(['Limites', 'Derivadas']);
    expect(initialEventValues({ event: task('t') }, today).endTime).toBe('');
  });
});
