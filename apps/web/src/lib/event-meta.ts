import {
  CircleCheck,
  CircleDashed,
  CircleX,
  FileCheck2,
  ListTodo,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { EventStatus, EventType, StudyEvent } from '@daily/shared';

interface EventTypeMeta {
  label: string;
  /** Plural para o filtro (“2 tipos”, “Provas”). */
  plural: string;
  icon: LucideIcon;
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
  tarefa: { label: 'Tarefa', plural: 'Tarefas', icon: ListTodo },
  prova: { label: 'Prova', plural: 'Provas', icon: FileCheck2 },
  especial: { label: 'Especial', plural: 'Especiais', icon: Sparkles },
};

interface EventStatusMeta {
  label: string;
  icon: LucideIcon;
  /** Classe de texto literal (cor reservada do status). */
  text: string;
}

export const EVENT_STATUS_META: Record<EventStatus, EventStatusMeta> = {
  pendente: { label: 'Pendente', icon: CircleDashed, text: 'text-pendente' },
  concluido: { label: 'Concluído', icon: CircleCheck, text: 'text-concluido' },
  cancelado: { label: 'Cancelado', icon: CircleX, text: 'text-cancelado' },
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/** Chip por tipo × status. Classes completas (literais, para o Tailwind enxergar). */
const TASK_CHIP: Record<EventStatus, string> = {
  pendente: 'bg-pendente-soft border-pendente',
  concluido: 'bg-concluido-soft border-concluido',
  cancelado: 'bg-cancelado-soft border-cancelado',
};
const TYPE_CHIP: Record<Exclude<EventType, 'tarefa'>, string> = {
  prova: 'bg-prova-soft border-prova',
  especial: 'bg-especial-soft border-especial',
};
const TASK_TEXT: Record<EventStatus, string> = {
  pendente: 'text-pendente',
  concluido: 'text-concluido',
  cancelado: 'text-cancelado',
};
const TYPE_TEXT: Record<Exclude<EventType, 'tarefa'>, string> = {
  prova: 'text-prova',
  especial: 'text-especial',
};

export interface ChipStyle {
  /** Fundo e borda. */
  chip: string;
  /** Cor de destaque (ícone, faixa). */
  text: string;
  /** Título: riscado se concluído/cancelado; esmaecido se cancelado. */
  title: string;
}

/**
 * Tarefa: a cor é a do status (amarelo, verde, vermelho). Prova e Especial mantêm a cor do tipo;
 * o status aparece por ícone, risco e opacidade.
 */
export function chipStyle(event: Pick<StudyEvent, 'type' | 'status'>): ChipStyle {
  const isTask = event.type === 'tarefa';
  return {
    chip: isTask ? TASK_CHIP[event.status] : TYPE_CHIP[event.type as 'prova' | 'especial'],
    text: isTask ? TASK_TEXT[event.status] : TYPE_TEXT[event.type as 'prova' | 'especial'],
    title:
      event.status === 'cancelado'
        ? 'line-through opacity-60'
        : event.status === 'concluido'
          ? 'line-through'
          : '',
  };
}

/** Cor de destaque do tipo (o chip do filtro e da linha de Tarefas). */
export const TYPE_TEXT_CLASS: Record<EventType, string> = {
  tarefa: 'text-pendente',
  prova: 'text-prova',
  especial: 'text-especial',
};
