import { useState } from 'react';
import { Check, Pin, PinOff } from 'lucide-react';
import { MAX_FEATURED_ACHIEVEMENTS } from '@daily/shared';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { CATALOG_BY_ID, LEVEL_NAMES } from '../../../lib/achievements/catalog';
import { useData } from '../../../lib/data/app-store';
import { LevelTag } from './AchievementCard';
import { Medal } from './Medal';
import { formatDate, progressText } from './meta';
import type { AchievementItem } from './useAchievements';

interface AchievementDetailProps {
  item: AchievementItem;
  onClose: () => void;
}

/**
 * Detalhe da medalha: critério, progresso, a data de cada nível e “Destacar no perfil” (até 3;
 * passando do limite, pede para trocar uma das destacadas).
 */
export function AchievementDetail({ item, onClose }: AchievementDetailProps) {
  const { def, achieved, progress } = item;
  const achievements = useData((s) => s.achievements);
  const setFeatured = useData((s) => s.setAchievementFeatured);
  const [choosing, setChoosing] = useState(false);
  const featured = achievements.filter((a) => a.featured);
  const isFeatured = achieved?.featured === true;

  const feature = () => {
    if (!achieved) return;
    if (isFeatured) return void setFeatured(def.id, false);
    if (setFeatured(def.id, true) === 'limite') setChoosing(true);
  };

  return (
    <Modal
      title={def.title}
      onClose={onClose}
      footer={
        achieved && !choosing ? (
          <Button variant={isFeatured ? 'secondary' : 'primary'} onClick={feature}>
            {isFeatured ? (
              <PinOff aria-hidden strokeWidth={1.5} className="size-icon" />
            ) : (
              <Pin aria-hidden strokeWidth={1.5} className="size-icon" />
            )}
            {isFeatured ? 'Tirar do destaque' : 'Destacar no perfil'}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex items-center gap-4">
          <Medal def={def} level={achieved?.level ?? 0} size="lg" />
          <div className="flex flex-col gap-1">
            <LevelTag item={item} />
            <p className="text-md text-soft">{def.description}</p>
          </div>
        </div>

        {progress.nextLevel !== null && (
          <div className="flex flex-col gap-1.5">
            <ProgressBar
              value={progress.value / progress.goal}
              aria-label={`Progresso de ${def.title}`}
            />
            <span className="text-sm text-soft">{progressText(def, progress)}</span>
          </div>
        )}

        <section aria-label="Níveis" className="flex flex-col gap-2">
          {def.levels.map((goal, i) => {
            const date = achieved?.levels[i];
            const name = def.levels.length === 1 ? 'Conquista' : LEVEL_NAMES[i];
            const unit = goal === 1 ? def.unit.one : def.unit.many;
            return (
              <div key={goal} className="flex items-center justify-between gap-3 text-md">
                <span className="flex items-center gap-2">
                  {date ? (
                    <Check aria-hidden strokeWidth={2} className="size-icon-sm text-concluido" />
                  ) : (
                    <span aria-hidden className="size-icon-sm" />
                  )}
                  <span className="font-medium">{name}</span>
                  <span className="text-muted">
                    {goal} {unit}
                  </span>
                </span>
                <span className={date ? 'text-soft' : 'text-muted'}>
                  {date ? formatDate(date) : 'Ainda não'}
                </span>
              </div>
            );
          })}
        </section>

        {choosing && (
          <section aria-label="Trocar destaque" className="flex flex-col gap-2">
            <p className="text-md text-soft">
              Você já tem {MAX_FEATURED_ACHIEVEMENTS} medalhas em destaque. Qual sai para dar lugar
              a {def.title}?
            </p>
            {featured.map((a) => (
              <Button
                key={a.id}
                variant="outline"
                onClick={() => {
                  setFeatured(def.id, true, a.id);
                  setChoosing(false);
                }}
              >
                Trocar {CATALOG_BY_ID.get(a.id)?.title ?? a.id}
              </Button>
            ))}
            <Button variant="secondary" onClick={() => setChoosing(false)}>
              Cancelar
            </Button>
          </section>
        )}
      </div>
    </Modal>
  );
}
