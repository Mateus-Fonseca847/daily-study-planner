import { useLayoutEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import type { GridColumn, PlacedItem } from '../lib/grid-items';
import {
  DEFAULT_SCROLL_HOUR,
  formatMinutes,
  nowPct,
  positionPct,
  roundDownTo30,
  type HourRange,
} from '../lib/time-layout';

interface TimeGridProps {
  columns: readonly GridColumn[];
  range: HourRange;
  /** Hoje (`yyyy-MM-dd`) e o minuto atual do dia (linha de “agora”). */
  today: string;
  nowMin: number;
  ariaLabel: string;
  /** Cabeçalho de cada coluna (ex.: dia da semana); ausente = sem cabeçalho. */
  renderHeader?: (date: string) => ReactNode;
  /** Faixa fixa sob o cabeçalho (ex.: hábitos sem horário). */
  renderStrip?: (date: string) => ReactNode;
  stripLabel?: string;
  renderItem: (item: PlacedItem, date: string) => ReactNode;
  /** Clique num espaço vazio: dia e horário (múltiplo de 30 min). */
  onCreateAt: (date: string, time: string) => void;
  /** Largura mínima da grade; abaixo dela, a grade e o cabeçalho rolam juntos na horizontal. */
  minWidthClass?: string;
}

/**
 * Grade de horas (Dia e Semana): coluna de horas, uma linha por hora, blocos posicionados em
 * **porcentagem** do intervalo, linha de agora e rolagem inicial na hora atual (ou 07h).
 */
export function TimeGrid({
  columns,
  range,
  today,
  nowMin,
  ariaLabel,
  renderHeader,
  renderStrip,
  stripLabel,
  renderItem,
  onCreateAt,
  minWidthClass = 'min-w-week-min',
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hours = range.endHour - range.startHour;
  const template = `var(--ds-grid-label-w) repeat(${columns.length}, minmax(0, 1fr))`;
  const bodyHeight = `calc(${hours} * var(--ds-grid-hour-h))`;
  const firstDay = columns[0]?.date ?? '';
  const showsToday = columns.some((c) => c.date === today);

  // Rola até a hora atual (se hoje está na grade) ou até 07h.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const body = bodyRef.current;
    if (!scroller || !body) return;
    const target = showsToday
      ? Math.max(range.startHour, Math.floor(nowMin / 60) - 1)
      : DEFAULT_SCROLL_HOUR;
    const fraction = Math.max(0, (target - range.startHour) / hours);
    scroller.scrollTop = fraction * body.offsetHeight;
    // Só ao trocar de período ou de intervalo; depois a rolagem é do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDay, columns.length, range.startHour, range.endHour]);

  const createAt = (e: MouseEvent<HTMLDivElement>, date: string) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const minutes = Math.min(
      23 * 60 + 30,
      roundDownTo30(range.startHour * 60 + ratio * hours * 60),
    );
    onCreateAt(date, formatMinutes(minutes));
  };

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <div role="grid" aria-label={ariaLabel} className={cn('flex flex-col', minWidthClass)}>
        {(renderHeader || renderStrip) && (
          <div className="sticky top-0 z-20 border-b-hair bg-bg">
            {renderHeader && (
              <div role="row" className="grid" style={{ gridTemplateColumns: template }}>
                <div />
                {columns.map((column) => (
                  <div
                    key={column.date}
                    role="columnheader"
                    className="flex h-week-head items-center justify-center border-l-hair"
                  >
                    {renderHeader(column.date)}
                  </div>
                ))}
              </div>
            )}
            {renderStrip && (
              <div
                role="row"
                aria-label={stripLabel}
                className="grid border-t-hair"
                style={{ gridTemplateColumns: template }}
              >
                <div className="flex items-start justify-end px-2 py-2 text-xs text-muted">
                  {stripLabel}
                </div>
                {columns.map((column) => (
                  <div key={column.date} role="gridcell" className="min-w-0 border-l-hair p-1">
                    {renderStrip(column.date)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          ref={bodyRef}
          role="row"
          className="grid"
          style={{ gridTemplateColumns: template, height: bodyHeight }}
        >
          <div aria-hidden className="relative">
            {Array.from({ length: hours - 1 }, (_, i) => i + 1).map((i) => (
              <span
                key={i}
                className="absolute right-2 -translate-y-1/2 text-2xs text-muted tabular-nums"
                style={{ top: `${(i / hours) * 100}%` }}
              >
                {String(range.startHour + i).padStart(2, '0')}h
              </span>
            ))}
          </div>

          {columns.map((column) => {
            const pct = column.date === today ? nowPct(nowMin, range) : null;
            return (
              <div
                key={column.date}
                role="gridcell"
                aria-label={column.date}
                onClick={(e) => createAt(e, column.date)}
                className="relative cursor-cell border-l-hair"
              >
                {Array.from({ length: hours }, (_, i) => (
                  <div
                    key={i}
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 border-t-hair opacity-dimmed"
                    style={{ top: `${(i / hours) * 100}%` }}
                  />
                ))}
                {column.items.map((item) => {
                  const { top, height } = positionPct(item, range);
                  return (
                    <div
                      key={item.id}
                      className="absolute px-px"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        left: `${(item.column / item.columns) * 100}%`,
                        width: `${100 / item.columns}%`,
                      }}
                    >
                      {renderItem(item, column.date)}
                    </div>
                  );
                })}
                {pct !== null && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-10 h-now-line bg-now"
                    style={{ top: `${pct}%` }}
                  >
                    <span className="absolute top-1/2 -left-1 size-now-dot -translate-y-1/2 rounded-full bg-now" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Texto de horário de um item: “09:00 – 10:30”. */
export const itemTime = (item: Pick<PlacedItem, 'startMin' | 'realMin'>): string =>
  `${formatMinutes(item.startMin)} – ${formatMinutes(item.startMin + item.realMin)}`;
