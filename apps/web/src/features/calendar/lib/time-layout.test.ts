import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '@daily/shared';
import {
  blockLines,
  eventSegments,
  hourRange,
  layoutSobreposicoes,
  mergeRanges,
  nowPct,
  positionPct,
  roundDownTo30,
  segmentOnDay,
  type Segment,
} from './time-layout';

const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const seg = (id: string, startMin: number, endMin: number): Segment => ({
  id,
  startMin,
  endMin,
  realMin: endMin - startMin,
});

describe('corte por dia', () => {
  it('evento no mesmo dia fica inteiro; fora do dia não gera segmento', () => {
    const start = '2026-10-29T09:00:00';
    const end = '2026-10-29T10:30:00';
    expect(segmentOnDay('a', start, end, '2026-10-29')).toMatchObject({
      startMin: h(9),
      endMin: h(10, 30),
    });
    expect(segmentOnDay('a', start, end, '2026-10-30')).toBeNull();
  });

  it('cruzando a meia-noite: um pedaço em cada dia', () => {
    const start = '2026-10-29T22:00:00';
    const end = '2026-10-30T01:30:00';
    expect(segmentOnDay('a', start, end, '2026-10-29')).toMatchObject({
      startMin: h(22),
      endMin: h(24),
    });
    expect(segmentOnDay('a', start, end, '2026-10-30')).toMatchObject({
      startMin: 0,
      endMin: h(1, 30),
      realMin: 90,
    });
    // Termina exatamente à meia-noite: não sobra pedaço vazio no dia seguinte.
    expect(segmentOnDay('a', start, '2026-10-30T00:00:00', '2026-10-30')).toBeNull();
  });

  it('duração mínima visual de 30 min (entrega sem duração e eventos curtos)', () => {
    const delivery = segmentOnDay('e', '2026-10-29T23:00:00', '2026-10-29T23:00:00', '2026-10-29');
    expect(delivery).toMatchObject({ startMin: h(23), endMin: h(23, 30), realMin: 0 });
    const short = segmentOnDay('e', '2026-10-29T10:00:00', '2026-10-29T10:10:00', '2026-10-29');
    expect(short?.endMin).toBe(h(10, 30));
    // Entrega às 23:59 cabe no fim do dia sem estourar as 24h.
    const late = segmentOnDay('e', '2026-10-29T23:59:00', '2026-10-29T23:59:00', '2026-10-29');
    expect(late && late.endMin - late.startMin).toBe(30);
    expect(late?.endMin).toBe(h(24));
  });

  it('eventSegments pega só os eventos que tocam o dia', () => {
    const events = [
      { id: 'a', start: '2026-10-29T09:00:00', end: '2026-10-29T10:00:00' },
      { id: 'b', start: '2026-10-30T09:00:00', end: '2026-10-30T10:00:00' },
    ] as StudyEvent[];
    expect(eventSegments(events, '2026-10-29').map((s) => s.id)).toEqual(['a']);
  });
});

describe('intervalo de horas e posição em %', () => {
  it('padrão 06h–24h e expansão para eventos fora dele', () => {
    expect(hourRange([])).toEqual({ startHour: 6, endHour: 24 });
    expect(hourRange([seg('a', h(9), h(10))])).toEqual({ startHour: 6, endHour: 24 });
    expect(hourRange([seg('a', h(4, 30), h(5, 30))])).toEqual({ startHour: 4, endHour: 24 });
    expect(hourRange([seg('a', h(0), h(1))])).toEqual({ startHour: 0, endHour: 24 });
    expect(
      mergeRanges([
        { startHour: 5, endHour: 24 },
        { startHour: 6, endHour: 24 },
      ]),
    ).toEqual({ startHour: 5, endHour: 24 });
  });

  it('posição em porcentagem do intervalo (não em pixels)', () => {
    const range = { startHour: 6, endHour: 24 };
    const pos = positionPct(seg('a', h(15), h(16)), range);
    expect(pos.top).toBeCloseTo((9 / 18) * 100);
    expect(pos.height).toBeCloseTo((1 / 18) * 100);
    // O mesmo evento em um intervalo expandido muda a %, não o evento.
    const wide = positionPct(seg('a', h(15), h(16)), { startHour: 0, endHour: 24 });
    expect(wide.top).toBeCloseTo((15 / 24) * 100);
  });

  it('linha de agora só aparece dentro do intervalo', () => {
    const range = { startHour: 6, endHour: 24 };
    expect(nowPct(h(15), range)).toBeCloseTo(50);
    expect(nowPct(h(5), range)).toBeNull();
    expect(nowPct(h(6), range)).toBe(0);
  });

  it('arredonda para baixo em múltiplos de 30 min', () => {
    const rounded = [h(14, 0), h(14, 29), h(14, 30), h(14, 59)].map(roundDownTo30);
    expect(rounded).toEqual([h(14), h(14), h(14, 30), h(14, 30)]);
  });
});

describe('layoutSobreposicoes', () => {
  const byId = (placed: ReturnType<typeof layoutSobreposicoes>) =>
    Object.fromEntries(placed.map((p) => [p.id, [p.column, p.columns]]));

  it('sem conflito: cada um em coluna única', () => {
    const placed = layoutSobreposicoes([seg('a', h(9), h(10)), seg('b', h(10), h(11))]);
    expect(byId(placed)).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it('dois e três simultâneos ficam lado a lado', () => {
    const two = layoutSobreposicoes([seg('a', h(9), h(10)), seg('b', h(9), h(10))]);
    expect(byId(two)).toEqual({ a: [0, 2], b: [1, 2] });
    const three = layoutSobreposicoes([
      seg('a', h(9), h(10)),
      seg('b', h(9, 30), h(10, 30)),
      seg('c', h(9, 15), h(9, 45)),
    ]);
    expect(byId(three)).toEqual({ a: [0, 3], c: [1, 3], b: [2, 3] });
  });

  it('encadeados dividem as colunas do grupo; depois do grupo volta a coluna única', () => {
    const placed = layoutSobreposicoes([
      seg('a', h(9), h(10)),
      seg('b', h(9, 30), h(10, 30)),
      seg('c', h(10), h(11)),
      seg('d', h(12), h(13)),
    ]);
    expect(byId(placed)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] });
  });

  it('mesmo início: o mais longo primeiro; evento dentro de outro ocupa outra coluna', () => {
    const placed = layoutSobreposicoes([
      seg('curto', h(9), h(9, 30)),
      seg('longo', h(9), h(12)),
      seg('dentro', h(10), h(11)),
    ]);
    expect(byId(placed)).toEqual({ longo: [0, 2], curto: [1, 2], dentro: [1, 2] });
  });

  it('não perde nem duplica nenhum item e nunca sobrepõe na mesma coluna', () => {
    const input = Array.from({ length: 12 }, (_, i) =>
      seg(`s${i}`, h(8) + (i % 5) * 20, h(8) + (i % 5) * 20 + 45 + (i % 3) * 30),
    );
    const placed = layoutSobreposicoes(input);
    expect(placed).toHaveLength(12);
    expect(new Set(placed.map((p) => p.id)).size).toBe(12);
    for (const a of placed) {
      for (const b of placed) {
        if (a.id < b.id && a.column === b.column) {
          expect(a.endMin <= b.startMin || b.endMin <= a.startMin).toBe(true);
        }
      }
    }
  });
});

describe('linhas por altura', () => {
  it('3 linhas quando cabe, 2 em blocos curtos e menos em colunas estreitas', () => {
    expect(blockLines({ startMin: 0, endMin: 60, columns: 1 })).toBe(3);
    expect(blockLines({ startMin: 0, endMin: 30, columns: 1 })).toBe(2);
    expect(blockLines({ startMin: 0, endMin: 60, columns: 2 })).toBe(3);
    expect(blockLines({ startMin: 0, endMin: 60, columns: 3 })).toBe(2);
    expect(blockLines({ startMin: 0, endMin: 30, columns: 3 })).toBe(1);
  });
});
