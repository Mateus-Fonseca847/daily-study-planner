import type {
  ActiveFocus,
  DataSnapshot,
  FocusSession,
  Goal,
  GoalLog,
  Preferences,
  StudyEvent,
  Subject,
  WaterLog,
} from '@daily/shared';

/** Entidade sem `id` (o repositório gera). Distribui sobre uniões. */
export type Draft<T> = T extends unknown ? Omit<T, 'id'> : never;

/** Alteração parcial (também distribui sobre uniões). */
export type Patch<T> = T extends unknown ? Partial<Omit<T, 'id'>> : never;

export interface EntityRepository<T extends { id: string }> {
  list(): T[];
  get(id: string): T | undefined;
  create(draft: Draft<T>): T;
  /** Mescla `patch` sobre o item atual e revalida. */
  update(id: string, patch: Patch<T>): T;
  /** Insere ou substitui pelo `id` (idempotente: serve a registros com id determinístico). */
  upsert(item: T): T;
  delete(id: string): void;
}

export type LoadIssue = { kind: 'corrupt'; message: string; hasBackup: boolean };

export interface DataRepository {
  readonly subjects: EntityRepository<Subject>;
  readonly events: EntityRepository<StudyEvent>;
  readonly goals: EntityRepository<Goal>;
  readonly goalLogs: EntityRepository<GoalLog>;
  readonly waterLogs: EntityRepository<WaterLog>;
  readonly focusSessions: EntityRepository<FocusSession>;
  readonly preferences: {
    get(): Preferences;
    update(patch: Partial<Preferences>): Preferences;
  };
  /** Sessão de foco em andamento: fica fora do snapshot (e do backup). */
  readonly focusActive: {
    get(): ActiveFocus | null;
    set(active: ActiveFocus | null): void;
  };
  /** Problema encontrado ao carregar (o app segue funcionando com dados vazios). */
  readonly issue: LoadIssue | null;
  snapshot(): DataSnapshot;
  /** Substitui tudo (importação, exemplo, desfazer). Valida antes de gravar. */
  replaceAll(snapshot: DataSnapshot): void;
  /** Relê o armazenamento (outra aba/janela gravou). Última escrita vence. */
  reload(): void;
  restoreBackup(): boolean;
  /** Descarta o aviso de dado corrompido e segue com dados vazios. */
  startFresh(): void;
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`Item não encontrado: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class StorageWriteError extends Error {
  constructor(cause: unknown) {
    super('Não foi possível salvar no navegador (armazenamento cheio ou bloqueado).', { cause });
    this.name = 'StorageWriteError';
  }
}
