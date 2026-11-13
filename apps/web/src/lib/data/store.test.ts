import { describe, expect, it } from 'vitest';
import { subtaskProgress } from '@daily/shared';
import { createDataStore } from './store';
import { MemoryStorage, STORAGE_KEY } from './local-storage-repository';
import { exam, memoryRepo, snapshot } from './test-utils';
import { navCounts } from './selectors';
import { task } from './test-utils';

function setup() {
  const { repo, storage } = memoryRepo();
  repo.replaceAll(snapshot());
  let n = 100;
  return { store: createDataStore(repo, () => `n-${++n}`), storage };
}

describe('store de dados', () => {
  const subtasksOf = (store: ReturnType<typeof setup>['store'], id: string) =>
    [...(store.getState().events.find((e) => e.id === id)?.subtasks ?? [])].sort(
      (a, b) => a.order - b.order,
    );

  it('marcar subtarefa persiste e atualiza o progresso', () => {
    const { store, storage } = setup();
    store.getState().toggleSubtask('e1', 'e1-c1');
    expect(subtaskProgress(subtasksOf(store, 'e1')).ratio).toBe(1);
    expect(storage.getItem(STORAGE_KEY)).toContain('"done": true');
  });

  it('subtarefas em qualquer tipo: adicionar, renomear, reordenar e excluir', () => {
    const { store } = setup();
    const s = store.getState();
    s.addSubtask('t1', 'Ler o enunciado');
    s.addSubtask('t1', 'Escrever');
    s.addSubtask('t1', '   ');
    expect(subtasksOf(store, 't1').map((c) => [c.title, c.order])).toEqual([
      ['Ler o enunciado', 0],
      ['Escrever', 1],
    ]);
    const [first, second] = subtasksOf(store, 't1');
    s.renameSubtask('t1', first!.id, 'Ler tudo');
    s.moveSubtask('t1', second!.id, 'up');
    expect(subtasksOf(store, 't1').map((c) => c.title)).toEqual(['Escrever', 'Ler tudo']);
    s.deleteSubtask('t1', second!.id);
    expect(subtasksOf(store, 't1').map((c) => [c.title, c.order])).toEqual([['Ler tudo', 0]]);
  });

  it('adiciona conteúdo na prova no fim, com ordem sequencial', () => {
    const { store } = setup();
    store.getState().addSubtask('e1', 'Integrais');
    expect(
      subtasksOf(store, 'e1')
        .map((c) => [c.title, c.order])
        .at(-1),
    ).toEqual(['Integrais', 2]);
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
    const copy = store.getState().duplicateEvent('e1', new Date(2026, 10, 20, 10, 0));
    expect(copy?.title).toBe('Prova e1 (cópia)');
    expect(copy?.createdAt).toBe('2026-11-20T10:00:00');
    expect(store.getState().events).toHaveLength(3);
  });

  it('falha ao gravar vira saveError, sem lançar', () => {
    const { store, storage } = setup();
    storage.setItem = () => {
      throw new Error('cheio');
    };
    expect(() => store.getState().createSubject({ name: 'X', color: 'ciano' })).not.toThrow();
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
  it('conta provas abertas nos próximos 14 dias e tarefas pendentes (com as atrasadas)', () => {
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
    expect(navCounts(events, now)).toEqual({ provas: 1, tarefas: 2, habitos: 0 });
    expect(navCounts(events, now, 3).habitos).toBe(3);
  });
});
