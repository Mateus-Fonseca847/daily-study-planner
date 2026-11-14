import { describe, expect, it } from 'vitest';
import { subtaskProgress, type EventType } from '@daily/shared';
import { exam, task } from '../data/test-utils';
import { moveSubtask } from '../data/subtasks';
import { chipStyle } from '../event-meta';
import { filterByType, pendingNow, taskSections } from './sections';
import { parseTypeFilter } from './type-filter-store';

// Terça, 10/11/2026, 12:00 (semana de segunda 09 a domingo 15).
const NOW = new Date(2026, 10, 10, 12, 0);
const due = (id: string, iso: string, patch = {}) => task(id, { start: iso, end: iso, ...patch });

describe('taskSections', () => {
  const events = [
    due('atrasada-ontem', '2026-11-09T18:00:00'),
    due('atrasada-hoje', '2026-11-10T08:00:00'),
    due('hoje', '2026-11-10T18:00:00'),
    due('amanha', '2026-11-11T09:00:00'),
    due('semana', '2026-11-15T09:00:00'),
    due('em-15-dias', '2026-11-25T09:00:00'),
    due('ano-que-vem', '2027-03-01T09:00:00'),
    due('cancelada', '2026-11-12T09:00:00', { status: 'cancelado' }),
    due('feita', '2026-11-08T09:00:00', { status: 'concluido' }),
    due('feita-antiga', '2026-09-01T09:00:00', { status: 'concluido' }),
    exam('prova', null, { start: '2026-11-20T08:00:00', end: '2026-11-20T10:00:00' }),
  ];
  const sections = taskSections(events, NOW);
  const ids = (list: readonly { id: string }[]) => list.map((e) => e.id);

  it('atrasadas: prazo antes de agora; hoje: o resto do dia', () => {
    expect(ids(sections.atrasadas)).toEqual(['atrasada-ontem', 'atrasada-hoje']);
    expect(ids(sections.hoje)).toEqual(['hoje']);
  });

  it('próximas: todas as futuras, sem limite de 7 dias, agrupadas', () => {
    expect(sections.proximas.map((g) => [g.group, ids(g.items)])).toEqual([
      ['amanha', ['amanha']],
      ['esta-semana', ['semana']],
      ['mais-tarde', ['prova', 'em-15-dias', 'ano-que-vem']],
    ]);
  });

  it('concluídas dos últimos 30 dias, mais recentes primeiro; canceladas ficam de fora', () => {
    expect(ids(sections.concluidas)).toEqual(['feita']);
    const all = [
      ...sections.atrasadas,
      ...sections.hoje,
      ...sections.proximas.flatMap((g) => g.items),
    ];
    expect(ids(all)).not.toContain('cancelada');
  });
});

describe('filtro por tipo', () => {
  const events = [task('t'), exam('p'), task('e', { type: 'especial' })];
  const pick = (types: EventType[]) => filterByType(events, new Set(types)).map((e) => e.id);

  it('vazio = todos; qualquer combinação de tipos', () => {
    expect(pick([])).toEqual(['t', 'p', 'e']);
    expect(pick(['tarefa'])).toEqual(['t']);
    expect(pick(['prova', 'especial'])).toEqual(['p', 'e']);
    expect(pick(['tarefa', 'prova', 'especial'])).toEqual(['t', 'p', 'e']);
  });

  it('lê o valor salvo com segurança', () => {
    expect([...parseTypeFilter('["prova","especial"]')]).toEqual(['prova', 'especial']);
    expect([...parseTypeFilter('["estudo","prova"]')]).toEqual(['prova']);
    expect(parseTypeFilter('quebrado').size).toBe(0);
    expect(parseTypeFilter(null).size).toBe(0);
  });
});

describe('subtarefas', () => {
  const list = [
    { id: 'a', title: 'A', done: true, order: 0 },
    { id: 'b', title: 'B', done: false, order: 1 },
    { id: 'c', title: 'C', done: false, order: 2 },
  ];

  it('progresso calculado pelas subtarefas', () => {
    expect(subtaskProgress(list)).toEqual({ done: 1, total: 3, ratio: 1 / 3 });
  });

  it('subir/descer troca de posição e renumera; nas pontas não faz nada', () => {
    expect(moveSubtask(list, 'c', 'up').map((s) => [s.id, s.order])).toEqual([
      ['a', 0],
      ['c', 1],
      ['b', 2],
    ]);
    expect(moveSubtask(list, 'a', 'up').map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(moveSubtask(list, 'c', 'down').map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('cores dos chips', () => {
  it('tarefa usa a cor do status; prova e especial mantêm a do tipo', () => {
    expect(chipStyle({ type: 'tarefa', status: 'pendente' }).chip).toContain('pendente');
    expect(chipStyle({ type: 'tarefa', status: 'concluido' }).chip).toContain('concluido');
    expect(chipStyle({ type: 'tarefa', status: 'cancelado' }).chip).toContain('cancelado');
    expect(chipStyle({ type: 'prova', status: 'concluido' }).chip).toContain('prova');
    expect(chipStyle({ type: 'especial', status: 'cancelado' }).chip).toContain('especial');
  });

  it('concluída é riscada; cancelada é riscada e esmaecida', () => {
    expect(chipStyle({ type: 'tarefa', status: 'pendente' }).title).toBe('');
    expect(chipStyle({ type: 'prova', status: 'concluido' }).title).toBe('line-through');
    expect(chipStyle({ type: 'tarefa', status: 'cancelado' }).title).toBe(
      'line-through opacity-60',
    );
  });
});

describe('séries na página Tarefas', () => {
  // Terça 10/11/2026, 12:00. Série diária às 09:00 desde 01/11 e semanal (seg/qua) às 19h.
  const daily = task('diaria', {
    title: 'Ler',
    start: '2026-11-01T09:00:00',
    end: '2026-11-01T09:00:00',
    recurrence: { freq: 'diaria', interval: 1, end: { kind: 'nunca' } },
  });
  const weekly = task('semanal', {
    title: 'Treino',
    start: '2026-11-02T19:00:00',
    end: '2026-11-02T20:00:00',
    recurrence: { freq: 'semanal', interval: 1, weekdays: [1, 3], end: { kind: 'nunca' } },
  });
  const done = (id: string, status: 'concluido' | 'cancelado' = 'concluido') => {
    const [eventId, originalDate] = id.split('@') as [string, string];
    return { id, eventId, originalDate, kind: 'alterada' as const, status };
  };
  const ids = (list: readonly { id: string }[]) => list.map((e) => e.id);

  it('hoje mostra as ocorrências do dia; atrasadas só dos últimos 7 dias; o resto é perdido', () => {
    const s = taskSections([daily, weekly], NOW, [done('diaria@2026-11-09')]);
    // Hoje às 09:00 já passou (12:00): vai para atrasadas, como uma tarefa avulsa.
    expect(ids(s.hoje)).toEqual([]);
    expect(ids(s.atrasadas)).toEqual([
      'diaria@2026-11-03',
      'diaria@2026-11-04',
      'semanal@2026-11-04',
      'diaria@2026-11-05',
      'diaria@2026-11-06',
      'diaria@2026-11-07',
      'diaria@2026-11-08',
      'semanal@2026-11-09',
      'diaria@2026-11-10',
    ]);
    expect(ids(s.perdidas)).toEqual([
      'diaria@2026-11-01',
      'diaria@2026-11-02',
      'semanal@2026-11-02',
    ]);
    expect(ids(s.concluidas)).toEqual(['diaria@2026-11-09']);
  });

  it('próximas: só a próxima ocorrência de cada série, com “+N nesta semana”', () => {
    const s = taskSections([daily, weekly], NOW, []);
    const items = s.proximas.flatMap((g) => g.items.map((i) => [i.id, i.moreThisWeek]));
    // Semana de segunda a domingo: até 15/11. Diária: 11 (+4: 12–15). Semanal: 11 (+0).
    expect(items).toEqual([
      ['diaria@2026-11-11', 4],
      ['semanal@2026-11-11', 0],
    ]);
    expect(s.proximas[0]?.group).toBe('amanha');
  });

  it('próxima ocorrência pendente pula as concluídas e as puladas', () => {
    const s = taskSections([weekly], NOW, [
      done('semanal@2026-11-11'),
      { id: 'semanal@2026-11-16', eventId: 'semanal', originalDate: '2026-11-16', kind: 'pulada' },
    ]);
    expect(s.proximas.flatMap((g) => ids(g.items))).toEqual(['semanal@2026-11-18']);
  });

  it('o distintivo da sidebar conta ocorrências (avulsas + pendentes até hoje, dentro de 7 dias)', () => {
    const exceptions = [done('semanal@2026-11-09'), done('diaria@2026-11-10')];
    // Diária: 03–09 pendentes (7); semanal: 04 pendente (1); avulsa (1, prazo hoje 23:59).
    expect(pendingNow([daily, weekly, task('avulsa')], exceptions, NOW)).toHaveLength(9);
    expect(pendingNow([daily, weekly], exceptions, NOW)).toHaveLength(8);
  });
});
