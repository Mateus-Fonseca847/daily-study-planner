import { describe, expect, it } from 'vitest';
import { block, exam, subject, task } from '../data/test-utils';
import { buildLinkGroups, decodeLink, describeLink, encodeLink } from './link';

const now = new Date(2026, 10, 10, 10, 0); // 10/11/2026 10:00
const events = [
  exam('futura', 'mat', { start: '2026-11-12T09:00:00', end: '2026-11-12T11:00:00' }),
  exam('passada', 'mat', { start: '2026-11-01T09:00:00', end: '2026-11-01T11:00:00' }),
  exam('cancelada', 'mat', {
    status: 'cancelado',
    start: '2026-11-13T09:00:00',
    end: '2026-11-13T10:00:00',
  }),
  block('hoje', 'mat', null),
  { ...block('ontem'), start: '2026-11-09T14:00:00', end: '2026-11-09T15:00:00' },
  {
    ...block('feito'),
    start: '2026-11-10T08:00:00',
    end: '2026-11-10T09:00:00',
    status: 'concluido' as const,
  },
  task('tarefa'),
].map((e) =>
  e.id === 'hoje' ? { ...e, start: '2026-11-10T15:00:00', end: '2026-11-10T16:00:00' } : e,
);

describe('vínculo da sessão (“Estudando”)', () => {
  it('codifica e decodifica o valor do select', () => {
    const cases = [
      ['', { subjectId: null, examId: null, blockId: null }],
      ['s:mat', { subjectId: 'mat', examId: null, blockId: null }],
      ['e:e1', { subjectId: null, examId: 'e1', blockId: null }],
      ['b:b1', { subjectId: null, examId: null, blockId: 'b1' }],
    ] as const;
    for (const [value, link] of cases) {
      expect(decodeLink(value)).toEqual(link);
      expect(encodeLink(link)).toBe(value);
    }
  });

  it('lista matérias, provas futuras e blocos de hoje ainda abertos', () => {
    const groups = buildLinkGroups([subject('mat', 'Matemática')], events, now);
    expect(groups.map((g) => g.label)).toEqual(['Matérias', 'Provas', 'Blocos de estudo de hoje']);
    expect(groups[1]?.options.map((o) => o.value)).toEqual(['e:futura']); // sem passada nem cancelada
    expect(groups[2]?.options).toEqual([{ value: 'b:hoje', label: '15:00 · Bloco hoje' }]);
  });

  it('omite grupos vazios', () => {
    expect(buildLinkGroups([], [], now)).toEqual([]);
  });

  it('descreve o vínculo para o resumo, tolerando itens apagados', () => {
    const subjects = [subject('mat', 'Matemática')];
    expect(describeLink({ subjectId: 'mat', examId: null, blockId: null }, subjects, events)).toBe(
      'Matemática',
    );
    expect(
      describeLink({ subjectId: null, examId: 'futura', blockId: null }, subjects, events),
    ).toBe('Prova: Prova futura');
    expect(describeLink({ subjectId: null, examId: null, blockId: 'hoje' }, subjects, events)).toBe(
      'Bloco: Bloco hoje',
    );
    expect(
      describeLink({ subjectId: null, examId: 'sumiu', blockId: null }, subjects, events),
    ).toBeNull();
    expect(
      describeLink({ subjectId: null, examId: null, blockId: null }, subjects, events),
    ).toBeNull();
  });
});
