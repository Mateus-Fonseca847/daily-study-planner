import type { Facts } from './facts';

/** Categorias, na ordem da tela. */
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'comeco', label: 'Começo' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'provas', label: 'Provas' },
  { id: 'recorrencia', label: 'Recorrência' },
  { id: 'subtarefas', label: 'Subtarefas' },
  { id: 'foco', label: 'Foco' },
  { id: 'habitos', label: 'Hábitos' },
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]['id'];

/** Ícones (nomes do lucide-react; o mapa para os componentes fica na interface). */
export type AchievementIcon =
  | 'footprints'
  | 'calendar-sync'
  | 'calendar-check'
  | 'list-checks'
  | 'sparkles'
  | 'graduation-cap'
  | 'repeat'
  | 'list-todo'
  | 'hourglass'
  | 'timer'
  | 'flame'
  | 'droplets'
  | 'shapes';

/** Quanto já foi feito e quando cada meta foi alcançada (ISO local) — `null` se ainda não. */
export interface Measure {
  value: number;
  reachedOn(goal: number): string | null;
}

export interface AchievementDef {
  /** Estável: nunca muda (vai para o snapshot e para o perfil público). */
  id: string;
  category: AchievementCategory;
  title: string;
  /** O critério, numa frase. */
  description: string;
  icon: AchievementIcon;
  /** Metas de cada nível (bronze, prata, ouro), crescentes; uma só = nível único. */
  levels: readonly number[];
  /** Unidade no progresso (“17 de 25 tarefas”). */
  unit: { one: string; many: string };
  measure(facts: Facts): Measure;
}

/** Contagem de itens datados: a meta N foi alcançada na data do N-ésimo. */
const count = (dates: readonly string[]): Measure => ({
  value: dates.length,
  reachedOn: (goal) => dates[goal - 1] ?? null,
});

/** Horas de foco acumuladas: a meta é alcançada na sessão que passa do total. */
function focusHours(facts: Facts): Measure {
  const total = facts.focus.reduce((sum, s) => sum + s.sec, 0);
  return {
    value: Math.floor(total / 3600),
    reachedOn: (goal) => {
      let acc = 0;
      for (const s of facts.focus) {
        acc += s.sec;
        if (acc >= goal * 3600) return s.at;
      }
      return null;
    },
  };
}

/** O catálogo (dados, não código espalhado). A ordem é a da tela dentro de cada categoria. */
export const CATALOG: readonly AchievementDef[] = [
  {
    id: 'primeiro-passo',
    category: 'comeco',
    title: 'Primeiro passo',
    description: 'Conclua a sua primeira tarefa.',
    icon: 'footprints',
    levels: [1],
    unit: { one: 'tarefa', many: 'tarefas' },
    measure: (f) => count(f.tasksDone),
  },
  {
    id: 'rotina',
    category: 'comeco',
    title: 'Rotina',
    description: 'Crie a sua primeira tarefa recorrente.',
    icon: 'calendar-sync',
    levels: [1],
    unit: { one: 'tarefa recorrente', many: 'tarefas recorrentes' },
    measure: (f) => count(f.recurringCreated),
  },
  {
    id: 'planejado',
    category: 'comeco',
    title: 'Planejado',
    description: 'Cadastre a sua primeira prova.',
    icon: 'calendar-check',
    levels: [1],
    unit: { one: 'prova', many: 'provas' },
    measure: (f) => count(f.examsCreated),
  },
  {
    id: 'maos-a-obra',
    category: 'tarefas',
    title: 'Mãos à obra',
    description: 'Conclua tarefas (Tarefa ou Especial; canceladas não contam).',
    icon: 'list-checks',
    levels: [10, 50, 200],
    unit: { one: 'tarefa', many: 'tarefas' },
    measure: (f) => count(f.tasksDone),
  },
  {
    id: 'dia-limpo',
    category: 'tarefas',
    title: 'Dia limpo',
    description: 'Feche dias com todas as tarefas concluídas (só contam dias com alguma tarefa).',
    icon: 'sparkles',
    levels: [1, 7, 30],
    unit: { one: 'dia', many: 'dias' },
    measure: (f) => count(f.cleanDays),
  },
  {
    id: 'preparado',
    category: 'provas',
    title: 'Preparado',
    description: 'Chegue à prova com todos os conteúdos concluídos antes do início.',
    icon: 'graduation-cap',
    levels: [1, 5, 15],
    unit: { one: 'prova', many: 'provas' },
    measure: (f) => count(f.preparedExams),
  },
  {
    id: 'ritmo',
    category: 'recorrencia',
    title: 'Ritmo',
    description: 'Conclua ocorrências de tarefas recorrentes.',
    icon: 'repeat',
    levels: [10, 50, 200],
    unit: { one: 'ocorrência', many: 'ocorrências' },
    measure: (f) => count(f.occurrencesDone),
  },
  {
    id: 'passo-a-passo',
    category: 'subtarefas',
    title: 'Passo a passo',
    description: 'Conclua subtarefas e conteúdos.',
    icon: 'list-todo',
    levels: [25, 100, 500],
    unit: { one: 'subtarefa', many: 'subtarefas' },
    measure: (f) => count(f.subtasksDone),
  },
  {
    id: 'concentrado',
    category: 'foco',
    title: 'Concentrado',
    description: 'Acumule horas de foco (cronômetro e tempo registrado).',
    icon: 'hourglass',
    levels: [5, 25, 100],
    unit: { one: 'hora', many: 'horas' },
    measure: focusHours,
  },
  {
    id: 'sessao-completa',
    category: 'foco',
    title: 'Sessão completa',
    description: 'Leve sessões do Modo Foco até o fim.',
    icon: 'timer',
    levels: [1, 10, 50],
    unit: { one: 'sessão', many: 'sessões' },
    measure: (f) => count(f.completeSessions),
  },
  {
    id: 'constancia',
    category: 'habitos',
    title: 'Constância',
    description: 'Mantenha uma sequência em qualquer hábito (dias de descanso não quebram).',
    icon: 'flame',
    levels: [7, 30, 100],
    unit: { one: 'dia seguido', many: 'dias seguidos' },
    measure: (f) => count(f.streakReach),
  },
  {
    id: 'hidratado',
    category: 'habitos',
    title: 'Hidratado',
    description: 'Bata a meta de água do dia.',
    icon: 'droplets',
    levels: [7, 30, 100],
    unit: { one: 'dia', many: 'dias' },
    measure: (f) => count(f.waterDays),
  },
  {
    id: 'variedade',
    category: 'habitos',
    title: 'Variedade',
    description: 'Tenha hábitos ativos com pelo menos 7 dias cumpridos.',
    icon: 'shapes',
    levels: [3, 5, 8],
    unit: { one: 'hábito', many: 'hábitos' },
    measure: (f) => count(f.varietyDates),
  },
];

export const CATALOG_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(
  CATALOG.map((def) => [def.id, def]),
);

export const LEVEL_NAMES = ['Bronze', 'Prata', 'Ouro'] as const;

/** Nome do nível (medalha de nível único não tem nível nomeado). */
export const levelName = (def: AchievementDef, level: number): string | null =>
  def.levels.length === 1 ? null : (LEVEL_NAMES[level - 1] ?? null);
