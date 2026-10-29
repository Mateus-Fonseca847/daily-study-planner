import { browserStorage } from '../browser-storage';
import { fixtureName, isFixture } from '../fixture';
import { referenceSnapshot } from '../../mocks/reference-fixture';
import { runningLockedSession, statsSnapshot } from '../../mocks/stats-fixture';
import { LocalStorageRepository, MemoryStorage, WATCHED_KEYS } from './local-storage-repository';
import { createDataStore } from './store';

function createRepository(): LocalStorageRepository {
  if (!isFixture) return new LocalStorageRepository(browserStorage());
  // As fixtures nunca tocam os dados reais do usuário: tudo em memória.
  const repo = new LocalStorageRepository(new MemoryStorage());
  repo.replaceAll(fixtureName === 'reference' ? referenceSnapshot() : statsSnapshot());
  if (fixtureName === 'focus') repo.focusActive.set(runningLockedSession(Date.now()));
  return repo;
}

/** Store singleton do app. Componentes usam `useData(selector)`. */
export const useData = createDataStore(createRepository());

/**
 * Sincroniza abas/janelas: o evento `storage` só dispara nas OUTRAS abas, então recarregar
 * aqui reflete o que outra janela gravou. Limitação: última escrita vence (sem mesclagem).
 */
if (!isFixture && typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // `key === null` = o storage foi limpo.
    if (event.key === null || WATCHED_KEYS.includes(event.key)) useData.getState().reload();
  });
}
