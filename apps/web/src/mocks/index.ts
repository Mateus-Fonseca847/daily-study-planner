import type { StudyEvent } from '@daily/shared';
import { isReferenceFixture } from '../lib/fixture';
import { buildEvents } from './events';
import { referenceEvents } from './reference-fixture';

/** Eventos exibidos para o mês (mocks relativos a `now`, ou a fixture fixa de referência). */
export function eventsFor(month: Date, now: Date): StudyEvent[] {
  return isReferenceFixture ? referenceEvents() : buildEvents(month, now);
}
