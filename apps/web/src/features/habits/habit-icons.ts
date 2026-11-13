import {
  Apple,
  Bike,
  BookOpen,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Moon,
  Sun,
  Swords,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { HabitIcon } from '@daily/shared';

export const HABIT_ICON_COMPONENT: Record<HabitIcon, LucideIcon> = {
  dumbbell: Dumbbell,
  droplets: Droplets,
  swords: Swords,
  'book-open': BookOpen,
  moon: Moon,
  bike: Bike,
  heart: Heart,
  apple: Apple,
  sun: Sun,
  coffee: Coffee,
  footprints: Footprints,
  target: Target,
};

export const HABIT_ICON_LABEL: Record<HabitIcon, string> = {
  dumbbell: 'Halter',
  droplets: 'Gotas',
  swords: 'Luta',
  'book-open': 'Livro',
  moon: 'Lua',
  bike: 'Bicicleta',
  heart: 'Coração',
  apple: 'Maçã',
  sun: 'Sol',
  coffee: 'Café',
  footprints: 'Pegadas',
  target: 'Alvo',
};

export const HABIT_COLOR_LABEL = {
  ciano: 'Ciano',
  petroleo: 'Petróleo',
  gelo: 'Gelo',
  lilas: 'Lilás',
  fucsia: 'Fúcsia',
  rosa: 'Rosa',
  cinza: 'Cinza',
} as const;

/** Classes completas (o Tailwind só gera o que aparece literalmente no código). */
export const HABIT_COLOR_CLASS = {
  ciano: 'habit-ciano',
  petroleo: 'habit-petroleo',
  gelo: 'habit-gelo',
  lilas: 'habit-lilas',
  fucsia: 'habit-fucsia',
  rosa: 'habit-rosa',
  cinza: 'habit-cinza',
} as const;
