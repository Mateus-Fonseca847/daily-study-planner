import {
  dataSnapshotSchema,
  DEFAULT_HABIT_ICON,
  DEFAULT_PREFERENCES,
  defaultGoals,
  EVERY_DAY,
  goalLogSchema,
  goalSchema,
  HABIT_COLORS,
  HABIT_ICONS,
  SUBJECT_COLORS,
  type DataSnapshot,
  type EventStatus,
  type Goal,
  type Habit,
  type HabitLog,
  type HabitIcon,
} from '@daily/shared';
import { z } from 'zod';
import { toLocalIso } from '../dates';

export const DATA_VERSION = 3;
export const APP_ID = 'daily';

export type ParseResult =
  { ok: true; snapshot: DataSnapshot; migratedFrom: number | null } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** v0 → v1: matérias ganham cor, status ganha novo vocabulário, conteúdos ganham `order`. */
const LEGACY_STATUS: Record<string, EventStatus> = {
  agendada: 'pendente',
  concluida: 'concluido',
  'em-andamento': 'em-andamento',
};

function migrateV0(data: unknown): unknown {
  if (!isObj(data)) return data;
  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const events = Array.isArray(data.events) ? data.events : [];
  return {
    subjects: subjects.map((s, i) => ({
      ...(isObj(s) ? s : {}),
      color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    })),
    events: events.map((e) => {
      const event = isObj(e) ? e : {};
      const contents = Array.isArray(event.contents) ? event.contents : [];
      return {
        ...event,
        status: LEGACY_STATUS[String(event.status)] ?? event.status,
        subjectId: event.subjectId ?? null,
        notes: event.notes ?? '',
        ...(event.type === 'prova'
          ? { contents: contents.map((c, order) => ({ ...(isObj(c) ? c : {}), order })) }
          : {}),
        ...(event.type === 'estudo' ? { examId: event.examId ?? null } : {}),
      };
    }),
  };
}

/** v1 → v2: preferências, metas padrão e coleções novas (água, registros de meta, sessões de foco). */
function migrateV1(data: unknown, ctx: MigrationContext): unknown {
  if (!isObj(data)) return data;
  return {
    ...data,
    preferences: { ...DEFAULT_PREFERENCES },
    goals: defaultGoals(toLocalIso(ctx.now)),
    goalLogs: [],
    waterLogs: [],
    focusSessions: [],
  };
}

/**
 * v2 → v3: as metas viram hábitos (mesmo id, para os registros continuarem apontando) e os
 * registros de meta viram registros de hábito (1 = concluída, 0 = não). Idempotente: só roda
 * sobre dados v2, e o resultado já é v3.
 */
function migrateV2(data: unknown): unknown {
  if (!isObj(data)) return data;
  const { goals, goalLogs, ...rest } = data;
  const parsedGoals = z.array(goalSchema).safeParse(goals ?? []);
  const parsedLogs = z.array(goalLogSchema).safeParse(goalLogs ?? []);
  // Dado ilegível segue adiante como veio: a validação final acusa e o fluxo de corrupção assume.
  if (!parsedGoals.success || !parsedLogs.success) return data;

  const waterGoalMl = isObj(rest.preferences) ? rest.preferences.waterGoalMl : undefined;
  const habits = parsedGoals.data.map((goal, i) => goalToHabit(goal, i, waterGoalMl));
  const habitLogs: HabitLog[] = parsedLogs.data.map((log) => ({
    id: log.id,
    habitId: log.goalId,
    date: log.date,
    value: log.done ? 1 : 0,
    updatedAt: `${log.date}T00:00:00`,
  }));
  return { ...rest, habits, habitLogs };
}

function goalToHabit(goal: Goal, index: number, waterGoalMl: unknown): Habit {
  const icon: HabitIcon = (HABIT_ICONS as readonly string[]).includes(goal.icon)
    ? (goal.icon as HabitIcon)
    : DEFAULT_HABIT_ICON;
  const auto = goal.kind === 'auto-agua';
  return {
    id: goal.id,
    name: goal.title,
    icon,
    color: HABIT_COLORS[index % HABIT_COLORS.length] ?? 'amarelo',
    type: auto ? 'quantidade' : 'check',
    unit: auto ? 'ml' : '',
    source: goal.kind === 'auto-agua' ? 'agua' : goal.kind === 'auto-estudo' ? 'blocos' : 'manual',
    rules: [
      {
        since: goal.createdAt.slice(0, 10),
        repeat: EVERY_DAY,
        target: auto ? (typeof waterGoalMl === 'number' ? waterGoalMl : 2000) : null,
        time: null,
      },
    ],
    createdAt: goal.createdAt,
    archivedAt: goal.archivedAt,
    endsOn: null,
    order: goal.order,
  };
}

interface MigrationContext {
  /** Relógio injetável: data de criação das metas padrão. */
  now: Date;
}

/** Migrações indexadas pela versão de origem (n → n + 1). */
const MIGRATIONS: Record<number, (data: unknown, ctx: MigrationContext) => unknown> = {
  0: (data) => migrateV0(data),
  1: migrateV1,
  2: migrateV2,
};

function describeIssue(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const issue = error.issues[0];
  if (!issue) return 'Dados inválidos.';
  const path = issue.path.map(String).join('.');
  return path ? `${issue.message} (${path})` : issue.message;
}

/** Lê e valida um JSON salvo/exportado, migrando versões antigas. Nunca lança. */
export function parseEnvelope(raw: string, now: Date = new Date()): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  if (!isObj(parsed) || typeof parsed.version !== 'number' || !('data' in parsed)) {
    return { ok: false, error: 'O arquivo não parece ser um backup do Daily.' };
  }
  if (parsed.app !== undefined && parsed.app !== APP_ID) {
    return { ok: false, error: 'O arquivo foi criado por outro aplicativo.' };
  }
  const version = parsed.version;
  if (!Number.isInteger(version) || version < 0 || version > DATA_VERSION) {
    return { ok: false, error: `Versão de dados não suportada (${String(version)}).` };
  }

  let data = parsed.data;
  for (let v = version; v < DATA_VERSION; v += 1) data = MIGRATIONS[v]?.(data, { now }) ?? data;

  const result = dataSnapshotSchema.safeParse(data);
  if (!result.success) return { ok: false, error: describeIssue(result.error) };
  return { ok: true, snapshot: result.data, migratedFrom: version < DATA_VERSION ? version : null };
}

export function serializeEnvelope(snapshot: DataSnapshot, now: Date): string {
  return JSON.stringify(
    { app: APP_ID, version: DATA_VERSION, savedAt: now.toISOString(), data: snapshot },
    null,
    2,
  );
}
