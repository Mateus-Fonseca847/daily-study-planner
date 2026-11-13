import { useMemo } from 'react';
import { useData } from '../data/app-store';
import { dayKey } from '../dates';
import { appNow } from '../fixture';
import { expandEvents, type EventView } from './expand';

/**
 * Compromissos da janela: avulsos como estão e as ocorrências das séries, expandidas só para a
 * janela e memorizadas (recalcula quando mudam os eventos, as exceções ou a janela).
 */
export function useOccurrences(from: string, to: string): EventView[] {
  const events = useData((s) => s.events);
  const exceptions = useData((s) => s.exceptions);
  return useMemo(
    () => expandEvents(events, exceptions, { from, to }, dayKey(appNow())),
    [events, exceptions, from, to],
  );
}
