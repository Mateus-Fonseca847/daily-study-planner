import { useData } from '../data/app-store';
import { appNow, isFixture } from '../fixture';
import { createAchievementsRunner } from './runner';

/** Liga as medalhas ao app (as fixtures avaliam em memória, sem avisos). */
export const startAchievements = (): (() => void) =>
  createAchievementsRunner(useData, { now: appNow, silent: isFixture });
