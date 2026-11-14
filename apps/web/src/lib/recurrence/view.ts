import type { StudyEvent } from '@daily/shared';
import { describeRule } from './describe';
import type { EventView } from './expand';

/** É uma ocorrência de série (vinda de `expandEvents`)? */
export const isOccurrence = (event: StudyEvent): event is EventView =>
  (event as Partial<EventView>).originalDate != null;

/** Texto da regra (“Toda segunda e quarta”) de uma ocorrência; `null` num evento avulso. */
export function recurrenceText(event: StudyEvent): string | null {
  if (!event.recurrence) return null;
  const anchor = (event as Partial<EventView>).anchor ?? event.start.slice(0, 10);
  return describeRule(event.recurrence, anchor);
}
