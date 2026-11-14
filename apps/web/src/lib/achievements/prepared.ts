import type { StudyEvent } from '@daily/shared';

type Exam = StudyEvent & { preparedAt?: string | undefined };

/**
 * “Preparado” precisa saber se a prova estava 100 % ANTES do início, e o app não guarda quando
 * cada conteúdo foi marcado. Então, enquanto a prova ainda não começou, a marca `preparedAt` é
 * posta quando todos os conteúdos (≥ 1) estão feitos e tirada se algum for desmarcado. Depois do
 * início, a marca não muda mais. Devolve só as provas que mudaram (`null` = tirar a marca).
 */
export function preparedChanges(
  events: readonly Exam[],
  now: string,
): { id: string; preparedAt: string | null }[] {
  const changes: { id: string; preparedAt: string | null }[] = [];
  for (const e of events) {
    if (e.type !== 'prova' || e.start <= now) continue;
    const ready = e.subtasks.length > 0 && e.subtasks.every((s) => s.done);
    if (ready && !e.preparedAt) changes.push({ id: e.id, preparedAt: now });
    else if (!ready && e.preparedAt) changes.push({ id: e.id, preparedAt: null });
  }
  return changes;
}
