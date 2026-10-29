import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  FileCheck2,
  Focus,
  Gift,
  Keyboard,
  LayoutGrid,
  Library,
  ListChecks,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type CounterKey = 'provas' | 'tarefas';

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
  { to: '/blocos', label: 'Blocos de estudo', icon: LayoutGrid },
  { to: '/foco', label: 'Modo Foco', icon: Focus, badgeNew: true },
  { to: '/estatisticas', label: 'Estatísticas', icon: BarChart3 },
];

export const SETTINGS_ITEMS: readonly NavItem[] = [
  { to: '/convidar', label: 'Convidar amigos', icon: Gift },
  { to: '/faq', label: 'FAQ', icon: CircleHelp },
  { to: '/atalhos', label: 'Atalhos', icon: Keyboard },
  { to: '/preferencias', label: 'Preferências', icon: Settings },
];
