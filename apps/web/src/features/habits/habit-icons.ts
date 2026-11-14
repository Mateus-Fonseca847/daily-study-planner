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

/** Classes de cor dos hábitos: vivem em `lib/palette` (também usadas pelo seletor de cor). */
export { HABIT_COLOR_CLASS, habitColorClass } from '../../lib/palette';
