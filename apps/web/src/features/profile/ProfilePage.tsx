import { useState } from 'react';
import { AchievementsSection, AchievementsShowcase } from './achievements/AchievementsSection';
import { PersonalStats } from './PersonalStats';
import { ProfileHeader } from './ProfileHeader';
import { TodaySection } from './TodaySection';
import { useStatsModel } from './useStatsModel';

/**
 * Perfil (versão local): cabeçalho com foto e nome e a vitrine de medalhas, “Hoje” (privado, só do
 * dono), as estatísticas pessoais e as Conquistas. A página rola na vertical.
 */
export function ProfilePage() {
  const model = useStatsModel();
  /** Medalha aberta no detalhe (pela vitrine, pela grade ou pelo “Ver” de um aviso). */
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-stats flex-col gap-10 px-page py-8 phone:gap-6 phone:py-4 phone:fab-clearance">
        <ProfileHeader />
        <AchievementsShowcase onOpen={setOpen} />
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
        <AchievementsSection open={open} onOpen={setOpen} onClose={() => setOpen(null)} />
      </div>
    </div>
  );
}
