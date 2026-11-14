import type { StudyEvent } from '@daily/shared';
import { recurrenceText } from '../../../lib/recurrence/view';
import { EventChip } from '../../../components/ui/EventChip';
import { Popover } from '../../../components/ui/Popover';
import { eventTimeRange } from '../lib/format';
import { ChipComplete } from '../../tasks/ChipComplete';

interface DayListPopoverProps {
  anchor: HTMLElement;
  label: string;
  events: readonly StudyEvent[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (event: StudyEvent) => void;
}

/** Lista completa de eventos do dia (aberta pelo link “+N mais”). */
export function DayListPopover({
  anchor,
  label,
  events,
  selectedId,
  onClose,
  onSelect,
}: DayListPopoverProps) {
  return (
    <Popover anchor={anchor} onClose={onClose} aria-label={label}>
      <h2 className="mb-3 text-md font-semibold">{label}</h2>
      <ul className="flex flex-col gap-1">
        {events.map((event) => (
          <li key={event.id}>
            <EventChip
              eventType={event.type}
              title={event.title}
              time={eventTimeRange(event)}
              status={event.status}
              recurrence={recurrenceText(event)}
              selected={selectedId === event.id}
              onClick={() => onSelect(event)}
              trailing={<ChipComplete event={event} size="list" />}
            />
          </li>
        ))}
      </ul>
    </Popover>
  );
}
