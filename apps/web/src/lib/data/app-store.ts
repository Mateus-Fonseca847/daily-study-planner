import { isReferenceFixture } from '../fixture';
import { referenceSnapshot } from '../../mocks/reference-fixture';
import {
  LocalStorageRepository,
  MemoryStorage,
  type StorageLike,
} from './local-storage-repository';
import { createDataStore } from './store';

/** `localStorage` pode lançar (modo privado, bloqueio de cookies): cai para memória. */
function browserStorage(): StorageLike {
  try {
    const probe = '__daily_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

function createRepository(): LocalStorageRepository {
  if (!isReferenceFixture) return new LocalStorageRepository(browserStorage());
  // A fixture nunca toca os dados reais do usuário.
  const repo = new LocalStorageRepository(new MemoryStorage());
  repo.replaceAll(referenceSnapshot());
  return repo;
}

/** Store singleton do app. Componentes usam `useData(selector)`. */
export const useData = createDataStore(createRepository());
