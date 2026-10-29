import type { SeriesItem, SubjectHours } from '../../lib/stats/analysis';
import type { SUBJECT_COLOR_CLASS } from '../../components/ui/SubjectDot';

/** Larguras do gráfico em unidades do `viewBox` (cada barra ocupa 10). */
const SLOT = 10;
const BAR = 7;
const BAR_X = 1.5;
const MIN_BAR_HEIGHT = 2;
/** Com muitos rótulos, mostra só um a cada N para não encavalar. */
const MAX_LABELS = 8;

export const EMPTY_CHART_TEXT = 'Ainda não há dados neste período';

const SUBJECT_FILL: Record<keyof typeof SUBJECT_COLOR_CLASS, string> = {
  vermelho: 'fill-subject-vermelho',
  laranja: 'fill-subject-laranja',
  amarelo: 'fill-subject-amarelo',
  verde: 'fill-subject-verde',
  turquesa: 'fill-subject-turquesa',
  azul: 'fill-subject-azul',
  violeta: 'fill-subject-violeta',
  rosa: 'fill-subject-rosa',
};

interface BarChartProps {
  items: readonly SeriesItem[];
  /** Formata um valor para o texto alternativo (ex.: horas). */
  format: (value: number) => string;
  /** Resumo para leitores de tela (legenda da tabela oculta). */
  caption: string;
  valueHeader: string;
  plannedHeader?: string;
}

/** Barras em SVG próprio: `planned` (quando existe) é a trilha; `value` é o preenchimento amarelo. */
export function BarChart({ items, format, caption, valueHeader, plannedHeader }: BarChartProps) {
  const max = Math.max(1, ...items.map((i) => Math.max(i.planned ?? 0, i.value)));
  const height = (value: number) =>
    value <= 0 ? 0 : Math.max(MIN_BAR_HEIGHT, (value / max) * 100);
  const step = items.length > MAX_LABELS * 2 ? Math.ceil(items.length / MAX_LABELS) : 1;

  return (
    <div>
      <svg
        viewBox={`0 0 ${items.length * SLOT} 100`}
        preserveAspectRatio="none"
        aria-hidden
        className="h-chart w-full"
      >
        {items.map((item, i) => {
          const planned = height(item.planned ?? 0);
          const value = height(item.value);
          return (
            <g key={item.fullLabel}>
              <rect
                x={i * SLOT + BAR_X}
                y={100 - Math.max(planned, value)}
                width={BAR}
                height={Math.max(planned, value)}
                rx={1}
                className="fill-chart-track-strong"
                opacity={item.planned === undefined ? 0 : 1}
              />
              <rect
                x={i * SLOT + BAR_X}
                y={100 - value}
                width={BAR}
                height={value}
                rx={1}
                className="fill-accent"
              />
            </g>
          );
        })}
      </svg>
      <div
        aria-hidden
        className="mt-1 grid text-2xs text-muted"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item, i) => (
          <span key={item.fullLabel} className="text-center">
            {i % step === 0 ? item.label : ''}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Período</th>
            {plannedHeader && <th>{plannedHeader}</th>}
            <th>{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.fullLabel}>
              <td>{item.fullLabel}</td>
              {plannedHeader && <td>{format(item.planned ?? 0)}</td>}
              <td>{format(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface HorizontalBarsProps {
  rows: readonly SubjectHours[];
  format: (minutes: number) => string;
  caption: string;
}

/** Barras horizontais, uma por matéria, na cor da matéria. */
export function HorizontalBars({ rows, format, caption }: HorizontalBarsProps) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <ul aria-label={caption} className="flex flex-col gap-3">
      {rows.map(({ subject, minutes }) => (
        <li key={subject.id} className="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-3">
          <span className="truncate text-md text-soft">{subject.name}</span>
          <svg
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            aria-hidden
            className="h-stat-bar w-full"
          >
            <rect width="100" height="6" rx="3" className="fill-chart-track" />
            <rect
              width={(minutes / max) * 100}
              height="6"
              rx="3"
              className={SUBJECT_FILL[subject.color]}
            />
          </svg>
          <span className="text-right text-md tabular-nums">{format(minutes)}</span>
        </li>
      ))}
    </ul>
  );
}
