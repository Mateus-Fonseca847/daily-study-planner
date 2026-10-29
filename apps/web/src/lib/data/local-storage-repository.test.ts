import { describe, expect, it } from 'vitest';
import {
  LocalStorageRepository,
  MemoryStorage,
  BACKUP_KEY,
  CORRUPT_KEY,
  STORAGE_KEY,
} from './local-storage-repository';
import { StorageWriteError } from './repository';
import { block, exam, memoryRepo, snapshot } from './test-utils';

describe('LocalStorageRepository — CRUD', () => {
  it('cria, lê, atualiza e exclui matérias', () => {
    const { repo } = memoryRepo();
    const created = repo.subjects.create({ name: 'Física', color: 'violeta' });
    expect(created).toEqual({ id: 'id-1', name: 'Física', color: 'violeta' });
    expect(repo.subjects.get('id-1')).toEqual(created);

    repo.subjects.update('id-1', { name: 'Física II' });
    expect(repo.subjects.list()).toEqual([{ id: 'id-1', name: 'Física II', color: 'violeta' }]);

    repo.subjects.delete('id-1');
    expect(repo.subjects.list()).toEqual([]);
  });

  it('cria e atualiza eventos de tipos diferentes validando com o schema', () => {
    const { repo } = memoryRepo();
    const { id: _id, ...draft } = exam('x');
    void _id;
    const created = repo.events.create(draft);
    expect(created.type).toBe('prova');

    const updated = repo.events.update(created.id, { title: 'Prova final' });
    expect(updated.title).toBe('Prova final');
    expect(() => repo.events.update(created.id, { title: '' })).toThrow();
    expect(() => repo.events.update('nao-existe', { title: 'x' })).toThrow(/não encontrado/);
  });

  it('rejeita fim antes do início', () => {
    const { repo } = memoryRepo();
    const { id: _id, ...draft } = block('b');
    void _id;
    expect(() => repo.events.create({ ...draft, end: '2026-11-09T13:00:00' })).toThrow();
  });

  it('replaceAll rejeita referências quebradas', () => {
    const { repo } = memoryRepo();
    expect(() => repo.replaceAll({ subjects: [], events: [exam('e', 'fantasma')] })).toThrow();
    expect(repo.snapshot().events).toEqual([]);
  });
});

describe('LocalStorageRepository — persistência e versão', () => {
  it('grava na chave versionada e outra instância lê o mesmo dado', () => {
    const { repo, storage } = memoryRepo();
    repo.replaceAll(snapshot());
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}');
    expect(STORAGE_KEY).toBe('daily:v1');
    expect(saved).toMatchObject({ app: 'daily', version: 1 });

    const reopened = new LocalStorageRepository(storage);
    expect(reopened.snapshot()).toEqual(snapshot());
    expect(reopened.issue).toBeNull();
  });

  it('migra dados da versão 0 (status antigos, matérias sem cor, conteúdos sem ordem)', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 0,
        data: {
          subjects: [{ id: 'mat', name: 'Matemática' }],
          events: [
            {
              id: 'e1',
              type: 'prova',
              title: 'Prova',
              start: '2026-11-10T09:00:00',
              end: '2026-11-10T10:00:00',
              subjectId: 'mat',
              status: 'concluida',
              contents: [{ id: 'c1', title: 'Limites', done: true }],
            },
            {
              id: 'e2',
              type: 'estudo',
              title: 'Bloco',
              start: '2026-11-09T14:00:00',
              end: '2026-11-09T15:00:00',
              status: 'agendada',
            },
          ],
        },
      }),
    );
    const repo = new LocalStorageRepository(storage);
    expect(repo.issue).toBeNull();
    const [first, second] = repo.events.list();
    expect(first).toMatchObject({
      status: 'concluido',
      contents: [{ id: 'c1', order: 0 }],
      notes: '',
    });
    expect(second).toMatchObject({ status: 'pendente', subjectId: null, examId: null });
    expect(repo.subjects.list()[0]?.color).toBe('vermelho');
    // Regravado já na versão atual, com o original guardado como backup.
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').version).toBe(1);
    expect(JSON.parse(storage.getItem(BACKUP_KEY) ?? '{}').version).toBe(0);
  });

  it('o backup é o último estado válido anterior', () => {
    const { repo, storage } = memoryRepo();
    repo.subjects.create({ name: 'A', color: 'azul' });
    repo.subjects.create({ name: 'B', color: 'azul' });
    const backup = JSON.parse(storage.getItem(BACKUP_KEY) ?? '{}');
    expect(backup.data.subjects).toHaveLength(1);
  });
});

describe('LocalStorageRepository — dado corrompido', () => {
  const corruptCases: [string, string][] = [
    ['JSON inválido', '{nao eh json'],
    ['sem envelope', JSON.stringify({ subjects: [], events: [] })],
    ['versão do futuro', JSON.stringify({ version: 99, data: {} })],
    ['schema inválido', JSON.stringify({ version: 1, data: { subjects: 'x', events: [] } })],
    [
      'referência quebrada',
      JSON.stringify({ version: 1, data: { subjects: [], events: [exam('e', 'fantasma')] } }),
    ],
  ];

  it.each(corruptCases)(
    'não quebra com %s: abre vazio, avisa e guarda o original',
    (_name, raw) => {
      const storage = new MemoryStorage();
      storage.setItem(STORAGE_KEY, raw);
      const repo = new LocalStorageRepository(storage);
      expect(repo.snapshot()).toEqual({ subjects: [], events: [] });
      expect(repo.issue).toMatchObject({ kind: 'corrupt', hasBackup: false });
      expect(storage.getItem(CORRUPT_KEY)).toBe(raw);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw); // nada é sobrescrito até o usuário agir
    },
  );

  it('oferece restaurar o backup válido e limpa o aviso', () => {
    const { repo: good, storage } = memoryRepo();
    good.replaceAll(snapshot());
    good.subjects.create({ name: 'Nova', color: 'rosa' }); // cria o backup com `snapshot()`
    storage.setItem(STORAGE_KEY, '{quebrado');

    const repo = new LocalStorageRepository(storage);
    expect(repo.issue).toMatchObject({ kind: 'corrupt', hasBackup: true });
    expect(repo.restoreBackup()).toBe(true);
    expect(repo.issue).toBeNull();
    expect(repo.snapshot()).toEqual(snapshot());
  });

  it('gravar depois de um dado corrompido não destrói o backup bom', () => {
    const { repo: good, storage } = memoryRepo();
    good.replaceAll(snapshot());
    good.subjects.create({ name: 'Nova', color: 'rosa' });
    storage.setItem(STORAGE_KEY, '{quebrado');

    const repo = new LocalStorageRepository(storage);
    repo.subjects.create({ name: 'Depois', color: 'azul' });
    expect(JSON.parse(storage.getItem(BACKUP_KEY) ?? '{}').data.subjects).toHaveLength(2);
  });

  it('restoreBackup devolve false sem backup', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, 'lixo');
    expect(new LocalStorageRepository(storage).restoreBackup()).toBe(false);
  });
});

describe('LocalStorageRepository — falha de gravação', () => {
  it('lança StorageWriteError e mantém o dado na memória', () => {
    const storage = new MemoryStorage();
    const repo = new LocalStorageRepository(storage);
    storage.setItem = () => {
      throw new DOMException('cheio', 'QuotaExceededError');
    };
    expect(() => repo.subjects.create({ name: 'X', color: 'azul' })).toThrow(StorageWriteError);
    expect(repo.subjects.list()).toHaveLength(1);
  });
});
