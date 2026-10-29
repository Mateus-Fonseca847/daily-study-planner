import type { HabitDraft } from './edit';

export interface HabitSuggestion {
  id: string;
  label: string;
  draft: HabitDraft;
}

/** As 4 sugestões do estado vazio (um clique; tudo editável depois). */
export function habitSuggestions(waterGoalMl: number): HabitSuggestion[] {
  const week = (days: number[]) => ({ kind: 'dias-da-semana' as const, days });
  return [
    {
      id: 'musculacao',
      label: 'Musculação',
      draft: {
        name: 'Musculação',
        icon: 'dumbbell',
        color: 'laranja',
        type: 'check',
        unit: '',
        source: 'manual',
        repeat: week([1, 3, 5]),
        target: null,
        time: { start: '07:00', durationMin: 60 },
        endsOn: null,
      },
    },
    {
      id: 'hidratacao',
      label: 'Hidratação',
      draft: {
        name: 'Hidratação',
        icon: 'droplets',
        color: 'azul',
        type: 'quantidade',
        unit: 'ml',
        source: 'agua',
        repeat: week([0, 1, 2, 3, 4, 5, 6]),
        target: waterGoalMl,
        time: null,
        endsOn: null,
      },
    },
    {
      id: 'luta',
      label: 'Luta',
      draft: {
        name: 'Luta',
        icon: 'swords',
        color: 'violeta',
        type: 'check',
        unit: '',
        source: 'manual',
        repeat: week([2, 4]),
        target: null,
        time: { start: '19:00', durationMin: 90 },
        endsOn: null,
      },
    },
    {
      id: 'estudo',
      label: 'Estudo',
      draft: {
        name: 'Estudo',
        icon: 'book-open',
        color: 'verde',
        type: 'quantidade',
        unit: 'min',
        source: 'foco',
        repeat: week([1, 2, 3, 4, 5]),
        target: 60,
        time: null,
        endsOn: null,
      },
    },
  ];
}
