import { describe, expect, it } from 'vitest';
import { parseQuickEntry } from './quick-parse';

// Terça, 10/11/2026, 10h.
const NOW = new Date(2026, 10, 10, 10, 0);
const parse = (text: string) => parseQuickEntry(text, NOW);

describe('parseQuickEntry', () => {
  it('“Treinar toda segunda 19h”: série semanal, primeira segunda à frente, 19:00', () => {
    expect(parse('Treinar toda segunda 19h')).toEqual({
      title: 'Treinar',
      date: '2026-11-16',
      time: '19:00',
      recurrence: { freq: 'semanal', interval: 1, weekdays: [1], end: { kind: 'nunca' } },
      understood: ['16/11', '19:00', 'Toda segunda'],
    });
  });

  it('hoje, amanhã, dia da semana e hora (19h, 19h30, 19:30, “às”)', () => {
    expect(parse('Pagar conta hoje')).toMatchObject({ title: 'Pagar conta', date: '2026-11-10' });
    expect(parse('Ligar pro João amanhã às 9h30')).toMatchObject({
      title: 'Ligar pro João',
      date: '2026-11-11',
      time: '09:30',
      understood: ['amanhã', '09:30'],
    });
    expect(parse('Revisar sexta 19:30')).toMatchObject({
      title: 'Revisar',
      date: '2026-11-13',
      time: '19:30',
    });
    expect(parse('Reunião na terça-feira')).toMatchObject({ title: 'Reunião', date: '2026-11-10' });
    expect(parse('Café 7h').time).toBe('07:00');
  });

  it('todo dia, dias úteis, toda segunda e quarta, a cada N, todo dia N', () => {
    expect(parse('Ler todo dia').recurrence).toEqual({
      freq: 'diaria',
      interval: 1,
      end: { kind: 'nunca' },
    });
    expect(parse('Estudar dias úteis').recurrence?.weekdays).toEqual([1, 2, 3, 4, 5]);
    const mw = parse('Treino toda segunda e quarta 18h');
    expect(mw).toMatchObject({ title: 'Treino', date: '2026-11-11', time: '18:00' });
    expect(mw.recurrence?.weekdays).toEqual([1, 3]);
    expect(parse('Corrida toda segunda, quarta e sexta').recurrence?.weekdays).toEqual([1, 3, 5]);
    expect(parse('Regar plantas a cada 2 dias').recurrence).toMatchObject({
      freq: 'diaria',
      interval: 2,
    });
    expect(parse('Faxina a cada 2 semanas').recurrence).toMatchObject({
      freq: 'semanal',
      interval: 2,
    });
    const rent = parse('Aluguel todo dia 5');
    expect(rent).toMatchObject({ title: 'Aluguel', date: '2026-12-05' });
    expect(rent.recurrence).toMatchObject({ freq: 'mensal', monthDay: 5 });
    expect(parse('Backup todo mês').recurrence?.freq).toBe('mensal');
    expect(parse('Aniversário todo ano').recurrence?.freq).toBe('anual');
  });

  it('término: por N vezes e até DD/MM (vira o ano se já passou)', () => {
    expect(parse('Fisioterapia toda terça por 10 vezes').recurrence?.end).toEqual({
      kind: 'apos',
      count: 10,
    });
    expect(parse('Plantão todo dia até 20/12').recurrence?.end).toEqual({
      kind: 'em',
      date: '2026-12-20',
    });
    expect(parse('Curso toda quinta até 10/02').recurrence?.end).toEqual({
      kind: 'em',
      date: '2027-02-10',
    });
    expect(parse('Plantão todo dia até 20/12').understood.at(-1)).toBe('Todo dia, até 20/12');
  });

  it('ambiguidades: “todo dia 5” não é “todo dia”; dia da semana sozinho não repete', () => {
    expect(parse('Pagar todo dia 5').recurrence?.freq).toBe('mensal');
    expect(parse('Pagar segunda').recurrence).toBeUndefined();
    // “por 3 vezes” sem repetição não é entendido: fica no título.
    expect(parse('Lavar o carro por 3 vezes').title).toBe('Lavar o carro por 3 vezes');
  });

  it('lixo e o que não entende ficam no título, sem erro', () => {
    expect(parse('Comprar 2 kg de arroz')).toEqual({
      title: 'Comprar 2 kg de arroz',
      understood: [],
    });
    expect(parse('Treino 25h')).toEqual({ title: 'Treino 25h', understood: [] });
    expect(parse('todo dia 40').recurrence).toBeUndefined();
    expect(parse('   ')).toEqual({ title: '', understood: [] });
    // Só a expressão: o título continua sendo o texto (nada vazio).
    expect(parse('amanhã').title).toBe('amanhã');
  });
});
