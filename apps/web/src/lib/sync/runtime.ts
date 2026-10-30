import type { DataSnapshot } from '@daily/shared';
import { createInitialSnapshot } from '@daily/shared';
import { browserStorage } from '../browser-storage';
import { getSupabase } from '../cloud/client';
import { createSupabaseApi } from '../cloud/supabase-api';
import { useAuth } from '../auth/auth-store';
import { useData } from '../data/app-store';
import { createSyncEngine, type SyncEngine } from './engine';
import { INITIAL_SYNC, useSync } from './sync-store';
import type { SyncMeta } from './reconcile';

const metaKey = (userId: string) => `daily:sync:${userId}`;
/** Última cópia do que estava neste dispositivo antes de a nuvem substituí-lo. */
export const PRE_SYNC_KEY = 'daily:v3:pre-sync';

let engine: SyncEngine | null = null;
let activeUser: string | null = null;
let listenersBound = false;

function readMeta(key: string): SyncMeta | null {
  try {
    const raw = browserStorage().getItem(key);
    if (!raw) return null;
    const m = JSON.parse(raw) as Partial<SyncMeta>;
    return typeof m.revision === 'number' && typeof m.hash === 'string'
      ? { revision: m.revision, hash: m.hash }
      : null;
  } catch {
    return null;
  }
}

function stop(): void {
  engine?.stop();
  engine = null;
  activeUser = null;
  useSync.setState(INITIAL_SYNC, true);
}

function start(userId: string): void {
  const client = getSupabase();
  if (!client || activeUser === userId) return;
  stop();
  activeUser = userId;
  const key = metaKey(userId);
  engine = createSyncEngine({
    api: createSupabaseApi(client, userId),
    local: {
      snapshot: () => useData.getState().snapshot(),
      replace: (s) => useData.getState().replaceAll(s),
      subscribe: (listener) => useData.subscribe(listener),
    },
    meta: {
      read: () => readMeta(key),
      write: (m) => {
        try {
          if (m) browserStorage().setItem(key, JSON.stringify(m));
          else browserStorage().removeItem(key);
        } catch {
          /* sem armazenamento: sincroniza de novo na próxima abertura */
        }
      },
    },
    report: (patch) => useSync.setState(patch),
    saveSafetyCopy: (snapshot: DataSnapshot) => {
      try {
        browserStorage().setItem(PRE_SYNC_KEY, JSON.stringify(snapshot));
      } catch {
        /* melhor esforço */
      }
    },
  });
  void engine.start();
}

/** Liga a sincronização ao login: entra → sincroniza; sai → para. */
export function startSync(): void {
  useAuth.subscribe((auth) => {
    if (auth.status === 'signed-in') start(auth.user.id);
    else if (auth.status === 'visitor' || auth.status === 'disabled') stop();
  });
  const current = useAuth.getState();
  if (current.status === 'signed-in') start(current.user.id);

  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;
  const flush = () => void engine?.flush();
  window.addEventListener('online', flush);
  // Ao esconder a aba, envia o que estiver pendente (o debounce poderia perder o fechamento).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export const resolveConflict = (choice: 'cloud' | 'device') => engine?.resolveConflict(choice);
export const syncNow = () => engine?.flush();
export const hasUnsyncedChanges = async (): Promise<boolean> => (engine ? engine.isDirty() : false);

/**
 * Sair da conta: envia o pendente e limpa os dados DESTE dispositivo (evita deixar os estudos de
 * uma pessoa num computador compartilhado). `force` sai mesmo com alterações não enviadas.
 */
export async function signOutAndWipe(force = false): Promise<'ok' | 'unsynced'> {
  const userId = activeUser;
  if (engine) {
    await engine.flush();
    if (!force && (await engine.isDirty())) return 'unsynced';
  }
  await useAuth.getState().signOut();
  stop();
  if (userId) {
    try {
      browserStorage().removeItem(metaKey(userId));
    } catch {
      /* ignore */
    }
  }
  useData.getState().replaceAll(createInitialSnapshot());
  return 'ok';
}
