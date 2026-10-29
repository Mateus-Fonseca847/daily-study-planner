import { MemoryStorage, type StorageLike } from './data/local-storage-repository';

/** `localStorage` pode lançar (modo privado, bloqueio de cookies): cai para memória. */
export function browserStorage(): StorageLike {
  try {
    const probe = '__daily_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}
