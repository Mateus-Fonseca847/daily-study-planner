import { create } from 'zustand';
import type { SyncStatus } from './engine';

export const INITIAL_SYNC: SyncStatus = {
  phase: 'off',
  lastSyncedAt: null,
  message: null,
  conflict: null,
};

/** Estado de sincronização para a UI (selo, menu da conta, diálogo de conflito). */
export const useSync = create<SyncStatus>()(() => INITIAL_SYNC);
