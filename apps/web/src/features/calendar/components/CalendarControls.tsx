import { Plus } from 'lucide-react';
import { getYear, setMonth, setYear } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { Select } from '../../../components/ui/Select';
import { MONTH_OPTIONS } from '../lib/format';

export type CalendarView = 'semana' | 'mes' | 'ano';

const VIEW_OPTIONS = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
] as const;

/** Anos exibidos no select, ao redor do ano atual. */
const YEAR_SPAN = 5;

interface CalendarControlsProps {
  month: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onMonthChange: (month: Date) => void;
  onToday: () => void;
}

export function CalendarControls({
  month,
  view,
  onViewChange,
  onMonthChange,
  onToday,
}: CalendarControlsProps) {
  const thisYear = getYear(new Date());
  const year = getYear(month);
  const first = Math.min(thisYear, year) - YEAR_SPAN;
  const last = Math.max(thisYear, year) + YEAR_SPAN;
  const yearOptions = Array.from({ length: last - first + 1 }, (_, i) => ({
    value: first + i,
    label: String(first + i),
  }));

  return (
    <div className="flex h-controls shrink-0 items-center justify-between border-b-hair px-page">
      <div className="flex items-center gap-2">
        <SegmentedControl
          aria-label="Visualização do calendário"
          options={VIEW_OPTIONS}
          value={view}
          onChange={onViewChange}
          actions={[{ label: 'Hoje', onClick: onToday }]}
        />
      </div>
      <div className="flex items-center gap-2">
        <Select
          aria-label="Mês"
          className="w-select-month"
          options={MONTH_OPTIONS}
          value={month.getMonth()}
          onChange={(e) => onMonthChange(setMonth(month, Number(e.target.value)))}
        />
        <Select
          aria-label="Ano"
          className="w-select-year"
          options={yearOptions}
          value={year}
          onChange={(e) => onMonthChange(setYear(month, Number(e.target.value)))}
        />
        <Button>
          <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
          Nova Prova
        </Button>
      </div>
    </div>
  );
}
