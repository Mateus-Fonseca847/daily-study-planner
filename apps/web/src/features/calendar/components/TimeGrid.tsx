import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../../lib/cn';
import {
  exceedsLongPressMove,
  LONG_PRESS_MS,
  type SwipeDirection,
} from '../../../lib/responsive/gesture';
import { useSwipe } from '../../../lib/responsive/use-swipe';
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
  /** Deslizar na horizontal (celular; só na visão Dia, que não rola para os lados). */
  onSwipe?: (direction: Exclude<SwipeDirection, null>) => void;
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
  onSwipe,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hours = range.endHour - range.startHour;
  const template = `var(--ds-grid-label-w) repeat(${columns.length}, minmax(0, 1fr))`;
  const bodyHeight = `calc(${hours} * var(--ds-grid-hour-h))`;
  const firstDay = columns[0]?.date ?? '';
  const showsToday = columns.some((c) => c.date === today);
  useSwipe(scrollRef, { enabled: Boolean(onSwipe), onSwipe: (dir) => onSwipe?.(dir) });

  // Toque: criar evento só com toque longo (o toque simples rola a grade e não cria nada).
  const lastPointer = useRef<string>('mouse');
  const press = useRef<{
    date: string;
    x: number;
    y: number;
    timer: number;
    fired: boolean;
    time: string;
  } | null>(null);
  const [pressed, setPressed] = useState<{ date: string; time: string; pct: number } | null>(null);

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
    // Semana estreita (rola para os lados): começa no dia de hoje.
    const todayIndex = columns.findIndex((c) => c.date === today);
    if (todayIndex > 0 && scroller.scrollWidth > scroller.clientWidth) {
      const labelWidth = body.firstElementChild?.clientWidth ?? 0;
      const colWidth = (scroller.scrollWidth - labelWidth) / columns.length;
      scroller.scrollLeft = todayIndex * colWidth;
    }
    // Só ao trocar de período ou de intervalo; depois a rolagem é do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDay, columns.length, range.startHour, range.endHour]);

  /** Horário (múltiplo de 30 min) sob a posição vertical `clientY` da coluna. */
  const minutesAt = (clientY: number, rect: DOMRect): number => {
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return Math.min(23 * 60 + 30, roundDownTo30(range.startHour * 60 + ratio * hours * 60));
  };

  const createAt = (e: MouseEvent<HTMLDivElement>, date: string) => {
    if (e.target !== e.currentTarget) return;
    if (lastPointer.current !== 'mouse') return; // no toque, só o toque longo cria
    onCreateAt(date, formatMinutes(minutesAt(e.clientY, e.currentTarget.getBoundingClientRect())));
  };

  const clearPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    setPressed(null);
  };
  const onPressStart = (e: PointerEvent<HTMLDivElement>, date: string) => {
    lastPointer.current = e.pointerType;
    if (e.pointerType === 'mouse' || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    clearPress();
    const entry = {
      date,
      x: e.clientX,
      y: e.clientY,
      fired: false,
      time: formatMinutes(minutesAt(e.clientY, rect)),
      timer: 0,
    };
    entry.timer = window.setTimeout(() => {
      entry.fired = true;
      const minutes = minutesAt(entry.y, rect);
      entry.time = formatMinutes(minutes);
      setPressed({
        date,
        time: entry.time,
        pct: ((minutes - range.startHour * 60) / (hours * 60)) * 100,
      });
      navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
    press.current = entry;
  };
  const onPressMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (p && exceedsLongPressMove(e.clientX - p.x, e.clientY - p.y)) clearPress();
  };
  const onPressEnd = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    const create = p.fired && !exceedsLongPressMove(e.clientX - p.x, e.clientY - p.y);
    const { date, time } = p;
    clearPress();
    if (create) onCreateAt(date, time);
  };

  return (
    <div
      ref={scrollRef}
      data-scroll-x
      className={cn(
        'min-h-0 flex-1 overflow-auto max-xl:scroll-pl-grid-label max-xl:snap-x max-xl:snap-proximity',
        onSwipe && 'touch-pan-y',
      )}
    >
      <div role="grid" aria-label={ariaLabel} className={cn('flex flex-col', minWidthClass)}>
        {(renderHeader || renderStrip) && (
          <div className="sticky top-0 z-20 border-b-hair bg-bg">
            {renderHeader && (
              <div role="row" className="grid" style={{ gridTemplateColumns: template }}>
                <div className="max-xl:sticky max-xl:left-0 max-xl:z-10 max-xl:bg-bg" />
                {columns.map((column) => (
                  <div
                    key={column.date}
                    role="columnheader"
                    className="flex h-week-head items-center justify-center border-l-hair coarse:h-auto coarse:min-h-week-head max-xl:snap-start"
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
                <div className="flex items-start justify-end px-2 py-2 text-xs text-muted max-xl:sticky max-xl:left-0 max-xl:z-10 max-xl:bg-bg">
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
          <div
            aria-hidden
            className="relative max-xl:sticky max-xl:left-0 max-xl:z-10 max-xl:bg-bg"
          >
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
                onPointerDown={(e) => onPressStart(e, column.date)}
                onPointerMove={onPressMove}
                onPointerUp={onPressEnd}
                onPointerCancel={clearPress}
                onContextMenu={(e) => {
                  if (lastPointer.current !== 'mouse') e.preventDefault();
                }}
                className="no-callout relative cursor-cell border-l-hair coarse:select-none max-xl:snap-start"
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
                {pressed?.date === column.date && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-start justify-end rounded-sm border-hair border-accent bg-accent-soft px-1 text-2xs font-bold text-accent"
                    style={{ top: `${pressed.pct}%`, height: `${(30 / (hours * 60)) * 100}%` }}
                  >
                    {pressed.time}
                  </div>
                )}
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
