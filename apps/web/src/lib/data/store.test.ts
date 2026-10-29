import { describe, expect, it } from 'vitest';
import { examProgress, isExam } from '@daily/shared';
import { createDataStore } from './store';
import { MemoryStorage, STORAGE_KEY } from './local-storage-repository';
import { exam, memoryRepo, snapshot } from './test-utils';
import { navCounts } from './selectors';
import { filterTasks } from './task-filters';
import { task } from './test-utils';

function setup() {
  const { repo, storage } = memoryRepo();
  repo.replaceAll(snapshot());
  let n = 100;
  return { store: createDataStore(repo, () => `n-${++n}`), storage };
}

describe('store de dados', () => {
  it('marcar conteúdo persiste e atualiza o progresso', () => {
    const { store, storage } = setup();
    store.getState().toggleContent('e1', 'e1-c1');
    const e1 = store.getState().events.find((e) => e.id === 'e1');
    expect(e1 && isExam(e1) && examProgress(e1.contents).ratio).toBe(1);
    expect(storage.getItem(STORAGE_KEY)).toContain('"done": true');
  });

  it('adiciona conteúdo no fim, com ordem sequencial', () => {
    const { store } = setup();
    store.getState().addContent('e1', 'Integrais');
    const e1 = store.getState().events.find((e) => e.id === 'e1');
    expect(e1 && isExam(e1) && e1.contents.map((c) => [c.title, c.order]).at(-1)).toEqual([
      'Integrais',
      2,
    ]);
  });

  it('excluir e restaurar o snapshot anterior (desfazer)', () => {
    const { store } = setup();
    const before = store.getState().snapshot();
    store.getState().deleteEvent('e1');
    expect(store.getState().events.some((e) => e.id === 'e1')).toBe(false);
    store.getState().replaceAll(before);
    expect(store.getState().events.some((e) => e.id === 'e1')).toBe(true);
  });

  it('duplica um evento sem alterar o original', () => {
    const { store } = setup();
    const copy = store.getState().duplicateEvent('e1');
    expect(copy?.title).toBe('Prova e1 (cópia)');
    expect(store.getState().events).toHaveLength(4);
  });

  it('falha ao gravar vira saveError, sem lançar', () => {
    const { store, storage } = setup();
    storage.setItem = () => {
      throw new Error('cheio');
    };
    expect(() => store.getState().createSubject({ name: 'X', color: 'azul' })).not.toThrow();
    expect(store.getState().saveError).toMatch(/Não foi possível salvar/);
    expect(store.getState().subjects.some((s) => s.name === 'X')).toBe(true);
  });

  it('dado corrompido expõe `issue` e começa vazio', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, 'quebrado');
    const { repo } = memoryRepo(storage);
    const store = createDataStore(repo);
    expect(store.getState().issue).toMatchObject({ kind: 'corrupt' });
    expect(store.getState().events).toEqual([]);
    store.getState().startFresh();
    expect(store.getState().issue).toBeNull();
  });
});

describe('seletores da sidebar', () => {
  const now = new Date(2026, 10, 1, 12, 0);
  it('conta provas abertas nos próximos 14 dias e tarefas pendentes/atrasadas', () => {
    const events = [
      exam('perto', null, { start: '2026-11-10T09:00:00', end: '2026-11-10T11:00:00' }),
      exam('longe', null, { start: '2026-12-20T09:00:00', end: '2026-12-20T11:00:00' }),
      exam('passada', null, { start: '2026-10-20T09:00:00', end: '2026-10-20T11:00:00' }),
      exam('cancelada', null, {
        status: 'cancelado',
        start: '2026-11-05T09:00:00',
        end: '2026-11-05T10:00:00',
      }),
      task('aberta'),
      task('atrasada', { start: '2026-10-30T10:00:00', end: '2026-10-30T10:00:00' }),
      task('feita', { status: 'concluido' }),
    ];
    expect(navCounts(events, now)).toEqual({ provas: 1, tarefas: 2 });
  });
});

describe('filtros de tarefas', () => {
  const now = new Date(2026, 10, 10, 12, 0);
  const tasks = [
    task('hoje', { start: '2026-11-10T18:00:00', end: '2026-11-10T18:00:00' }),
    task('amanha', { start: '2026-11-11T18:00:00', end: '2026-11-11T18:00:00' }),
    task('d8', { start: '2026-11-18T18:00:00', end: '2026-11-18T18:00:00' }),
    task('atrasada', { start: '2026-11-09T18:00:00', end: '2026-11-09T18:00:00' }),
    task('hoje-cedo', { start: '2026-11-10T08:00:00', end: '2026-11-10T08:00:00' }),
    task('feita', {
      status: 'concluido',
      start: '2026-11-08T18:00:00',
      end: '2026-11-08T18:00:00',
    }),
  ];
  const ids = (f: Parameters<typeof filterTasks>[1]) => filterTasks(tasks, f, now).map((t) => t.id);

  it('cada filtro separa corretamente', () => {
    expect(ids('hoje')).toEqual(['hoje-cedo', 'hoje']);
    expect(ids('proximos')).toEqual(['hoje-cedo', 'hoje', 'amanha']);
    expect(ids('atrasadas')).toEqual(['atrasada', 'hoje-cedo']);
    expect(ids('concluidas')).toEqual(['feita']);
  });
});
