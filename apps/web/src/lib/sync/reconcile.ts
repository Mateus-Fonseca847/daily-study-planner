/** Decisão pura de sincronização (sem rede, sem relógio): fácil de testar. */

/** Último ponto em que este dispositivo e a nuvem estavam iguais. */
export interface SyncMeta {
  revision: number;
  hash: string;
  /**
   * Versão do formato em que `hash` foi calculado. Ausente = gravado por um app v3: depois da
   * migração local o hash precisa ser “rebaseado” (ver `createSyncEngine`).
   */
  version?: number;
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
  /**
   * Local “virgem”: nada a perder (estado inicial ou só o hábito de água automático, ver
   * `isPristineSnapshot`). Um hash não serve: o hábito automático tem id e data próprios.
   */
  localPristine: boolean;
  remote: RemoteInfo | null;
  meta: SyncMeta | null;
}

export function reconcile({ localHash, localPristine, remote, meta }: ReconcileInput): Decision {
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
    return localPristine ? { kind: 'pull' } : { kind: 'conflict' };
  }

  const localChanged = localHash !== meta.hash;
  const remoteChanged = remote.revision !== meta.revision;
  if (!localChanged && remoteChanged) return { kind: 'pull' };
  if (localChanged && !remoteChanged) return { kind: 'push', expectedRevision: remote.revision };
  if (localChanged && remoteChanged) return { kind: 'conflict' };
  // Nada mudou localmente nem a revisão, mas o conteúdo difere: a nuvem foi alterada de forma anômala.
  return { kind: 'pull' };
}
