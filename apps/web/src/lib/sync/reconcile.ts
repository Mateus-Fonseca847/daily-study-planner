/** Decisão pura de sincronização (sem rede, sem relógio): fácil de testar. */

/** Último ponto em que este dispositivo e a nuvem estavam iguais. */
export interface SyncMeta {
  revision: number;
  hash: string;
}

export interface RemoteInfo {
  revision: number;
  hash: string;
}

export type Decision =
  | { kind: 'noop' }
  /** Grava o local na nuvem (insert se `expectedRevision` for null). */
  | { kind: 'push'; expectedRevision: number | null }
  | { kind: 'pull' }
  /** Os dois lados mudaram: o usuário escolhe. */
  | { kind: 'conflict' }
  /** Já são iguais: só registra o ponto de sincronia. */
  | { kind: 'adopt' };

export interface ReconcileInput {
  localHash: string;
  /** Hash do estado inicial vazio: local “virgem”, nada a perder. */
  pristineHash: string;
  remote: RemoteInfo | null;
  meta: SyncMeta | null;
}

export function reconcile({ localHash, pristineHash, remote, meta }: ReconcileInput): Decision {
  if (remote === null) {
    // Nuvem vazia: sobe o que existir. (Se `meta` existir, a nuvem foi apagada: sobe de novo.)
    return { kind: 'push', expectedRevision: null };
  }
  if (localHash === remote.hash)
    return meta?.revision === remote.revision && meta.hash === localHash
      ? { kind: 'noop' }
      : { kind: 'adopt' };

  if (meta === null) {
    // Primeiro login neste dispositivo: local virgem aceita a nuvem; senão, os dois têm dados.
    return localHash === pristineHash ? { kind: 'pull' } : { kind: 'conflict' };
  }

  const localChanged = localHash !== meta.hash;
  const remoteChanged = remote.revision !== meta.revision;
  if (!localChanged && remoteChanged) return { kind: 'pull' };
  if (localChanged && !remoteChanged) return { kind: 'push', expectedRevision: remote.revision };
  if (localChanged && remoteChanged) return { kind: 'conflict' };
  // Nada mudou localmente nem a revisão, mas o conteúdo difere: a nuvem foi alterada de forma anômala.
  return { kind: 'pull' };
}
