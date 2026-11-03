import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getYear, setMonth, setYear } from 'date-fns';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useBreakpoint } from '../../../lib/responsive/use-media';
import { PeriodPickerSheet } from './PeriodPickerSheet';
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
  const layout = useBreakpoint();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (layout === 'phone') {
    return (
      <div className="flex shrink-0 flex-col gap-2 border-b-hair px-4 py-2">
        <SegmentedControl
          aria-label="Visualização do calendário"
          options={VIEW_OPTIONS}
          block
          value={view}
          onChange={onViewChange}
        />
        <div className="flex items-center gap-1">
          <Button variant="icon" size="md" aria-label={prevLabel} onClick={() => onStep(-1)}>
            <ChevronLeft aria-hidden strokeWidth={1.5} className="size-icon" />
          </Button>
          <Button variant="icon" size="md" aria-label={nextLabel} onClick={() => onStep(1)}>
            <ChevronRight aria-hidden strokeWidth={1.5} className="size-icon" />
          </Button>
          <Button variant="secondary" onClick={onToday}>
            Hoje
          </Button>
          <h2 aria-live="polite" className="min-w-0 flex-1 text-title font-semibold tracking-tight">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`${periodTitle(view, date)}: escolher ${view === 'ano' ? 'ano' : 'mês e ano'}`}
              onClick={() => setPickerOpen(true)}
              className="flex h-touch w-full items-center justify-end gap-1 truncate rounded-md pl-2 text-right"
            >
              <span className="truncate">{periodTitle(view, date)}</span>
              <ChevronDown
                aria-hidden
                strokeWidth={1.5}
                className="size-icon-sm shrink-0 text-muted"
              />
            </button>
          </h2>
        </div>
        {pickerOpen && (
          <PeriodPickerSheet
            view={view}
            date={date}
            onPick={onDateChange}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-controls shrink-0 items-center justify-between gap-4 border-b-hair px-page max-lg:h-auto max-lg:flex-wrap max-lg:py-2">
      <div className="flex min-w-0 items-center gap-3">
        <SegmentedControl
          aria-label="Visualização do calendário"
          options={VIEW_OPTIONS}
          compact
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
