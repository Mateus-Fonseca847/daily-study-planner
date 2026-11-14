import type {
  FocusSession,
  Habit,
  HabitLog,
  OccurrenceException,
  Preferences,
  RestDay,
  StudyEvent,
  WaterLog,
} from '@daily/shared';
import { dayOf, shiftDay } from '../dates';
import { buildHabitContext, type HabitContext } from '../habits/context';
import { dayState, firstDay, isDone, targetOn } from '../habits/engine';
import { expandEvents } from '../recurrence/expand';

/** O que o motor de medalhas lê do snapshot (estrutural: não depende do formato salvo). */
export interface AchievementSources {
  events: readonly (StudyEvent & { preparedAt?: string | undefined })[];
  exceptions: readonly OccurrenceException[];
  focusSessions: readonly FocusSession[];
  habits: readonly Habit[];
  habitLogs: readonly HabitLog[];
  waterLogs: readonly WaterLog[];
  restDays: readonly RestDay[];
  preferences: Pick<Preferences, 'waterGoalMl'>;
  /** Quando a concessão retroativa rodou (`null` = ainda não): o limite do “histórico”. */
  seededAt: string | null;
}

/**
 * Fatos datados, um passe só. Cada lista está em ordem crescente de data (ISO local) e cada item
 * é uma unidade da medalha (uma tarefa, um dia, uma sessão…); a data em que a meta N foi
 * alcançada é a do N-ésimo item. Datas de “dia” usam meio-dia, e nada passa de `now`.
 */
export interface Facts {
  now: string;
  today: string;
  /** Tarefas e Especiais concluídos (avulsos e ocorrências), pelo dia do prazo. */
  tasksDone: string[];
  /** Ocorrências de séries concluídas. */
  occurrencesDone: string[];
  /** Subtarefas e conteúdos marcados (avulsos e ocorrências), pelo dia da tarefa. */
  subtasksDone: string[];
  /** Dias (até hoje) com ≥ 1 tarefa e todas concluídas (canceladas e puladas não entram). */
  cleanDays: string[];
  /** Provas preparadas: 100 % dos conteúdos antes do início (ou do histórico, ver `prepared.ts`). */
  preparedExams: string[];
  /** Sessões de foco (cronômetro e registro manual): início e segundos reais, em ordem. */
  focus: { at: string; sec: number }[];
  /** Sessões do cronômetro concluídas até o fim. */
  completeSessions: string[];
  /** Índice k − 1: o primeiro dia em que algum hábito chegou a uma sequência de k dias. */
  streakReach: string[];
  /** Dias com água ≥ meta do dia. */
  waterDays: string[];
  /** Por hábito ativo, o dia em que completou 7 dias cumpridos. */
  varietyDates: string[];
  /** Criação das séries (Tarefa e Especial recorrentes). */
  recurringCreated: string[];
  /** Criação das provas. */
  examsCreated: string[];
}

/** Tarefas para as medalhas de tarefas: Tarefa e Especial (a Prova tem medalha própria). */
const isTask = (e: Pick<StudyEvent, 'type'>) => e.type === 'tarefa' || e.type === 'especial';
const sorted = (items: string[]) => items.sort();
const atNoon = (day: string) => `${day}T12:00:00`;

export function buildFacts(sources: AchievementSources, now: string): Facts {
  const today = dayOf(now);
  const cap = (iso: string) => (iso > now ? now : iso);
  const dayIso = (day: string) => cap(atNoon(day));
  const byId = new Map(sources.events.map((e) => [e.id, e]));

  // Tarefas, ocorrências e subtarefas: os avulsos pelo estado; as séries pelas exceções.
  const tasksDone: string[] = [];
  const occurrencesDone: string[] = [];
  const subtasksDone: string[] = [];
  for (const e of sources.events) {
    if (e.recurrence) continue;
    const when = dayIso(dayOf(e.end));
    if (isTask(e) && e.status === 'concluido') tasksDone.push(when);
    for (const s of e.subtasks) if (s.done) subtasksDone.push(when);
  }
  for (const ex of sources.exceptions) {
    const series = byId.get(ex.eventId);
    if (!series?.recurrence || ex.kind === 'pulada') continue;
    const when = dayIso(ex.originalDate);
    if (isTask(series) && ex.status === 'concluido') {
      tasksDone.push(when);
      occurrencesDone.push(when);
    }
    const template = new Set(series.subtasks.map((s) => s.id));
    for (const id of ex.doneSubtasks ?? []) if (template.has(id)) subtasksDone.push(when);
  }

  // Dia limpo: as ocorrências pendentes também contam, então aqui as séries são expandidas (até hoje).
  const tasks = sources.events.filter(isTask);
  const first = tasks.reduce<string | null>((min, e) => {
    const d = dayOf(e.start);
    return min === null || d < min ? d : min;
  }, null);
  const perDay = new Map<string, { total: number; done: number }>();
  if (first !== null && first <= today) {
    for (const view of expandEvents(tasks, sources.exceptions, { from: first, to: today }, today)) {
      const day = dayOf(view.end);
      if (day > today || view.status === 'cancelado') continue;
      const entry = perDay.get(day) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (view.status === 'concluido') entry.done += 1;
      perDay.set(day, entry);
    }
  }
  const cleanDays = [...perDay]
    .filter(([, v]) => v.total > 0 && v.done === v.total)
    .map(([day]) => atNoon(day));

  // Provas preparadas.
  const cutoff = sources.seededAt ?? now;
  const preparedExams: string[] = [];
  for (const e of sources.events) {
    if (e.type !== 'prova') continue;
    if (e.preparedAt) {
      preparedExams.push(cap(e.preparedAt));
      continue;
    }
    const allDone = e.subtasks.length > 0 && e.subtasks.every((s) => s.done);
    // Histórico (antes da concessão retroativa): sem como saber quando os conteúdos foram
    // marcados, conta a prova que já passou com 100 %, datada no momento da avaliação.
    if (allDone && e.start < cutoff && e.start <= now) preparedExams.push(now);
  }

  // Foco.
  const sessions = [...sources.focusSessions].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  const focus = sessions
    .filter((s) => s.actualSec > 0)
    .map((s) => ({ at: cap(s.startedAt), sec: s.actualSec }));
  const completeSessions = sessions
    .filter((s) => s.status === 'concluida' && s.origin === 'cronometro')
    .map((s) => cap(s.startedAt));

  // Hábitos.
  const ctx = buildHabitContext(
    {
      habitLogs: sources.habitLogs,
      waterLogs: sources.waterLogs,
      focusSessions: sources.focusSessions,
      restDays: sources.restDays,
    },
    today,
  );
  const streakReach: string[] = [];
  const varietyDates: string[] = [];
  for (const habit of sources.habits) {
    const reach = streakDays(habit, ctx);
    reach.forEach((day, i) => {
      if (streakReach[i] === undefined || day < streakReach[i]!) streakReach[i] = day;
    });
    if (habit.archivedAt === null) {
      const seventh = nthDoneDay(habit, ctx, 7);
      if (seventh) varietyDates.push(atNoon(seventh));
    }
  }

  // Água: a meta do dia vem do hábito “Água” (regra versionada); sem ele, das preferências.
  const water = sources.habits.find((h) => h.source === 'agua');
  const waterByDay = new Map<string, number>();
  for (const log of sources.waterLogs) {
    if (log.date > today) continue;
    waterByDay.set(log.date, (waterByDay.get(log.date) ?? 0) + log.ml);
  }
  const waterDays = [...waterByDay]
    .filter(([day, ml]) => {
      const goal =
        water && day >= firstDay(water) ? targetOn(water, day) : sources.preferences.waterGoalMl;
      return goal > 0 && ml >= goal;
    })
    .map(([day]) => atNoon(day));

  return {
    now,
    today,
    tasksDone: sorted(tasksDone),
    occurrencesDone: sorted(occurrencesDone),
    subtasksDone: sorted(subtasksDone),
    cleanDays: sorted(cleanDays),
    preparedExams: sorted(preparedExams),
    focus,
    completeSessions,
    streakReach: streakReach.map(atNoon),
    waterDays: sorted(waterDays),
    varietyDates: sorted(varietyDates),
    recurringCreated: sorted(
      sources.events.filter((e) => e.recurrence && isTask(e)).map((e) => cap(e.createdAt)),
    ),
    examsCreated: sorted(
      sources.events.filter((e) => e.type === 'prova').map((e) => cap(e.createdAt)),
    ),
  };
}

/**
 * Para cada tamanho de sequência k (1, 2, …), o primeiro dia em que o hábito chegou a k dias
 * seguidos. Mesma regra de `streaks()`: dia não agendado e descanso não quebram nem somam; hoje
 * pendente não quebra.
 */
function streakDays(habit: Habit, ctx: HabitContext): string[] {
  const reach: string[] = [];
  let run = 0;
  for (let day = firstDay(habit); day <= ctx.today; day = shiftDay(day, 1)) {
    const state = dayState(habit, day, ctx);
    if (state === 'feito') {
      run += 1;
      if (reach.length < run) reach.push(day);
    } else if (state === 'parcial' || state === 'perdido') {
      run = 0;
    }
  }
  return reach;
}

/** O dia em que o hábito completou `n` dias cumpridos (até hoje), ou `null`. */
function nthDoneDay(habit: Habit, ctx: HabitContext, n: number): string | null {
  let count = 0;
  for (let day = firstDay(habit); day <= ctx.today; day = shiftDay(day, 1)) {
    if (isDone(habit, day, ctx) && (count += 1) === n) return day;
  }
  return null;
}
