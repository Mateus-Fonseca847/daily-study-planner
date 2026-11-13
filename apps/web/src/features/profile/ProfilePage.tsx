import { PersonalStats } from './PersonalStats';
import { ProfileHeader } from './ProfileHeader';
import { TodaySection } from './TodaySection';
import { useStatsModel } from './useStatsModel';

/**
 * Perfil (versão local): cabeçalho com foto e nome, “Hoje” (privado, só do dono) e as
 * estatísticas pessoais. A página rola na vertical.
 */
export function ProfilePage() {
  const model = useStatsModel();
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-stats flex-col gap-10 px-page py-8 phone:gap-6 phone:py-4 phone:fab-clearance">
        <ProfileHeader />
        <section aria-labelledby="hoje-title">
          <h2 id="hoje-title" className="mb-4 text-lg font-semibold tracking-tight">
            Hoje
          </h2>
          <TodaySection {...model} />
        </section>
        <section aria-labelledby="estatisticas-title">
          <h2 id="estatisticas-title" className="mb-4 text-lg font-semibold tracking-tight">
            Estatísticas pessoais
          </h2>
          <PersonalStats {...model} />
        </section>
      </div>
    </div>
  );
}
