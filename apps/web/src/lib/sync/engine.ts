import { dataSnapshotSchema, isPristineSnapshot, type DataSnapshot } from '@daily/shared';
import { DATA_VERSION, migrateData } from '../data/envelope';
import { fingerprint as defaultFingerprint } from './canonical';
import { reconcile, type SyncMeta } from './reconcile';

export interface CloudRow {
  revision: number;
  version: number;
  data: unknown;
  updatedAt: string;
}

/** Acesso à nuvem. `'conflict'` = a revisão esperada não é mais a atual (ou a linha já existe). */
export interface CloudApi {
  fetch(): Promise<CloudRow | null>;
  insert(data: DataSnapshot, version: number): Promise<CloudRow | 'conflict'>;
  update(
    expectedRevision: number,
    data: DataSnapshot,
    version: number,
  ): Promise<CloudRow | 'conflict'>;
}

export interface LocalData {
  snapshot(): DataSnapshot;
  replace(snapshot: DataSnapshot): void;
  /** Avisa de QUALQUER mudança no estado local (inclusive as causadas por `replace`). */
  subscribe(listener: () => void): () => void;
}

export interface MetaStore {
  read(): SyncMeta | null;
  write(meta: SyncMeta | null): void;
}

export type Phase =
  | 'off' // sem conta (modo visitante) ou nuvem desligada
  | 'syncing'
  | 'synced'
  | 'pending' // há alterações locais ainda não enviadas
  | 'offline'
  | 'error'
  | 'conflict'
  | 'outdated'; // a nuvem tem dados de uma versão mais nova do app

export interface Summary {
  subjects: number;
  events: number;
  habits: number;
  /** ISO da última alteração na nuvem; ausente no lado do dispositivo. */
  updatedAt?: string;
}

export interface SyncStatus {
  phase: Phase;
  lastSyncedAt: number | null;
  message: string | null;
  conflict: { device: Summary; cloud: Summary } | null;
}

export interface EngineDeps {
  api: CloudApi;
  local: LocalData;
  meta: MetaStore;
  report(patch: Partial<SyncStatus>): void;
  /**
   * O que estava salvo localmente antes da migração de formato (`daily:v3:pre-v4`), como
   * `{ version, data }`. Usado uma vez para “rebasear” o ponto de sincronia: se era exatamente o
   * que tinha sido sincronizado, o local migrado também está sincronizado (sem conflito falso).
   */
  legacySynced?(version: number): { version: number; data: unknown } | null;
  /** Cópia de segurança do estado local antes de ele ser substituído pela nuvem. */
  saveSafetyCopy?(snapshot: DataSnapshot): void;
  /** Impressão digital do estado (padrão: SHA-256); injetável para testes determinísticos. */
  fingerprint?(value: unknown): Promise<string>;
  now?(): number;
  /** Versão do formato que este app grava (injetável só para simular um app antigo nos testes). */
  dataVersion?: number;
  debounceMs?: number;
  retryMs?: number;
}

const MAX_ATTEMPTS = 3;

const summarize = (s: DataSnapshot, updatedAt?: string): Summary => ({
  subjects: s.subjects.length,
  events: s.events.length,
  habits: s.habits.length,
  ...(updatedAt ? { updatedAt } : {}),
});

interface Stash {
  row: CloudRow;
  parsed: DataSnapshot;
}

export function createSyncEngine(deps: EngineDeps) {
  const { api, local, meta, report } = deps;
  const now = deps.now ?? Date.now;
  const fingerprint = deps.fingerprint ?? defaultFingerprint;
  const debounceMs = deps.debounceMs ?? 1500;
  const retryMs = deps.retryMs ?? 30_000;
  const dataVersion = deps.dataVersion ?? DATA_VERSION;

  let applying = false;
  let stopped = false;
  let blocked = false; // conflito/versão nova: não sincroniza até resolver
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let queue: Promise<void> = Promise.resolve();
  let stash: Stash | null = null;
  /** O rebase pelo local antigo não fechou: tenta pela nuvem no primeiro ciclo. */
  let remoteRebase = false;

  /**
   * O app migrou o local para um formato novo, mas o ponto de sincronia guarda o hash do formato
   * antigo. Sem isto, atualizar o app pareceria uma edição local (e daria conflito se outro
   * dispositivo também tivesse gravado). Se o local antigo era exatamente o sincronizado, o novo
   * hash é o do local antigo migrado (a migração é determinística).
   */
  async function rebaseAfterMigration(): Promise<void> {
    const current = meta.read();
    if (!current || (current.version ?? 3) >= dataVersion) return;
    let hash = current.hash;
    // A meta guarda em que formato o hash foi calculado (ausente = v3, antes de existir o campo).
    const legacy = deps.legacySynced?.(current.version ?? 3) ?? null;
    if (legacy && (await fingerprint(legacy.data)) === current.hash) {
      const parsed = dataSnapshotSchema.safeParse(migrateData(legacy.version, legacy.data));
      if (parsed.success) hash = await fingerprint(parsed.data);
    }
    remoteRebase = hash === current.hash;
    meta.write({ revision: current.revision, hash, version: dataVersion });
  }

  /** Serializa as execuções: nunca há dois ciclos ao mesmo tempo. */
  const enqueue = (task: () => Promise<void>): Promise<void> => {
    const run = queue.then(async () => {
      if (!stopped) await task();
    });
    queue = run.catch(() => undefined);
    return run;
  };

  const applyRemote = (snapshot: DataSnapshot) => {
    applying = true;
    try {
      local.replace(snapshot);
    } finally {
      applying = false;
    }
  };

  const synced = () => {
    blocked = false;
    stash = null;
    report({ phase: 'synced', lastSyncedAt: now(), message: null, conflict: null });
  };

  const fail = (error: unknown) => {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    report({
      phase: offline ? 'offline' : 'error',
      message: offline ? null : error instanceof Error ? error.message : 'Falha ao sincronizar.',
    });
    clearTimeout(retry);
    retry = setTimeout(() => void syncNow(), retryMs);
  };

  async function cycle(attempt = 1): Promise<void> {
    report({ phase: 'syncing', message: null });
    const row = await api.fetch();

    let remote: { snapshot: DataSnapshot; hash: string } | null = null;
    if (row) {
      if (row.version > dataVersion) {
        blocked = true;
        report({
          phase: 'outdated',
          message: 'A nuvem tem dados de uma versão mais nova do Daily. Atualize o app.',
        });
        return;
      }
      // Nuvem de uma versão anterior (ex.: v3): migra em memória, como o app faz com o local. A
      // linha só é reescrita quando houver um envio normal (uma edição de verdade).
      const data = row.version < dataVersion ? migrateData(row.version, row.data) : row.data;
      const parsed = dataSnapshotSchema.safeParse(data);
      if (!parsed.success) {
        // Nunca sobrescreve uma nuvem que não entendemos.
        blocked = true;
        report({ phase: 'error', message: 'Os dados na nuvem estão em formato inválido.' });
        return;
      }
      remote = { snapshot: parsed.data, hash: await fingerprint(parsed.data) };
    }

    const localSnap = local.snapshot();
    const localHash = await fingerprint(localSnap);
    if (remoteRebase) {
      remoteRebase = false;
      // A nuvem não mudou desde a última sincronia: ela (migrada) é o ponto de sincronia.
      const current = meta.read();
      if (row && remote && current?.revision === row.revision) {
        meta.write({ revision: row.revision, hash: remote.hash, version: dataVersion });
      }
    }
    const decision = reconcile({
      localHash,
      localPristine: isPristineSnapshot(localSnap),
      remote: row && remote ? { revision: row.revision, hash: remote.hash } : null,
      meta: meta.read(),
    });

    switch (decision.kind) {
      case 'noop':
      case 'adopt':
        if (row) meta.write({ revision: row.revision, hash: localHash, version: dataVersion });
        return synced();
      case 'pull':
        if (!row || !remote) return;
        deps.saveSafetyCopy?.(localSnap);
        applyRemote(remote.snapshot);
        meta.write({ revision: row.revision, hash: remote.hash, version: dataVersion });
        return synced();
      case 'push': {
        const result =
          decision.expectedRevision === null
            ? await api.insert(localSnap, dataVersion)
            : await api.update(decision.expectedRevision, localSnap, dataVersion);
        if (result === 'conflict') {
          if (attempt >= MAX_ATTEMPTS)
            throw new Error('A nuvem mudou várias vezes durante o envio.');
          return cycle(attempt + 1);
        }
        meta.write({ revision: result.revision, hash: localHash, version: dataVersion });
        // Se algo mudou durante o envio, um novo ciclo já foi agendado pelo assinante.
        return synced();
      }
      case 'conflict': {
        if (!row || !remote) return;
        stash = { row, parsed: remote.snapshot };
        blocked = true;
        report({
          phase: 'conflict',
          message: null,
          conflict: {
            device: summarize(localSnap),
            cloud: summarize(remote.snapshot, row.updatedAt),
          },
        });
      }
    }
  }

  function syncNow(): Promise<void> {
    clearTimeout(timer);
    if (blocked) return Promise.resolve();
    return enqueue(async () => {
      try {
        await cycle();
      } catch (error) {
        fail(error);
      }
    });
  }

  /** Mudança local: se difere do último ponto sincronizado, agenda o envio. */
  async function onLocalChange(): Promise<void> {
    if (applying || stopped || blocked) return;
    const current = meta.read();
    const hash = await fingerprint(local.snapshot());
    if (current && current.hash === hash) return;
    report({ phase: 'pending' });
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), debounceMs);
  }

  const unsubscribe = { fn: undefined as undefined | (() => void) };

  return {
    async start(): Promise<void> {
      await rebaseAfterMigration();
      unsubscribe.fn = local.subscribe(() => void onLocalChange());
      return syncNow();
    },
    stop(): void {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(retry);
      unsubscribe.fn?.();
    },
    /** Envia já o que estiver pendente (sair da conta, fechar a aba). */
    flush: syncNow,
    /** Há alterações locais que a nuvem ainda não tem? */
    async isDirty(): Promise<boolean> {
      const current = meta.read();
      return !current || current.hash !== (await fingerprint(local.snapshot()));
    },
    /** Resolve o conflito: `cloud` troca os dados deste dispositivo; `device` sobrescreve a nuvem. */
    resolveConflict(choice: 'cloud' | 'device'): Promise<void> {
      return enqueue(async () => {
        if (!stash) return;
        const { row, parsed } = stash;
        try {
          if (choice === 'cloud') {
            deps.saveSafetyCopy?.(local.snapshot());
            applyRemote(parsed);
            meta.write({
              revision: row.revision,
              hash: await fingerprint(parsed),
              version: dataVersion,
            });
            return synced();
          }
          const snap = local.snapshot();
          const result = await api.update(row.revision, snap, dataVersion);
          if (result === 'conflict') {
            // A nuvem mudou enquanto o usuário decidia: reavalia tudo.
            blocked = false;
            return cycle();
          }
          meta.write({
            revision: result.revision,
            hash: await fingerprint(snap),
            version: dataVersion,
          });
          synced();
        } catch (error) {
          fail(error);
        }
      });
    },
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
