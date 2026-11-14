import type { Achievement } from '@daily/shared';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { DataStore } from '../data/store';
import { toLocalIso } from '../dates';
import { useToasts } from '../toast-store';
import { CATALOG_BY_ID, levelName } from './catalog';
import { evaluate } from './evaluate';
import { buildFacts, type AchievementSources, type Facts } from './facts';
import { preparedChanges } from './prepared';
import { useAchievementsUi } from './ui-store';

/** Espera depois da última mudança relevante antes de avaliar (agrupa rajadas de edições). */
export const EVALUATE_DEBOUNCE_MS = 600;
/** Quanto o aviso de medalha fica na tela. */
export const ACHIEVEMENT_TOAST_MS = 8000;

/** As fatias do estado que mexem em alguma medalha (a referência muda quando elas mudam). */
const relevant = (s: DataStore) =>
  [
    s.events,
    s.exceptions,
    s.focusSessions,
    s.habits,
    s.habitLogs,
    s.waterLogs,
    s.restDays,
    s.preferences.waterGoalMl,
    s.onboarding.achievementsSeededAt,
  ] as const;

const sourcesOf = (s: DataStore): AchievementSources => ({
  events: s.events,
  exceptions: s.exceptions,
  focusSessions: s.focusSessions,
  habits: s.habits,
  habitLogs: s.habitLogs,
  waterLogs: s.waterLogs,
  restDays: s.restDays,
  preferences: s.preferences,
  seededAt: s.onboarding.achievementsSeededAt,
});

/** Fatos memorizados pela identidade das fatias e pelo dia (o Perfil e o runner compartilham). */
let memo: { key: readonly unknown[]; today: string; facts: Facts } | null = null;
export function factsFor(state: DataStore, now: string): Facts {
  const key = relevant(state);
  const today = now.slice(0, 10);
  if (memo && memo.today === today && memo.key.every((v, i) => v === key[i])) return memo.facts;
  const facts = buildFacts(sourcesOf(state), now);
  memo = { key, today, facts };
  return facts;
}

/** “Constância — prata”, ou só o título numa medalha de nível único. */
export function medalLabel(a: Pick<Achievement, 'id' | 'level'>): string {
  const def = CATALOG_BY_ID.get(a.id);
  if (!def) return a.id;
  const level = levelName(def, a.level);
  return level ? `${def.title} — ${level.toLowerCase()}` : def.title;
}

/** O texto do aviso: uma medalha pelo nome; várias, agrupadas num aviso só. */
export function noticeFor(changes: readonly Pick<Achievement, 'id' | 'level'>[]): string {
  if (changes.length === 1) return `Nova medalha: ${medalLabel(changes[0]!)}`;
  return `${changes.length} novas medalhas: ${changes.map(medalLabel).join(', ')}`;
}

/** Foco em andamento (rodando ou pausado): os avisos esperam a sessão acabar. */
const focusBusy = (s: DataStore) =>
  s.focusActive !== null &&
  (s.focusActive.status === 'rodando' || s.focusActive.status === 'pausado');

export interface RunnerDeps {
  /** Relógio (as fixtures usam a data fixa). */
  now: () => Date;
  /** Sem avisos (fixtures de desenvolvimento). */
  silent?: boolean;
}

/**
 * Liga a avaliação de medalhas ao store: depois de mudanças relevantes (com debounce), grava o
 * que for novo numa escrita só e avisa uma vez, agrupado. A 1ª avaliação depois da atualização
 * concede o histórico de uma vez com um único resumo. Avisos esperam o fim do Modo Foco.
 */
export function createAchievementsRunner(
  useData: UseBoundStore<StoreApi<DataStore>>,
  { now: clock, silent = false }: RunnerDeps,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Na fila até o Foco acabar: o resumo da concessão retroativa e as medalhas novas. */
  let retro: Achievement[] = [];
  let pending: Achievement[] = [];

  const notify = (changes: readonly Achievement[], retroactive: boolean) => {
    if (silent || changes.length === 0) return;
    if (retroactive) retro = [...changes];
    else pending = [...pending.filter((p) => !changes.some((c) => c.id === p.id)), ...changes];
    flush();
  };

  const flush = () => {
    if (focusBusy(useData.getState())) return;
    const toast = useToasts.getState();
    if (retro.length > 0) {
      const granted = retro;
      retro = [];
      toast.push({
        message:
          granted.length === 1
            ? `Você já conquistou 1 medalha: ${medalLabel(granted[0]!)}`
            : `Você já conquistou ${granted.length} medalhas`,
        actionLabel: 'Ver',
        onAction: () => useAchievementsUi.getState().show(null),
        durationMs: ACHIEVEMENT_TOAST_MS,
      });
    }
    if (pending.length > 0) {
      const changes = pending;
      pending = [];
      toast.push({
        message: noticeFor(changes),
        actionLabel: 'Ver',
        onAction: () =>
          useAchievementsUi.getState().show(changes.length === 1 ? changes[0]!.id : null),
        durationMs: ACHIEVEMENT_TOAST_MS,
      });
    }
  };

  const run = () => {
    const state = useData.getState();
    if (state.issue) return;
    const now = toLocalIso(clock());
    const retroactive = state.onboarding.achievementsSeededAt === null;
    const prepared = preparedChanges(state.events, now);
    const changes = evaluate(factsFor(state, now), state.achievements, { retroactive });
    if (changes.length === 0 && !retroactive && prepared.length === 0) return;
    state.applyAchievements({ changes, prepared, ...(retroactive ? { seededAt: now } : {}) });
    notify(changes, retroactive);
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, EVALUATE_DEBOUNCE_MS);
  };

  let last = relevant(useData.getState());
  let wasBusy = focusBusy(useData.getState());
  const unsubscribe = useData.subscribe((state) => {
    const next = relevant(state);
    if (next.some((v, i) => v !== last[i])) {
      last = next;
      schedule();
    }
    const busy = focusBusy(state);
    if (wasBusy && !busy) flush();
    wasBusy = busy;
  });
  schedule();
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}
