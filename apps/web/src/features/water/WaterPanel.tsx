import { useState, type ReactNode } from 'react';
import { Popover } from '../../components/ui/Popover';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { formatLongDay } from '../../lib/habits/summary';
import { WaterDayEditor } from './WaterDayEditor';

interface WaterPanelProps {
  anchor: HTMLElement;
  /** Dia editado (`yyyy-MM-dd`); padrão: hoje. */
  date?: string;
  onClose: () => void;
  /** Ações extras abaixo do editor (no heatmap do hábito “Água”: “Marcar descanso”). */
  footer?: ReactNode;
}

/** Painel de água ancorado no gatilho (popover no desktop; sheet no celular). */
export function WaterPanel({ anchor, date, onClose, footer }: WaterPanelProps) {
  const day = date ?? dayKey(appNow());
  const today = dayKey(appNow());
  return (
    <Popover
      anchor={anchor}
      onClose={onClose}
      aria-label={day === today ? 'Água de hoje' : `Água de ${formatLongDay(day)}`}
    >
      <WaterDayEditor date={day} />
      {footer}
    </Popover>
  );
}

interface WaterTriggerProps {
  date?: string;
  /** Renderiza o gatilho; `props` leva o ref e o clique que abrem o painel. */
  children: (props: {
    ref: (el: HTMLButtonElement | null) => void;
    onClick: () => void;
    'aria-haspopup': 'dialog';
    'aria-expanded': boolean;
  }) => ReactNode;
}

/** Cuida do estado aberto/fechado e da âncora do painel de água. */
export function WaterTrigger({ date, children }: WaterTriggerProps) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      {children({
        ref: setAnchor,
        onClick: () => setOpen((v) => !v),
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
      })}
      {open && anchor && (
        <WaterPanel anchor={anchor} {...(date ? { date } : {})} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
