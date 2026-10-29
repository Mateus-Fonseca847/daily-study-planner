import { describe, expect, it } from 'vitest';
import { dataSnapshotSchema } from '@daily/shared';
import { applySubjectDeletion, duplicateEventDraft, eventsOfSubject, removeEvents } from './rules';
import { block, exam, snapshot, subject, task } from './test-utils';

describe('applySubjectDeletion', () => {
  it('exclui direto uma matéria sem eventos, sem exigir resolução', () => {
    const base = { subjects: [subject('a'), subject('b')], events: [] };
    expect(applySubjectDeletion(base, 'a').subjects.map((s) => s.id)).toEqual(['b']);
  });

  it('exige uma escolha quando há eventos associados', () => {
    expect(() => applySubjectDeletion(snapshot(), 'mat')).toThrow(/escolha/);
  });

  it('“apagar eventos” remove os eventos e desvincula blocos de provas removidas', () => {
    const base = {
      subjects: [subject('mat'), subject('fis')],
      events: [exam('e1', 'mat'), block('b1', 'fis', 'e1'), task('t1', { subjectId: 'mat' })],
    };
    const result = applySubjectDeletion(base, 'mat', { kind: 'delete-events' });
    expect(result.subjects.map((s) => s.id)).toEqual(['fis']);
    expect(result.events.map((e) => e.id)).toEqual(['b1']);
    expect(result.events[0]).toMatchObject({ examId: null });
    expect(dataSnapshotSchema.safeParse(result).success).toBe(true);
  });

  it('“mover eventos” reatribui todos à matéria de destino', () => {
    const result = applySubjectDeletion(snapshot(), 'mat', {
      kind: 'move-events',
      toSubjectId: 'fis',
    });
    expect(result.subjects.map((s) => s.id)).toEqual(['fis']);
    expect(eventsOfSubject(result, 'fis')).toHaveLength(3);
    expect(dataSnapshotSchema.safeParse(result).success).toBe(true);
  });

  it('rejeita destino inexistente ou igual à matéria excluída', () => {
    expect(() =>
      applySubjectDeletion(snapshot(), 'mat', { kind: 'move-events', toSubjectId: 'fantasma' }),
    ).toThrow(/destino/);
    expect(() =>
      applySubjectDeletion(snapshot(), 'mat', { kind: 'move-events', toSubjectId: 'mat' }),
    ).toThrow(/destino/);
  });
});

describe('removeEvents', () => {
  it('apagar uma prova desvincula os blocos que apontavam para ela', () => {
    const result = removeEvents(snapshot(), new Set(['e1']));
    expect(result.events.find((e) => e.id === 'b1')).toMatchObject({ examId: null });
    expect(result.events.some((e) => e.id === 'e1')).toBe(false);
  });
});

describe('duplicateEventDraft', () => {
  it('copia a prova com novos ids de conteúdo, desmarcados e pendente', () => {
    let n = 0;
    const draft = duplicateEventDraft(exam('e1', 'mat', { status: 'concluido' }), () => `n-${++n}`);
    expect(draft).toMatchObject({ title: 'Prova e1 (cópia)', status: 'pendente', type: 'prova' });
    expect(draft.type === 'prova' && draft.contents.map((c) => [c.id, c.done])).toEqual([
      ['n-1', false],
      ['n-2', false],
    ]);
    expect('id' in draft).toBe(false);
  });
});
