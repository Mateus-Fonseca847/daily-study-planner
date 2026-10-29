import { Plus } from 'lucide-react';
import { useData } from '../../lib/data/app-store';
import { formatLiters } from '../../lib/stats/format';
import { waterPercent } from '../../lib/stats/derive';
import { useToasts } from '../../lib/toast-store';

interface WaterCardProps {
  ml: number;
  goalMl: number;
  cupMl: number;
  now: Date;
}

/** Água do dia: onda proporcional à meta, valor em litros e botão + (um copo, com “Desfazer”). */
export function WaterCard({ ml, goalMl, cupMl, now }: WaterCardProps) {
  const addWater = useData((s) => s.addWater);
  const removeWater = useData((s) => s.removeWater);
  const percent = waterPercent(ml, goalMl);

  const add = () => {
    const log = addWater(now);
    if (!log) return;
    useToasts.getState().push({
      message: `+${cupMl} ml de água`,
      actionLabel: 'Desfazer',
      onAction: () => removeWater(log.id),
    });
  };

  return (
    <section
      aria-labelledby="water-title"
      className="surface-glass relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-card p-card"
    >
      <div
        role="progressbar"
        aria-label="Meta de água do dia"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${formatLiters(ml)} de ${formatLiters(goalMl)} (${percent}%)`}
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-[height] motion-reduce:transition-none"
        style={{ height: `${percent}%` }}
      >
        <svg
          viewBox="0 0 200 10"
          preserveAspectRatio="none"
          aria-hidden
          className="wave-layer absolute bottom-full left-0 h-wave animate-wave fill-water-wave motion-reduce:animate-none"
        >
          <path d="M0 5 Q25 0 50 5 T100 5 T150 5 T200 5 V10 H0Z" />
        </svg>
        <div className="size-full bg-water" />
      </div>

      <h2 id="water-title" className="relative text-card-title font-normal">
        Água
      </h2>
      <div className="relative mt-auto flex items-end justify-between gap-2 pt-6">
        <span className="text-stat font-normal tabular-nums">{formatLiters(ml)}</span>
        <button
          type="button"
          aria-label={`Adicionar um copo de ${cupMl} ml`}
          title={`Adicionar um copo (${cupMl} ml)`}
          onClick={add}
          className="inline-flex size-control-sm shrink-0 items-center justify-center rounded-full bg-water-button text-fg hover:brightness-125"
        >
          <Plus aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </button>
      </div>
    </section>
  );
}
