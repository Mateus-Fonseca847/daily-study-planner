import { useEffect, useRef, useState } from 'react';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ACHIEVEMENT_CATEGORIES } from '../../../lib/achievements/catalog';
import { useAchievementsUi } from '../../../lib/achievements/ui-store';
import { AchievementCard } from './AchievementCard';
import { AchievementDetail } from './AchievementDetail';
import { Medal } from './Medal';
import { levelLabel } from './meta';
import { useAchievements, type AchievementItem } from './useAchievements';

type Filter = 'todas' | 'conquistadas' | 'andamento';
const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'conquistadas', label: 'Conquistadas' },
  { value: 'andamento', label: 'Em andamento' },
];
const matches = (item: AchievementItem, filter: Filter) =>
  filter === 'todas' ||
  (filter === 'conquistadas'
    ? item.achieved !== undefined
    : item.progress.nextLevel !== null && item.progress.value > 0);

/** Vitrine do topo do Perfil: as destacadas ou, sem escolha, as 3 mais recentes. */
export function AchievementsShowcase({ onOpen }: { onOpen: (id: string) => void }) {
  const { items, showcase } = useAchievements();
  if (showcase.length === 0) return null;
  const anyFeatured = showcase.some((a) => a.featured);
  return (
    <section aria-labelledby="vitrine-title" className="flex flex-col gap-3">
      <h2 id="vitrine-title" className="text-md font-semibold text-soft">
        {anyFeatured ? 'Em destaque' : 'Conquistas recentes'}
      </h2>
      <ul className="flex flex-wrap gap-3">
        {showcase.map((a) => {
          const item = items.find((i) => i.def.id === a.id);
          if (!item) return null;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpen(a.id)}
                aria-label={`${item.def.title}, ${levelLabel(item.def, a.level).toLowerCase()}`}
                className="flex items-center gap-3 rounded-full border-hair bg-surface py-1.5 pl-1.5 pr-4 transition-colors hover:bg-hover"
              >
                <Medal def={item.def} level={a.level} />
                <span className="flex flex-col text-left">
                  <span className="text-md font-semibold">{item.def.title}</span>
                  <span className="text-sm text-soft">{levelLabel(item.def, a.level)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Perfil → Conquistas: contador, filtro, grade por categoria (bloqueadas em silhueta, com o
 * progresso) e o detalhe de cada medalha. Atende o “Ver” dos avisos (abre a medalha ou a seção).
 */
export function AchievementsSection({
  open,
  onOpen,
  onClose,
}: {
  open: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const { items, earned, total } = useAchievements();
  const [filter, setFilter] = useState<Filter>('todas');
  const ref = useRef<HTMLElement>(null);
  const request = useAchievementsUi((s) => s.request);
  const clear = useAchievementsUi((s) => s.clear);

  useEffect(() => {
    if (!request) return;
    ref.current?.scrollIntoView({ block: 'start' });
    if (request.id) onOpen(request.id);
    clear();
  }, [request, clear, onOpen]);

  const detail = open ? items.find((i) => i.def.id === open) : undefined;
  const visible = items.filter((i) => matches(i, filter));

  return (
    <section ref={ref} id="conquistas" aria-labelledby="conquistas-title" className="scroll-mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="conquistas-title" className="text-lg font-semibold tracking-tight">
          Conquistas{' '}
          <span className="text-md font-normal text-muted">
            {earned} de {total}
          </span>
        </h2>
        <SegmentedControl
          aria-label="Filtrar conquistas"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          compact
        />
      </div>

      {earned === 0 && (
        <p className="mb-4 text-md text-soft">
          Sua primeira medalha está a uma tarefa de distância. Elas reconhecem constância e
          conclusão, nunca excesso, e o que você conquista fica com você.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="text-md text-muted">
          {filter === 'conquistadas'
            ? 'Nenhuma medalha conquistada ainda.'
            : 'Nenhuma medalha em andamento agora.'}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {ACHIEVEMENT_CATEGORIES.map((category) => {
            const group = visible.filter((i) => i.def.category === category.id);
            if (group.length === 0) return null;
            return (
              <section key={category.id} aria-labelledby={`cat-${category.id}`}>
                <h3 id={`cat-${category.id}`} className="mb-2 text-md font-semibold text-soft">
                  {category.label}
                </h3>
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {group.map((item) => (
                    <li key={item.def.id}>
                      <AchievementCard item={item} onOpen={() => onOpen(item.def.id)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {detail && <AchievementDetail item={detail} onClose={onClose} />}
    </section>
  );
}
