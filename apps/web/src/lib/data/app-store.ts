import { browserStorage } from '../browser-storage';
import { fixtureName, isFixture } from '../fixture';
import { referenceSnapshot } from '../../mocks/reference-fixture';
import { runningLockedSession, statsSnapshot } from '../../mocks/stats-fixture';
import { viewsSnapshot } from '../../mocks/views-fixture';
import {
  LEGACY_TAB_KEYS,
  LocalStorageRepository,
  MemoryStorage,
  WATCHED_KEYS,
} from './local-storage-repository';
import { useLegacyTab } from './legacy-tab-store';
import { createDataStore } from './store';

function createRepository(): LocalStorageRepository {
  // `import.meta.env.DEV` é trocado por `false` no build: as fixtures saem do bundle de produção.
  if (!import.meta.env.DEV || !isFixture) return new LocalStorageRepository(browserStorage());
  // As fixtures nunca tocam os dados reais do usuário: tudo em memória.
  const repo = new LocalStorageRepository(new MemoryStorage());
  repo.replaceAll(
    fixtureName === 'reference'
      ? referenceSnapshot()
      : fixtureName === 'views'
        ? viewsSnapshot()
        : statsSnapshot(),
  );
  if (fixtureName === 'focus') repo.focusActive.set(runningLockedSession(Date.now()));
  return repo;
}

/** Store singleton do app. Componentes usam `useData(selector)`. */
export const useData = createDataStore(createRepository());

// Primeiro uso: cria o hábito “Água” uma única vez (idempotente pela marca `waterHabitCreated`).
if (!isFixture) useData.getState().ensureWaterHabit(new Date());

/**
 * Sincroniza abas/janelas: o evento `storage` só dispara nas OUTRAS abas, então recarregar
 * aqui reflete o que outra janela gravou. Limitação: última escrita vence (sem mesclagem).
 */
if (!isFixture && typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // `key === null` = o storage foi limpo.
    if (event.key === null || WATCHED_KEYS.includes(event.key)) useData.getState().reload();
    // Uma aba com uma versão antiga do app ainda grava num formato anterior: avisa em vez de mesclar.
    if (event.key !== null && LEGACY_TAB_KEYS.includes(event.key)) useLegacyTab.getState().detect();
  });
}
