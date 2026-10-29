import { describe, expect, it } from 'vitest';
import { dataSnapshotSchema } from '@daily/shared';
import { applySubjectDeletion, duplicateEventDraft, eventsOfSubject, removeEvents } from './rules';
import { block, exam, makeSnapshot, snapshot, subject, task } from './test-utils';

describe('applySubjectDeletion', () => {
  it('exclui direto uma matéria sem eventos, sem exigir resolução', () => {
    const base = makeSnapshot({ subjects: [subject('a'), subject('b')] });
    expect(applySubjectDeletion(base, 'a').subjects.map((s) => s.id)).toEqual(['b']);
  });

  it('exige uma escolha quando há eventos associados', () => {
    expect(() => applySubjectDeletion(snapshot(), 'mat')).toThrow(/escolha/);
  });

  it('“apagar eventos” remove os eventos e desvincula blocos de provas removidas', () => {
    const base = makeSnapshot({
      subjects: [subject('mat'), subject('fis')],
      events: [exam('e1', 'mat'), block('b1', 'fis', 'e1'), task('t1', { subjectId: 'mat' })],
    });
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

describe('sessões de foco vinculadas', () => {
  const session = (patch: object) => ({
    id: 's1',
    startedAt: '2026-11-09T14:00:00',
    plannedSec: 1500,
    actualSec: 1500,
    status: 'concluida' as const,
    subjectId: null,
    examId: null,
    blockId: null,
    ...patch,
  });

  it('excluir uma prova ou bloco desfaz o vínculo da sessão (nada fica pendurado)', () => {
    const base = makeSnapshot({
      ...snapshot(),
      focusSessions: [session({ examId: 'e1', blockId: 'b1', subjectId: 'mat' })],
    });
    const result = removeEvents(base, new Set(['e1', 'b1']));
    expect(result.focusSessions[0]).toMatchObject({
      examId: null,
      blockId: null,
      subjectId: 'mat',
    });
    expect(dataSnapshotSchema.safeParse(result).success).toBe(true);
  });

  it('mover eventos leva as sessões para a nova matéria; apagar zera o vínculo', () => {
    const base = makeSnapshot({
      ...snapshot(),
      focusSessions: [session({ subjectId: 'mat' })],
    });
    const moved = applySubjectDeletion(base, 'mat', { kind: 'move-events', toSubjectId: 'fis' });
    expect(moved.focusSessions[0]?.subjectId).toBe('fis');
    const deleted = applySubjectDeletion(base, 'mat', { kind: 'delete-events' });
    expect(deleted.focusSessions[0]?.subjectId).toBeNull();
    expect(dataSnapshotSchema.safeParse(deleted).success).toBe(true);
  });

  it('excluir matéria sem eventos também desfaz o vínculo da sessão', () => {
    const base = makeSnapshot({
      subjects: [subject('a')],
      focusSessions: [session({ subjectId: 'a' })],
    });
    expect(applySubjectDeletion(base, 'a').focusSessions[0]?.subjectId).toBeNull();
  });
});
