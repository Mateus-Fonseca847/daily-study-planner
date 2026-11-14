import type { NavCounts } from '../../lib/data/selectors';
import {
  CalendarDays,
  CircleHelp,
  FileCheck2,
  Focus,
  Gift,
  Keyboard,
  Library,
  ListChecks,
  Repeat,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

/** Contadores da navegação: os dos estudos e os pedidos de amizade recebidos. */
export type ShellCounts = NavCounts & { amigos: number };
export type CounterKey = keyof ShellCounts;

/** Texto lido pelo leitor de tela no distintivo (só onde o número sozinho não basta). */
export function counterLabel(key: CounterKey, count: number): string | undefined {
  if (key !== 'amigos') return undefined;
  return count === 1 ? '1 solicitação recebida' : `${count} solicitações recebidas`;
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Contador rosa, resolvido em runtime a partir dos mocks. */
  counter?: CounterKey;
  badgeNew?: boolean;
}

export const MENU_ITEMS: readonly NavItem[] = [
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/provas', label: 'Provas', icon: FileCheck2, counter: 'provas' },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks, counter: 'tarefas' },
  { to: '/materias', label: 'Matérias', icon: Library },
  { to: '/habitos', label: 'Hábitos', icon: Repeat, counter: 'habitos' },
  { to: '/foco', label: 'Modo Foco', icon: Focus, badgeNew: true },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
  { to: '/amigos', label: 'Amigos', icon: UsersRound, counter: 'amigos' },
];

export const SETTINGS_ITEMS: readonly NavItem[] = [
  { to: '/convidar', label: 'Convidar amigos', icon: Gift },
  { to: '/faq', label: 'FAQ', icon: CircleHelp },
  { to: '/atalhos', label: 'Atalhos', icon: Keyboard },
  { to: '/preferencias', label: 'Preferências', icon: Settings },
];
