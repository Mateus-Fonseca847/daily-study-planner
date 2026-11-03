/** Armazenamento externo de uma consulta de mídia, no formato de `useSyncExternalStore`. */
export interface MediaStore {
  subscribe(notify: () => void): () => void;
  getSnapshot(): boolean;
}

type MatchMedia = (query: string) => MediaQueryList;

/** Cria o store de uma consulta (puro: recebe `matchMedia`, então é testável fora do navegador). */
export function createMediaStore(query: string, matchMedia: MatchMedia): MediaStore {
  const list = matchMedia(query);
  return {
    subscribe(notify) {
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    getSnapshot: () => list.matches,
  };
}

const stores = new Map<string, MediaStore>();

/** Um store por consulta, compartilhado por todos os componentes. */
export function mediaStore(query: string): MediaStore {
  let store = stores.get(query);
  if (!store) {
    store = createMediaStore(query, (q) => window.matchMedia(q));
    stores.set(query, store);
  }
  return store;
}
