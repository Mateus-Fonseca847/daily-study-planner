import { useMemo } from 'react';
import type { Achievement } from '@daily/shared';
import { CATALOG, type AchievementDef } from '../../../lib/achievements/catalog';
import { progress, showcase, type Progress } from '../../../lib/achievements/evaluate';
import { factsFor } from '../../../lib/achievements/runner';
import { useData } from '../../../lib/data/app-store';
import { toLocalIso } from '../../../lib/dates';
import { appNow } from '../../../lib/fixture';

export interface AchievementItem {
  def: AchievementDef;
  /** O registro gravado (ausente = bloqueada). */
  achieved: Achievement | undefined;
  progress: Progress;
}

/** O catálogo com o que foi conquistado e o progresso de cada medalha (calculado, nunca gravado). */
export function useAchievements() {
  const state = useData((s) => s);
  const achievements = state.achievements;
  const facts = factsFor(state, toLocalIso(appNow()));
  return useMemo(() => {
    const byId = new Map(achievements.map((a) => [a.id, a]));
    const items: AchievementItem[] = CATALOG.map((def) => {
      const achieved = byId.get(def.id);
      return { def, achieved, progress: progress(def, facts, achieved) };
    });
    const earned = items.filter((i) => i.achieved).length;
    return { items, earned, total: items.length, showcase: showcase(achievements) };
  }, [achievements, facts]);
}
