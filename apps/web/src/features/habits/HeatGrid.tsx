import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { shiftDay } from '../../lib/dates';
import type { Level } from '../../lib/habits/engine';
import { monthLabels } from '../../lib/habits/summary';

export type CellKind = 'off' | 'future' | Level;

export interface CellView {
  kind: CellKind;
  /** Texto lido por leitores de tela (e usado como tooltip). */
  label: string;
}

const LEVEL_CLASS: Record<Level, string> = {
  0: 'heat-lvl-0',
  1: 'heat-lvl-1',
  2: 'heat-lvl-2',
  3: 'heat-lvl-3',
  4: 'heat-lvl-4',
};

const cellClass = (kind: CellKind): string =>
  kind === 'off' ? 'heat-off' : kind === 'future' ? 'heat-off opacity-dimmed' : LEVEL_CLASS[kind];

/** Rótulos de dia à esquerda: só segunda, quarta e sexta (linhas 1, 3 e 5; semana de domingo a sábado). */
const ROW_LABELS: Record<number, string> = { 1: 'Seg', 3: 'Qua', 5: 'Sex' };

interface HeatGridProps {
  /** Semanas em colunas (domingo a sábado). */
  columns: readonly (readonly string[])[];
  /** Primeiro e último dia navegáveis (o resto da primeira/última semana fica oculto). */
  from: string;
  to: string;
  today: string;
  /** Classe `habit-<cor>` que define `--habit`. */
  colorClass: string;
  cell: (date: string) => CellView;
  /** Enter/Espaço/clique numa célula navegável; `anchor` serve para posicionar um popover. */
  onActivate?: (date: string, anchor: HTMLElement) => void;
  caption: string;
  /** Tabela oculta com o resumo por mês (e o que mais ajudar leitores de tela). */
  summary?: ReactNode;
  /** Dia que recebe o foco ao entrar na grade. */
  initialDate: string;
}

/**
 * Grade do heatmap: `role="grid"` com foco móvel (setas ← → andam uma semana, ↑ ↓ um dia, Enter
 * abre o dia). As células crescem com a largura do cartão até `heat-cell-max`; abaixo do tamanho
 * mínimo a grade rola na horizontal, começando na semana mais recente.
 */
export function HeatGrid({
  columns,
  from,
  to,
  today,
  colorClass,
  cell,
  onActivate,
  caption,
  summary,
  initialDate,
}: HeatGridProps) {
  const [active, setActive] = useState(initialDate);
  const [tip, setTip] = useState<{ date: string; left: number; top: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labels = monthLabels(columns);
  const weeks = columns.length;

  // Começa na semana mais recente.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  const lastNavigable = to < today ? to : today;
  const move = (date: string, delta: number) => {
    const next = shiftDay(date, delta);
    return next >= from && next <= lastNavigable ? next : date;
  };

  const focusDate = (date: string) => {
    setActive(date);
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, date: string) => {
    const deltas: Record<string, number> = {
      ArrowLeft: -7,
      ArrowRight: 7,
      ArrowUp: -1,
      ArrowDown: 1,
    };
    const delta = deltas[e.key];
    if (delta !== undefined) {
      e.preventDefault();
      focusDate(move(date, delta));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate?.(date, e.currentTarget);
    }
  };

  const showTip = (date: string, el: HTMLElement) =>
    setTip({ date, left: el.offsetLeft + el.offsetWidth / 2, top: el.offsetTop });

  const template = `var(--spacing-heat-label) repeat(${weeks}, minmax(var(--spacing-heat-cell-min), 1fr))`;
  const maxWidth = `calc(var(--spacing-heat-label) + ${weeks} * (var(--spacing-heat-cell-max) + var(--spacing-heat-gap)))`;

  return (
    <div className={cn('min-w-0', colorClass)}>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div
          ref={gridRef}
          role="grid"
          aria-label={caption}
          aria-readonly
          className="relative text-heat text-muted"
          style={{
            maxWidth,
            minWidth: `calc(var(--spacing-heat-label) + ${weeks} * (var(--spacing-heat-cell-min) + var(--spacing-heat-gap)))`,
          }}
        >
          <div
            aria-hidden
            className="grid gap-x-heat-gap pb-1"
            style={{ gridTemplateColumns: template }}
          >
            <span />
            {labels.map((label, i) => (
              <span key={columns[i]?.[0]} className="overflow-visible whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>

          {Array.from({ length: 7 }, (_, row) => (
            <div
              key={row}
              role="row"
              className="grid items-center gap-x-heat-gap pb-heat-gap"
              style={{ gridTemplateColumns: template }}
            >
              <span aria-hidden className="pr-1">
                {ROW_LABELS[row]}
              </span>
              {columns.map((column) => {
                const date = column[row]!;
                const inRange = date >= from && date <= to;
                if (!inRange)
                  return <span key={date} role="gridcell" aria-hidden className="invisible" />;
                const view = cell(date);
                const navigable = date <= today;
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    data-date={date}
                    aria-label={view.label}
                    tabIndex={date === active ? 0 : -1}
                    disabled={!navigable}
                    onFocus={(e) => {
                      setActive(date);
                      showTip(date, e.currentTarget);
                    }}
                    onBlur={() => setTip(null)}
                    onMouseEnter={(e) => showTip(date, e.currentTarget)}
                    onMouseLeave={() => setTip(null)}
                    onKeyDown={(e) => onKeyDown(e, date)}
                    onClick={(e) => onActivate?.(date, e.currentTarget)}
                    className={cn(
                      'aspect-square w-full rounded-heat',
                      cellClass(view.kind),
                      date === today && 'heat-today',
                      !navigable && 'cursor-default',
                    )}
                  />
                );
              })}
            </div>
          ))}

          {tip && (
            <span
              role="tooltip"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-sm bg-surface px-2 py-1 text-xs whitespace-nowrap text-fg shadow-popover"
              style={{ left: tip.left, top: tip.top }}
            >
              {cell(tip.date).label}
            </span>
          )}
        </div>
      </div>
      {summary}
    </div>
  );
}

/** Legenda “Menos ▢▢▢▢▢ Mais”, no canto direito. */
export function HeatLegend({ colorClass }: { colorClass: string }) {
  return (
    <div
      aria-hidden
      className={cn('mt-2 flex items-center justify-end gap-1 text-heat text-muted', colorClass)}
    >
      <span className="pr-1">Menos</span>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <span key={level} className={cn('size-heat-legend rounded-heat', LEVEL_CLASS[level])} />
      ))}
      <span className="pl-1">Mais</span>
    </div>
  );
}
