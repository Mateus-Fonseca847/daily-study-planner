import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getYear, setMonth, setYear } from 'date-fns';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/cn';
import { dayKey, parseDayKey } from '../../../lib/dates';
import { MONTH_OPTIONS } from '../lib/format';
import type { CalendarView } from '../lib/views';

interface PeriodPickerSheetProps {
  view: CalendarView;
  /** Dia de referência da visão (`yyyy-MM-dd`). */
  date: string;
  onPick: (date: string) => void;
  onClose: () => void;
}

/** Seletor de mês e ano (celular): substitui os dois selects da barra de controles. */
export function PeriodPickerSheet({ view, date, onPick, onClose }: PeriodPickerSheetProps) {
  const current = parseDayKey(date);
  const [year, setYearState] = useState(getYear(current));
  const showMonths = view !== 'ano';

  const pickMonth = (month: number) => {
    onPick(dayKey(setMonth(setYear(current, year), month)));
    onClose();
  };
  const pickYear = () => {
    onPick(dayKey(setYear(current, year)));
    onClose();
  };

  return (
    <BottomSheet title={showMonths ? 'Escolher mês e ano' : 'Escolher ano'} onClose={onClose}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <Button
          variant="icon"
          size="md"
          aria-label="Ano anterior"
          onClick={() => setYearState((y) => y - 1)}
        >
          <ChevronLeft aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
        <span aria-live="polite" className="text-title font-semibold tabular-nums">
          {year}
        </span>
        <Button
          variant="icon"
          size="md"
          aria-label="Próximo ano"
          onClick={() => setYearState((y) => y + 1)}
        >
          <ChevronRight aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
      </div>
      {showMonths ? (
        <ul className="grid grid-cols-3 gap-2">
          {MONTH_OPTIONS.map((month) => {
            const active = year === getYear(current) && month.value === current.getMonth();
            return (
              <li key={month.value}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickMonth(Number(month.value))}
                  className={cn(
                    'h-touch w-full rounded-md text-md font-medium',
                    active ? 'bg-accent text-accent-fg' : 'bg-surface text-fg active:bg-hover',
                  )}
                >
                  {month.label.slice(0, 3)}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <Button className="w-full" onClick={pickYear}>
          Ir para {year}
        </Button>
      )}
    </BottomSheet>
  );
}
