import { BookOpen, FileCheck2, RefreshCw, Send, Sparkles, type LucideIcon } from 'lucide-react';
import type { EventStatus, EventType } from '@daily/shared';

interface EventTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Classes completas (literais, para o Tailwind enxergar). */
  chip: string;
  text: string;
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
  prova: {
    label: 'Prova',
    icon: FileCheck2,
    chip: 'bg-prova-soft border-prova',
    text: 'text-prova',
  },
  estudo: {
    label: 'Estudo',
    icon: BookOpen,
    chip: 'bg-estudo-soft border-estudo',
    text: 'text-estudo',
  },
  entrega: {
    label: 'Entrega',
    icon: Send,
    chip: 'bg-entrega-soft border-entrega',
    text: 'text-entrega',
  },
  revisao: {
    label: 'Revisão',
    icon: RefreshCw,
    chip: 'bg-revisao-soft border-revisao',
    text: 'text-revisao',
  },
  especial: {
    label: 'Especial',
    icon: Sparkles,
    chip: 'bg-especial-soft border-especial',
    text: 'text-especial',
  },
};

/** Nomes usados nos formulários (a “Tarefa” é o evento do tipo `entrega`). */
export const EVENT_FORM_LABEL: Record<EventType, string> = {
  prova: 'Prova',
  estudo: 'Bloco de estudo',
  entrega: 'Tarefa',
  revisao: 'Revisão',
  especial: 'Especial',
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  pendente: 'Pendente',
  'em-andamento': 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};
