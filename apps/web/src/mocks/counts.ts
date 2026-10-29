import { format } from 'date-fns';
import type { StudyEvent } from '@daily/shared';

export interface NavCounts {
  provas: number;
  tarefas: number;
}

/** Provas futuras e tarefas pendentes (conteúdos por estudar + entregas futuras). */
export function navCounts(events: readonly StudyEvent[], now: Date): NavCounts {
  const nowIso = format(now, "yyyy-MM-dd'T'HH:mm:ss");
  const upcoming = events.filter((e) => e.end >= nowIso);
  const provas = upcoming.filter((e) => e.type === 'prova');
  return {
    provas: provas.length,
    tarefas:
      provas.reduce((sum, e) => sum + e.contents.filter((c) => !c.done).length, 0) +
      upcoming.filter((e) => e.type === 'entrega').length,
  };
}
