import { describe, expect, it } from 'vitest';
import type { WaterLog } from '@daily/shared';
import {
  canEditWaterDay,
  describePlan,
  logsOfDay,
  planDayTotal,
  totalMl,
  validateEntry,
} from './day';
import { parseAgua, parseAguaTotal } from './parse';

const log = (id: string, ml: number, time: string, date = '2026-11-10'): WaterLog => ({
  id,
  date,
  ml,
  time,
});

describe('parseAgua', () => {
  it.each([
    ['300', 300],
    ['300 ml', 300],
    ['300ml', 300],
    ['300 ML', 300],
    ['0,3 l', 300],
    ['0.3 l', 300],
    ['1,5L', 1500],
    ['1.5 L', 1500],
    ['2 l', 2000],
    ['1,5 litros', 1500],
    ['1 litro', 1000],
    ['  250  ', 250],
    ['0,3333 l', 333], // arredonda para ml inteiro
  ])('%s → %i ml', (text, ml) => {
    expect(parseAgua(text)).toEqual({ ok: true, ml });
  });

  it('exige a unidade quando há decimais', () => {
    const result = parseAgua('0,3');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('unidade');
  });

  it('respeita os limites de 1 a 5000 ml', () => {
    expect(parseAgua('5000')).toEqual({ ok: true, ml: 5000 });
    expect(parseAgua('5 l')).toEqual({ ok: true, ml: 5000 });
    expect(parseAgua('1')).toEqual({ ok: true, ml: 1 });
    for (const text of ['0', '0 ml', '5001', '5,1 l', '20 l']) {
      const result = parseAgua(text);
      expect(result.ok, text).toBe(false);
      expect(!result.ok && result.error).toContain('1 a 5000 ml');
    }
  });

  it('rejeita lixo, vazio e números negativos, com mensagem em pt-BR', () => {
    for (const text of ['', '   ', 'abc', '3 copos', '-300', '1,2,3 l', 'ml', '1e3', '300 mls']) {
      const result = parseAgua(text);
      expect(result.ok, text).toBe(false);
      expect(!result.ok && result.error.length).toBeGreaterThan(10);
    }
    expect(parseAgua('abc')).toEqual({
      ok: false,
      error: 'Não entendi “abc”. Use, por exemplo, 300, 300 ml, 0,3 l ou 1,5L.',
    });
  });
});

describe('parseAguaTotal', () => {
  it('aceita de 0 a 20 L', () => {
    expect(parseAguaTotal('0')).toEqual({ ok: true, ml: 0 });
    expect(parseAguaTotal('0 l')).toEqual({ ok: true, ml: 0 });
    expect(parseAguaTotal('2,5 l')).toEqual({ ok: true, ml: 2500 });
    expect(parseAguaTotal('12000')).toEqual({ ok: true, ml: 12000 });
    expect(parseAguaTotal('20 l')).toEqual({ ok: true, ml: 20000 });
    const over = parseAguaTotal('20,1 l');
    expect(over.ok).toBe(false);
    expect(!over.ok && over.error).toContain('0 a 20 L');
  });

  it('mantém as mesmas regras de formato', () => {
    expect(parseAguaTotal('2,5').ok).toBe(false);
    expect(parseAguaTotal('x').ok).toBe(false);
  });
});

describe('validateEntry', () => {
  it('quantidade inteira de 1 a 5000 ml', () => {
    expect(validateEntry(250, [])).toBeNull();
    expect(validateEntry(0, [])).toContain('1 a 5000');
    expect(validateEntry(5001, [])).toContain('1 a 5000');
    expect(validateEntry(1.5, [])).toContain('1 a 5000');
  });

  it('o dia não passa de 20 L', () => {
    const others = Array.from({ length: 4 }, () => ({ ml: 4900 })); // 19,6 L
    expect(validateEntry(400, others)).toBeNull(); // exatamente 20 L
    expect(validateEntry(401, others)).toContain('20 L');
  });
});

describe('canEditWaterDay', () => {
  it('hoje e até 366 dias atrás; nunca o futuro', () => {
    expect(canEditWaterDay('2026-11-10', '2026-11-10')).toBe(true);
    expect(canEditWaterDay('2025-11-09', '2026-11-10')).toBe(true); // 366 dias
    expect(canEditWaterDay('2025-11-08', '2026-11-10')).toBe(false); // 367
    expect(canEditWaterDay('2026-11-11', '2026-11-10')).toBe(false);
  });
});

describe('logsOfDay e totalMl', () => {
  it('filtra o dia e ordena por horário (empate: ordem de gravação)', () => {
    const logs = [
      log('c', 100, '15:00'),
      log('a', 250, '08:00'),
      log('x', 999, '09:00', '2026-11-09'),
      log('b', 300, '15:00'),
    ];
    expect(logsOfDay(logs, '2026-11-10').map((l) => l.id)).toEqual(['a', 'c', 'b']);
    expect(totalMl(logsOfDay(logs, '2026-11-10'))).toBe(650);
  });
});

describe('planDayTotal', () => {
  const day = [log('a', 500, '08:00'), log('b', 250, '12:00'), log('c', 250, '18:00')]; // 1000

  it('igual: não muda nada', () => {
    const plan = planDayTotal(day, '2026-11-10', 1000, '20:00');
    expect(plan).toEqual({ next: day, removed: [], reduced: [], total: 1000 });
    expect(describePlan(plan)).toBeNull();
  });

  it('maior: acrescenta um registro com a diferença', () => {
    const plan = planDayTotal(day, '2026-11-10', 1750, '20:00');
    expect(plan.next).toHaveLength(4);
    expect(plan.next[3]).toEqual({ date: '2026-11-10', ml: 750, time: '20:00' });
    expect(plan.removed).toEqual([]);
    expect(totalMl(plan.next)).toBe(1750);
  });

  it('maior que 5000 ml: divide em blocos válidos', () => {
    const plan = planDayTotal([], '2026-11-10', 12_000, '20:00');
    expect(plan.next.map((e) => e.ml)).toEqual([5000, 5000, 2000]);
    expect(totalMl(plan.next)).toBe(12_000);
  });

  it('menor: remove os mais recentes e reduz o que sobra', () => {
    const plan = planDayTotal(day, '2026-11-10', 600, '20:00');
    // 1000 → 600: tira c (250) e reduz b de 250 para 100.
    expect(plan.removed.map((l) => l.id)).toEqual(['c']);
    expect(plan.reduced.map((l) => l.id)).toEqual(['b']);
    expect(plan.next.map((e) => `${e.id}:${e.ml}`)).toEqual(['a:500', 'b:100']);
    expect(plan.total).toBe(600);
    expect(describePlan(plan)).toBe('Isso removerá 1 registro e reduzirá 1 registro.');
  });

  it('menor, exato nos limites dos registros: só remove', () => {
    const plan = planDayTotal(day, '2026-11-10', 500, '20:00');
    expect(plan.removed.map((l) => l.id)).toEqual(['c', 'b']);
    expect(plan.reduced).toEqual([]);
    expect(describePlan(plan)).toBe('Isso removerá 2 registros.');
  });

  it('zero: remove todos', () => {
    const plan = planDayTotal(day, '2026-11-10', 0, '20:00');
    expect(plan.next).toEqual([]);
    expect(plan.removed).toHaveLength(3);
    expect(plan.total).toBe(0);
  });

  it('só considera o dia pedido', () => {
    const other = [...day, log('z', 400, '09:00', '2026-11-09')];
    const plan = planDayTotal(other, '2026-11-10', 0, '20:00');
    expect(plan.removed.map((l) => l.id)).not.toContain('z');
  });
});
