import {
  activeFocusSchema,
  createInitialSnapshot,
  dataSnapshotSchema,
  focusSessionSchema,
  habitLogSchema,
  habitSchema,
  preferencesSchema,
  restDaySchema,
  studyEventSchema,
  subjectSchema,
  waterLogSchema,
  type ActiveFocus,
  type DataSnapshot,
  type FocusSession,
  type Habit,
  type HabitLog,
  type Onboarding,
  type Preferences,
  type RestDay,
  type StudyEvent,
  type Subject,
  type WaterLog,
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

export const STORAGE_KEY = 'daily:v6';
/** Chaves dos formatos anteriores: lidas uma vez na migração e nunca mais alteradas. */
export const LEGACY_V5_KEY = 'daily:v5';
export const LEGACY_V4_KEY = 'daily:v4';
export const LEGACY_V3_KEY = 'daily:v3';
export const LEGACY_V2_KEY = 'daily:v2';
export const LEGACY_KEY = 'daily:v1';
/** Cópia do dado v1 feita ANTES de migrar. */
export const PRE_MIGRATION_KEY = `${LEGACY_KEY}:pre-v2`;
/** Cópia do dado v2 feita ANTES de migrar para o v3. */
export const PRE_V3_KEY = `${LEGACY_V2_KEY}:pre-v3`;
/** Cópia do dado v3 feita ANTES de migrar para o v4. */
export const PRE_V4_KEY = `${LEGACY_V3_KEY}:pre-v4`;
/** Cópia do dado v4 feita ANTES de migrar para o v5. */
export const PRE_V5_KEY = `${LEGACY_V4_KEY}:pre-v5`;
/** Cópia do dado v5 feita ANTES de migrar para o v6. */
export const PRE_V6_KEY = `${LEGACY_V5_KEY}:pre-v6`;
/**
 * Cópia feita antes de migrar a partir de cada versão (`daily:vN:pre-vN+1`): o que o app daquela
 * versão tinha salvo. Usada no “rebase” da sincronização.
 */
export const PRE_MIGRATION_KEYS: Readonly<Record<number, string>> = {
  1: PRE_MIGRATION_KEY,
  2: PRE_V3_KEY,
  3: PRE_V4_KEY,
  4: PRE_V5_KEY,
  5: PRE_V6_KEY,
};
/** Quando a última migração de formato rodou (epoch ms): marca o prazo de limpeza. */
export const MIGRATED_AT_KEY = `${STORAGE_KEY}:migrated-at`;
/** Dias que as chaves dos formatos anteriores ficam guardadas depois da migração. */
export const LEGACY_RETENTION_DAYS = 30;
/** O que a limpeza remove: formatos v3 a v5, cópias pré-migração e marcas/backup antigos. */
const LEGACY_CLEANUP_KEYS = [
  LEGACY_V5_KEY,
  PRE_V6_KEY,
  `${LEGACY_V5_KEY}:backup`,
  `${LEGACY_V5_KEY}:corrupt`,
  `${LEGACY_V5_KEY}:migrated-at`,
  `${LEGACY_V5_KEY}:pre-sync`,
  LEGACY_V4_KEY,
  PRE_V5_KEY,
  `${LEGACY_V4_KEY}:backup`,
  `${LEGACY_V4_KEY}:corrupt`,
  `${LEGACY_V4_KEY}:migrated-at`,
  `${LEGACY_V4_KEY}:pre-sync`,
  LEGACY_V3_KEY,
  PRE_V4_KEY,
] as const;
/** Chaves de formatos anteriores que uma aba antiga ainda aberta pode gravar. */
export const LEGACY_TAB_KEYS: readonly string[] = [LEGACY_V5_KEY, LEGACY_V4_KEY, LEGACY_V3_KEY];
export const BACKUP_KEY = `${STORAGE_KEY}:backup`;
export const CORRUPT_KEY = `${STORAGE_KEY}:corrupt`;
/** Sessão de foco ativa (fora do snapshot e do backup; chave histórica, não mudou na v3). */
export const FOCUS_KEY = `${LEGACY_V2_KEY}:focus`;

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
  /** Relógio injetável (`savedAt` e datas das migrações). */
  now?: () => Date;
}

export class LocalStorageRepository implements DataRepository {
  readonly subjects: EntityRepository<Subject>;
  readonly events: EntityRepository<StudyEvent>;
  readonly habits: EntityRepository<Habit>;
  readonly habitLogs: EntityRepository<HabitLog>;
  readonly waterLogs: EntityRepository<WaterLog>;
  readonly focusSessions: EntityRepository<FocusSession>;
  readonly restDays: EntityRepository<RestDay>;
  readonly onboarding: DataRepository['onboarding'];
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
    this.state = createInitialSnapshot();
    this.load();

    const collection = <T extends { id: string }>(
      key:
        'subjects' | 'events' | 'habits' | 'habitLogs' | 'waterLogs' | 'focusSessions' | 'restDays',
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
    this.habits = collection<Habit>('habits', habitSchema);
    this.habitLogs = collection<HabitLog>('habitLogs', habitLogSchema);
    this.waterLogs = collection<WaterLog>('waterLogs', waterLogSchema);
    this.focusSessions = collection<FocusSession>('focusSessions', focusSessionSchema);
    this.restDays = collection<RestDay>('restDays', restDaySchema);
    this.onboarding = {
      get: () => this.state.onboarding,
      update: (patch) => {
        const next: Onboarding = { ...this.state.onboarding, ...patch };
        this.commit({ ...this.state, onboarding: next });
        return next;
      },
    };

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
    this.state = createInitialSnapshot();
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
    if (current !== null) {
      this.loadRaw(current, null);
      this.cleanupLegacy();
      return;
    }
    for (const [key, preKey] of [
      [LEGACY_V5_KEY, PRE_V6_KEY],
      [LEGACY_V4_KEY, PRE_V5_KEY],
      [LEGACY_V3_KEY, PRE_V4_KEY],
    ] as const) {
      const raw = this.storage.getItem(key);
      if (raw !== null) {
        this.loadRaw(raw, preKey);
        this.writeSafely(MIGRATED_AT_KEY, String(this.now().getTime()));
        return;
      }
    }
    const v2 = this.storage.getItem(LEGACY_V2_KEY);
    if (v2 !== null) return this.loadRaw(v2, PRE_V3_KEY);
    const v1 = this.storage.getItem(LEGACY_KEY);
    if (v1 !== null) return this.loadRaw(v1, PRE_MIGRATION_KEY);
  }

  /** `preKey` ≠ null: o dado vem de uma chave antiga e o original é guardado ANTES de migrar. */
  private loadRaw(raw: string, preKey: string | null): void {
    const result = parseEnvelope(raw, this.now());
    if (result.ok) {
      this.state = result.snapshot;
      if (preKey !== null) {
        this.writeSafely(preKey, raw);
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

  /**
   * Limpeza: as chaves dos formatos v3 e v4 e as cópias pré-migração ficam
   * {@link LEGACY_RETENTION_DAYS} dias depois da migração (recuperação manual e o “rebase” da
   * sincronização) e então são removidas.
   */
  private cleanupLegacy(): void {
    const raw = this.storage.getItem(MIGRATED_AT_KEY);
    const migratedAt = raw === null ? Number.NaN : Number(raw);
    if (!Number.isFinite(migratedAt)) return;
    const ageMs = this.now().getTime() - migratedAt;
    if (ageMs < LEGACY_RETENTION_DAYS * 24 * 60 * 60 * 1000) return;
    try {
      for (const key of LEGACY_CLEANUP_KEYS) this.storage.removeItem(key);
      this.storage.removeItem(MIGRATED_AT_KEY);
    } catch {
      /* tenta de novo na próxima abertura */
    }
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
