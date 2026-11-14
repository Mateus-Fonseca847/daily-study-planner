import { MAX_FEATURED_ACHIEVEMENTS, type Achievement } from '@daily/shared';
import { CATALOG, CATALOG_BY_ID, type AchievementDef } from './catalog';
import type { Facts } from './facts';

export interface EvaluateOptions {
  /**
   * Concessão retroativa (1ª avaliação depois de atualizar): cada nível leva a data em que o
   * histórico alcançou a meta. Fora dela, um nível novo leva a data da avaliação (`facts.now`).
   */
  retroactive: boolean;
}

/** Quantos níveis a medida alcança (0 = nenhum). */
const reachedLevel = (def: AchievementDef, value: number): number =>
  def.levels.filter((goal) => value >= goal).length;

/**
 * Devolve só o que mudou: medalhas novas e subidas de nível (o registro inteiro, já com o
 * histórico de datas). Idempotente: avaliar de novo com os mesmos fatos não devolve nada. Nunca
 * rebaixa nem remove: o que já foi conquistado fica.
 */
export function evaluate(
  facts: Facts,
  current: readonly Achievement[],
  { retroactive }: EvaluateOptions,
): Achievement[] {
  const have = new Map(current.map((a) => [a.id, a]));
  const changed: Achievement[] = [];
  for (const def of CATALOG) {
    const measure = def.measure(facts);
    const level = reachedLevel(def, measure.value);
    const previous = have.get(def.id);
    const before = previous?.level ?? 0;
    if (level <= before) continue;
    const levels = [...(previous?.levels ?? [])];
    for (let n = before + 1; n <= level; n += 1) {
      const reached = retroactive ? measure.reachedOn(def.levels[n - 1]!) : null;
      // Datas em ordem: um nível nunca antes do anterior.
      const date =
        reached && (levels.length === 0 || reached >= levels.at(-1)!) ? reached : facts.now;
      levels.push(date);
    }
    changed.push({ id: def.id, level, levels, featured: previous?.featured ?? false });
  }
  return changed;
}

/** Junta as mudanças na lista gravada (substitui pelo id, acrescenta as novas). */
export function mergeAchievements(
  current: readonly Achievement[],
  changes: readonly Achievement[],
): Achievement[] {
  const byId = new Map(current.map((a) => [a.id, a]));
  for (const change of changes) byId.set(change.id, change);
  return [...byId.values()];
}

export interface Progress {
  value: number;
  /** Meta do próximo nível (ou a do último, quando tudo foi conquistado). */
  goal: number;
  /** Nível gravado (0 = bloqueada). */
  level: number;
  /** Próximo nível (1–3), ou `null` quando já está no máximo. */
  nextLevel: number | null;
}

/** Progresso para a interface (nunca gravado). */
export function progress(def: AchievementDef, facts: Facts, achieved?: Achievement): Progress {
  const value = def.measure(facts).value;
  const level = Math.max(achieved?.level ?? 0, 0);
  const nextLevel = level < def.levels.length ? level + 1 : null;
  const goal = def.levels[(nextLevel ?? def.levels.length) - 1]!;
  return { value, goal, level, nextLevel };
}

/**
 * União de duas listas (conflito entre dispositivos): por medalha, vence o nível mais alto e cada
 * nível fica com a data mais antiga das duas; `featured` vem de `preferred` (a versão escolhida),
 * recortado no limite. Medalhas que só existem de um lado entram como estão.
 */
export function unionAchievements(
  preferred: readonly Achievement[],
  other: readonly Achievement[],
): Achievement[] {
  const otherById = new Map(other.map((a) => [a.id, a]));
  const ids = [...new Set([...preferred.map((a) => a.id), ...other.map((a) => a.id)])];
  const prefById = new Map(preferred.map((a) => [a.id, a]));
  const merged = ids.map((id): Achievement => {
    const a = prefById.get(id);
    const b = otherById.get(id);
    if (!a || !b) return { ...(a ?? b)!, featured: a?.featured ?? false };
    const level = Math.max(a.level, b.level);
    const levels: string[] = [];
    for (let i = 0; i < level; i += 1) {
      const dates = [a.levels[i], b.levels[i]].filter((d): d is string => d !== undefined);
      const earliest = dates.sort()[0]!;
      // Mantém a ordem: um nível nunca antes do anterior.
      levels.push(i > 0 && earliest < levels[i - 1]! ? levels[i - 1]! : earliest);
    }
    return { id, level, levels, featured: a.featured };
  });
  return limitFeatured(merged);
}

/** No máximo 3 em destaque (ficam os primeiros da lista). */
export function limitFeatured(list: readonly Achievement[]): Achievement[] {
  let left = MAX_FEATURED_ACHIEVEMENTS;
  return list.map((a) => {
    if (!a.featured) return a;
    if (left > 0) {
      left -= 1;
      return a;
    }
    return { ...a, featured: false };
  });
}

/**
 * Marca ou desmarca o destaque. Com 3 já marcadas, marcar outra exige `replace` (o id que sai);
 * sem ele, devolve `'limite'` e nada muda.
 */
export function setFeatured(
  list: readonly Achievement[],
  id: string,
  featured: boolean,
  replace?: string,
): Achievement[] | 'limite' {
  const target = list.find((a) => a.id === id);
  if (!target) return [...list];
  const count = list.filter((a) => a.featured && a.id !== id).length;
  if (featured && count >= MAX_FEATURED_ACHIEVEMENTS && !replace) return 'limite';
  return list.map((a) => {
    if (a.id === id) return { ...a, featured };
    if (featured && a.id === replace) return { ...a, featured: false };
    return a;
  });
}

/** As da vitrine: as destacadas ou, sem nenhuma escolhida, as 3 mais recentes (do catálogo). */
export function showcase(list: readonly Achievement[]): Achievement[] {
  const known = list.filter((a) => CATALOG_BY_ID.has(a.id));
  const featured = known.filter((a) => a.featured);
  if (featured.length > 0) return featured.slice(0, MAX_FEATURED_ACHIEVEMENTS);
  return [...known]
    .sort((a, b) => b.levels.at(-1)!.localeCompare(a.levels.at(-1)!))
    .slice(0, MAX_FEATURED_ACHIEVEMENTS);
}
