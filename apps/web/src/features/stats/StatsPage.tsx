import { useData } from '../../lib/data/app-store';
import { AnalysisSection } from './AnalysisSection';
import { TodaySection } from './TodaySection';
import { useStatsModel } from './useStatsModel';

/** Estatísticas: seção “Hoje” (dashboard) e, abaixo, “Análises”. A página rola na vertical. */
export function StatsPage() {
  const model = useStatsModel();
  const name = useData((s) => s.preferences.name);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-stats flex-col gap-10 px-page py-8">
        <h1 className="text-display font-normal tracking-tighter">
          Olá
          {name && (
            <>
              , <span className="text-accent">{name}</span>
            </>
          )}
        </h1>

        <section aria-labelledby="hoje-title">
          <h2 id="hoje-title" className="mb-4 text-lg font-semibold tracking-tight">
            Hoje
          </h2>
          <TodaySection {...model} />
        </section>

        <section aria-labelledby="analises-title">
          <AnalysisSection {...model} />
        </section>
      </div>
    </div>
  );
}
