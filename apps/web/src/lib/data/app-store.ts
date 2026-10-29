import { browserStorage } from '../browser-storage';
import { isReferenceFixture } from '../fixture';
import { referenceSnapshot } from '../../mocks/reference-fixture';
import { LocalStorageRepository, MemoryStorage, WATCHED_KEYS } from './local-storage-repository';
import { createDataStore } from './store';

function createRepository(): LocalStorageRepository {
  if (!isReferenceFixture) return new LocalStorageRepository(browserStorage());
  // A fixture nunca toca os dados reais do usuário.
  const repo = new LocalStorageRepository(new MemoryStorage());
  repo.replaceAll(referenceSnapshot());
  return repo;
}

/** Store singleton do app. Componentes usam `useData(selector)`. */
export const useData = createDataStore(createRepository());

/**
 * Sincroniza abas/janelas: o evento `storage` só dispara nas OUTRAS abas, então recarregar
 * aqui reflete o que outra janela gravou. Limitação: última escrita vence (sem mesclagem).
 */
if (!isReferenceFixture && typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // `key === null` = o storage foi limpo.
    if (event.key === null || WATCHED_KEYS.includes(event.key)) useData.getState().reload();
  });
}
