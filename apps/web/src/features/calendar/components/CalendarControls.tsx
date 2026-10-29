import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getYear, setMonth, setYear } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { Select } from '../../../components/ui/Select';
import { dayKey, parseDayKey } from '../../../lib/dates';
import { openEventForm } from '../../../lib/ui-store';
import { MONTH_OPTIONS } from '../lib/format';
import {
  CALENDAR_VIEWS,
  periodTitle,
  VIEW_LABEL,
  VIEW_SHORTCUT,
  type CalendarView,
} from '../lib/views';

export type { CalendarView };

const VIEW_OPTIONS = CALENDAR_VIEWS.map((value) => ({
  value,
  label: VIEW_LABEL[value],
  shortcut: VIEW_SHORTCUT[value],
}));

/** Anos exibidos no select, ao redor do ano atual. */
const YEAR_SPAN = 5;

interface CalendarControlsProps {
  view: CalendarView;
  /** Dia de referência da visão (`yyyy-MM-dd`). */
  date: string;
  /** Hoje (respeita a fixture); define a faixa de anos. */
  today: string;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: string) => void;
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
}

const STEP_LABEL: Record<CalendarView, [string, string]> = {
  dia: ['Dia anterior', 'Próximo dia'],
  semana: ['Semana anterior', 'Próxima semana'],
  mes: ['Mês anterior', 'Próximo mês'],
  ano: ['Ano anterior', 'Próximo ano'],
};

export function CalendarControls({
  view,
  date,
  today,
  onViewChange,
  onDateChange,
  onStep,
  onToday,
}: CalendarControlsProps) {
  const current = parseDayKey(date);
  const thisYear = getYear(parseDayKey(today));
  const year = getYear(current);
  const first = Math.min(thisYear, year) - YEAR_SPAN;
  const last = Math.max(thisYear, year) + YEAR_SPAN;
  const yearOptions = Array.from({ length: last - first + 1 }, (_, i) => ({
    value: first + i,
    label: String(first + i),
  }));
  const [prevLabel, nextLabel] = STEP_LABEL[view];

  return (
    <div className="flex h-controls shrink-0 items-center justify-between gap-4 border-b-hair px-page">
      <div className="flex min-w-0 items-center gap-3">
        <SegmentedControl
          aria-label="Visualização do calendário"
          options={VIEW_OPTIONS}
          value={view}
          onChange={onViewChange}
        />
        <div className="flex items-center gap-1">
          <Button
            variant="icon"
            size="xs"
            aria-label={prevLabel}
            title={`${prevLabel} (←)`}
            aria-keyshortcuts="ArrowLeft"
            onClick={() => onStep(-1)}
          >
            <ChevronLeft aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          </Button>
          <Button
            variant="icon"
            size="xs"
            aria-label={nextLabel}
            title={`${nextLabel} (→)`}
            aria-keyshortcuts="ArrowRight"
            onClick={() => onStep(1)}
          >
            <ChevronRight aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          </Button>
        </div>
        <Button
          variant="secondary"
          aria-keyshortcuts="T"
          title="Voltar ao período atual (T)"
          onClick={onToday}
        >
          Hoje
        </Button>
        <h2 aria-live="polite" className="truncate text-lg font-semibold tracking-tight">
          {periodTitle(view, date)}
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select
          aria-label="Mês"
          className="w-select-month"
          options={MONTH_OPTIONS}
          value={current.getMonth()}
          onChange={(e) => onDateChange(dayKey(setMonth(current, Number(e.target.value))))}
        />
        <Select
          aria-label="Ano"
          className="w-select-year"
          options={yearOptions}
          value={year}
          onChange={(e) => onDateChange(dayKey(setYear(current, Number(e.target.value))))}
        />
        <Button onClick={() => openEventForm({ type: 'prova' })}>
          <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
          Nova Prova
        </Button>
      </div>
    </div>
  );
}
