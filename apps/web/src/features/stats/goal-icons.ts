import {
  Apple,
  BookOpen,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Moon,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { GoalIcon } from '@daily/shared';

export const GOAL_ICON_COMPONENT: Record<GoalIcon, LucideIcon> = {
  moon: Moon,
  droplets: Droplets,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  heart: Heart,
  coffee: Coffee,
  sun: Sun,
  apple: Apple,
  footprints: Footprints,
  target: Target,
};

export const GOAL_ICON_LABEL: Record<GoalIcon, string> = {
  moon: 'Lua',
  droplets: 'Gotas',
  dumbbell: 'Halter',
  'book-open': 'Livro',
  heart: 'Coração',
  coffee: 'Café',
  sun: 'Sol',
  apple: 'Maçã',
  footprints: 'Pegadas',
  target: 'Alvo',
};
