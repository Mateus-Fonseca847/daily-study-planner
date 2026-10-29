import {
  dataSnapshotSchema,
  EMPTY_SNAPSHOT,
  studyEventSchema,
  subjectSchema,
  type DataSnapshot,
  type StudyEvent,
  type Subject,
} from '@daily/shared';
import { parseEnvelope, serializeEnvelope } from './envelope';
import {
  NotFoundError,
  StorageWriteError,
  type DataRepository,
  type Draft,
  type EntityRepository,
  type LoadIssue,
  type Patch,
} from './repository';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = 'daily:v1';
export const BACKUP_KEY = `${STORAGE_KEY}:backup`;
export const CORRUPT_KEY = `${STORAGE_KEY}:corrupt`;

interface Parser<T> {
  parse(input: unknown): T;
}

/** Coleção genérica sobre uma lista que vive no estado do repositório. */
class Collection<T extends { id: string }> implements EntityRepository<T> {
  constructor(
    private readonly read: () => T[],
    private readonly write: (items: T[]) => void,
    private readonly schema: Parser<T>,
    private readonly newId: () => string,
  ) {}

  list(): T[] {
    return [...this.read()];
  }

  get(id: string): T | undefined {
    return this.read().find((item) => item.id === id);
  }

  create(draft: Draft<T>): T {
    const item = this.schema.parse({ ...draft, id: this.newId() });
    this.write([...this.read(), item]);
    return item;
  }

  update(id: string, patch: Patch<T>): T {
    const current = this.get(id);
    if (!current) throw new NotFoundError(id);
    const next = this.schema.parse({ ...current, ...patch, id });
    this.write(this.read().map((item) => (item.id === id ? next : item)));
    return next;
  }

  delete(id: string): void {
    this.write(this.read().filter((item) => item.id !== id));
  }
}

export interface LocalStorageOptions {
  newId?: () => string;
  now?: () => Date;
}

export class LocalStorageRepository implements DataRepository {
  readonly subjects: EntityRepository<Subject>;
  readonly events: EntityRepository<StudyEvent>;
  issue: LoadIssue | null = null;

  private state: DataSnapshot = EMPTY_SNAPSHOT;
  private readonly now: () => Date;

  constructor(
    private readonly storage: StorageLike,
    options: LocalStorageOptions = {},
  ) {
    const newId = options.newId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
    this.load();
    this.subjects = new Collection<Subject>(
      () => this.state.subjects,
      (subjects) => this.commit({ ...this.state, subjects }),
      subjectSchema,
      newId,
    );
    this.events = new Collection<StudyEvent>(
      () => this.state.events,
      (events) => this.commit({ ...this.state, events }),
      studyEventSchema,
      newId,
    );
  }

  snapshot(): DataSnapshot {
    return this.state;
  }

  replaceAll(snapshot: DataSnapshot): void {
    this.commit(dataSnapshotSchema.parse(snapshot));
  }

  restoreBackup(): boolean {
    const raw = this.storage.getItem(BACKUP_KEY);
    const result = raw === null ? null : parseEnvelope(raw);
    if (!result?.ok) return false;
    this.issue = null;
    this.commit(result.snapshot);
    return true;
  }

  startFresh(): void {
    this.issue = null;
  }

  private load(): void {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const result = parseEnvelope(raw);
    if (result.ok) {
      this.state = result.snapshot;
      // Dado de versão antiga: regrava já migrado (o original vira backup).
      if (result.migratedFrom !== null) this.persist();
      return;
    }
    // Dado corrompido: guarda o original para recuperação manual e segue vazio.
    try {
      this.storage.setItem(CORRUPT_KEY, raw);
    } catch {
      /* sem espaço: o aviso ao usuário continua valendo */
    }
    const backup = this.storage.getItem(BACKUP_KEY);
    this.issue = {
      kind: 'corrupt',
      message: result.error,
      hasBackup: backup !== null && parseEnvelope(backup).ok,
    };
  }

  private commit(next: DataSnapshot): void {
    this.state = next;
    this.persist();
  }

  private persist(): void {
    try {
      const current = this.storage.getItem(STORAGE_KEY);
      // O backup é sempre o último estado válido anterior; nunca um dado corrompido.
      if (current !== null && parseEnvelope(current).ok) this.storage.setItem(BACKUP_KEY, current);
      this.storage.setItem(STORAGE_KEY, serializeEnvelope(this.state, this.now()));
    } catch (error) {
      throw new StorageWriteError(error);
    }
  }
}

/** Armazenamento em memória (fixture, testes e fallback quando o localStorage é inacessível). */
export class MemoryStorage implements StorageLike {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}
