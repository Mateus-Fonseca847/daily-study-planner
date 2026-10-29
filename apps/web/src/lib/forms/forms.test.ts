import { describe, expect, it } from 'vitest';
import {
  initialEventValues,
  NEW_SUBJECT,
  validateEventForm,
  type EventFormValues,
} from './event-form';
import { quickBlockDraft, quickTaskDraft } from './quick-create';
import { exam, subject } from '../data/test-utils';

const today = new Date(2026, 10, 10, 10, 0);
const subjects = [subject('mat', 'Matemática')];
let n = 0;
const newId = () => `id-${++n}`;

const valid = (patch: Partial<EventFormValues> = {}): EventFormValues => ({
  ...initialEventValues({ type: 'prova', date: '2026-11-20' }, today),
  title: 'Prova de Cálculo',
  subjectId: 'mat',
  ...patch,
});

describe('validateEventForm', () => {
  it('monta uma prova com conteúdos ordenados, ignorando linhas em branco', () => {
    const result = validateEventForm(
      valid({
        contents: [
          { id: '', title: ' Limites ', done: false },
          { id: 'x', title: '   ', done: false },
          { id: 'c2', title: 'Derivadas', done: true },
        ],
      }),
      subjects,
      newId,
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.draft.type !== 'prova') throw new Error('esperava prova');
    expect(result.draft.start).toBe('2026-11-20T08:00:00');
    expect(result.draft.contents.map((c) => [c.title, c.order, c.done])).toEqual([
      ['Limites', 0, false],
      ['Derivadas', 1, true],
    ]);
  });

  it('devolve mensagens em pt-BR por campo', () => {
    const result = validateEventForm(
      valid({ title: '  ', date: '2026-02-31', startTime: '10:00', endTime: '09:00' }),
      subjects,
      newId,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toMatchObject({
      title: 'Informe o título.',
      date: 'Informe uma data válida.',
      endTime: 'O término deve ser depois do início.',
    });
  });

  it('exige o nome ao criar matéria nova e a devolve com cor da paleta', () => {
    const missing = validateEventForm(valid({ subjectId: NEW_SUBJECT }), subjects, newId);
    expect(!missing.ok && missing.errors.newSubjectName).toBe('Informe o nome da matéria.');

    const ok = validateEventForm(
      valid({ subjectId: NEW_SUBJECT, newSubjectName: ' Química ' }),
      subjects,
      newId,
    );
    expect(ok.ok && ok.newSubject).toEqual({ name: 'Química', color: 'laranja' });
    expect(ok.ok && ok.draft.subjectId).toBeNull();
  });

  it('tarefa usa um único horário (prazo): início = fim', () => {
    const result = validateEventForm(
      valid({ type: 'entrega', startTime: '18:30', endTime: '07:00' }),
      subjects,
      newId,
    );
    expect(result.ok && [result.draft.start, result.draft.end]).toEqual([
      '2026-11-20T18:30:00',
      '2026-11-20T18:30:00',
    ]);
  });

  it('edição preserva os valores existentes', () => {
    const values = initialEventValues({ event: exam('e1', 'mat') }, today);
    expect(values).toMatchObject({
      type: 'prova',
      subjectId: 'mat',
      date: '2026-11-10',
      startTime: '09:00',
    });
    expect(values.contents.map((c) => c.title)).toEqual(['Limites', 'Derivadas']);
  });
});

describe('criação rápida', () => {
  it('tarefa: prazo hoje às 23:59', () => {
    expect(quickTaskDraft('Ler capítulo', today)).toMatchObject({
      type: 'entrega',
      start: '2026-11-10T23:59:00',
      end: '2026-11-10T23:59:00',
      status: 'pendente',
    });
  });

  it('bloco: próxima hora cheia, limitada a 22h', () => {
    const links = { subjectId: 'mat', examId: null };
    expect(quickBlockDraft('Revisar', today, links)).toMatchObject({
      start: '2026-11-10T11:00:00',
      end: '2026-11-10T12:00:00',
      subjectId: 'mat',
    });
    expect(quickBlockDraft('Tarde', new Date(2026, 10, 10, 23, 30), links).start).toBe(
      '2026-11-10T22:00:00',
    );
  });
});
