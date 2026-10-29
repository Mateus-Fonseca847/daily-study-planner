import { describe, expect, it } from 'vitest';
import { dataSnapshotSchema } from './snapshot';

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
    const result = dataSnapshotSchema.parse({ subjects, events: [event] });
    expect(result.events[0]).toMatchObject({ notes: '', contents: [] });
  });

  it('rejeita fim antes do início, matéria inexistente e prova inexistente', () => {
    expect(
      dataSnapshotSchema.safeParse({ subjects, events: [{ ...event, end: '2026-11-10T08:00:00' }] })
        .success,
    ).toBe(false);
    expect(dataSnapshotSchema.safeParse({ subjects: [], events: [event] }).success).toBe(false);
    const block = { ...event, id: 'b', type: 'estudo', examId: 'nao-existe' };
    expect(dataSnapshotSchema.safeParse({ subjects, events: [block] }).success).toBe(false);
  });
});
