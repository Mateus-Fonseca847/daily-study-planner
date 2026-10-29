import {
  activeFocusSchema,
  createInitialSnapshot,
  dataSnapshotSchema,
  focusSessionSchema,
  goalLogSchema,
  goalSchema,
  preferencesSchema,
  studyEventSchema,
  subjectSchema,
  waterLogSchema,
  type ActiveFocus,
  type DataSnapshot,
  type FocusSession,
  type Goal,
  type GoalLog,
  type Preferences,
  type StudyEvent,
  type Subject,
  type WaterLog,
} from '@daily/shared';
import { toLocalIso } from '../dates';
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

export const STORAGE_KEY = 'daily:v2';
/** Chave do formato anterior (v1): lida uma vez na migração e nunca mais alterada. */
export const LEGACY_KEY = 'daily:v1';
/** Cópia do dado v1 feita ANTES de migrar para o v2. */
export const PRE_MIGRATION_KEY = `${LEGACY_KEY}:pre-v2`;
export const BACKUP_KEY = `${STORAGE_KEY}:backup`;
export const CORRUPT_KEY = `${STORAGE_KEY}:corrupt`;
/** Sessão de foco ativa (fora do snapshot e do backup). */
export const FOCUS_KEY = `${STORAGE_KEY}:focus`;

/** Chaves cujo valor muda o que a UI mostra (usadas pelo evento `storage`). */
export const WATCHED_KEYS: readonly string[] = [STORAGE_KEY, FOCUS_KEY];

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

  upsert(item: T): T {
    const next = this.schema.parse(item);
    const items = this.read();
    this.write(
      items.some((x) => x.id === next.id)
        ? items.map((x) => (x.id === next.id ? next : x))
        : [...items, next],
    );
    return next;
  }

  delete(id: string): void {
    this.write(this.read().filter((item) => item.id !== id));
  }
}

export interface LocalStorageOptions {
  newId?: () => string;
  /** Relógio injetável (data de criação das metas padrão, `savedAt`). */
  now?: () => Date;
}

export class LocalStorageRepository implements DataRepository {
  readonly subjects: EntityRepository<Subject>;
  readonly events: EntityRepository<StudyEvent>;
  readonly goals: EntityRepository<Goal>;
  readonly goalLogs: EntityRepository<GoalLog>;
  readonly waterLogs: EntityRepository<WaterLog>;
  readonly focusSessions: EntityRepository<FocusSession>;
  readonly preferences: DataRepository['preferences'];
  readonly focusActive: DataRepository['focusActive'];
  issue: LoadIssue | null = null;

  private state: DataSnapshot;
  private readonly now: () => Date;

  constructor(
    private readonly storage: StorageLike,
    options: LocalStorageOptions = {},
  ) {
    const newId = options.newId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
    this.state = createInitialSnapshot(toLocalIso(this.now()));
    this.load();

    const collection = <T extends { id: string }>(
      key: 'subjects' | 'events' | 'goals' | 'goalLogs' | 'waterLogs' | 'focusSessions',
      schema: Parser<T>,
    ) =>
      new Collection<T>(
        () => this.state[key] as unknown as T[],
        (items) => this.commit({ ...this.state, [key]: items }),
        schema,
        newId,
      );
    this.subjects = collection<Subject>('subjects', subjectSchema);
    this.events = collection<StudyEvent>('events', studyEventSchema);
    this.goals = collection<Goal>('goals', goalSchema);
    this.goalLogs = collection<GoalLog>('goalLogs', goalLogSchema);
    this.waterLogs = collection<WaterLog>('waterLogs', waterLogSchema);
    this.focusSessions = collection<FocusSession>('focusSessions', focusSessionSchema);

    this.preferences = {
      get: () => this.state.preferences,
      update: (patch) => {
        const next: Preferences = preferencesSchema.parse({ ...this.state.preferences, ...patch });
        this.commit({ ...this.state, preferences: next });
        return next;
      },
    };
    this.focusActive = {
      get: () => this.readActive(),
      set: (active) => {
        try {
          if (active === null) this.storage.removeItem(FOCUS_KEY);
          else this.storage.setItem(FOCUS_KEY, JSON.stringify(activeFocusSchema.parse(active)));
        } catch (error) {
          throw new StorageWriteError(error);
        }
      },
    };
  }

  snapshot(): DataSnapshot {
    return this.state;
  }

  replaceAll(snapshot: DataSnapshot): void {
    this.commit(dataSnapshotSchema.parse(snapshot));
  }

  reload(): void {
    this.issue = null;
    this.state = createInitialSnapshot(toLocalIso(this.now()));
    this.load();
  }

  restoreBackup(): boolean {
    const raw = this.storage.getItem(BACKUP_KEY);
    const result = raw === null ? null : parseEnvelope(raw, this.now());
    if (!result?.ok) return false;
    this.issue = null;
    this.commit(result.snapshot);
    return true;
  }

  startFresh(): void {
    this.issue = null;
  }

  private readActive(): ActiveFocus | null {
    const raw = this.storage.getItem(FOCUS_KEY);
    if (raw === null) return null;
    try {
      const parsed = activeFocusSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private load(): void {
    const current = this.storage.getItem(STORAGE_KEY);
    if (current !== null) return this.loadRaw(current, false);
    const legacy = this.storage.getItem(LEGACY_KEY);
    if (legacy !== null) return this.loadRaw(legacy, true);
  }

  private loadRaw(raw: string, fromLegacy: boolean): void {
    const result = parseEnvelope(raw, this.now());
    if (result.ok) {
      this.state = result.snapshot;
      if (fromLegacy) {
        // Migração v1 → v2: guarda o original ANTES de gravar no formato novo.
        this.writeSafely(PRE_MIGRATION_KEY, raw);
        this.persist();
      } else if (result.migratedFrom !== null) {
        this.persist(); // dado salvo em versão antiga: regrava migrado (o original vira backup)
      }
      return;
    }
    // Dado corrompido: guarda o original para recuperação manual e segue com o estado inicial.
    this.writeSafely(CORRUPT_KEY, raw);
    const backup = this.storage.getItem(BACKUP_KEY);
    this.issue = {
      kind: 'corrupt',
      message: result.error,
      hasBackup: backup !== null && parseEnvelope(backup, this.now()).ok,
    };
  }

  private writeSafely(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      /* sem espaço: o aviso ao usuário continua valendo */
    }
  }

  private commit(next: DataSnapshot): void {
    this.state = next;
    this.persist();
  }

  private persist(): void {
    try {
      const current = this.storage.getItem(STORAGE_KEY);
      // O backup é sempre o último estado válido anterior; nunca um dado corrompido.
      if (current !== null && parseEnvelope(current, this.now()).ok) {
        this.storage.setItem(BACKUP_KEY, current);
      }
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
