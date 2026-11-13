import {
  dataSnapshotSchema,
  DEFAULT_HABIT_ICON,
  DEFAULT_PREFERENCES,
  defaultGoals,
  EVERY_DAY,
  goalLogSchema,
  goalSchema,
  HABIT_ICONS,
  LEGACY_HABIT_COLORS,
  LEGACY_SUBJECT_COLORS,
  PALETTE_COLORS,
  type DataSnapshot,
  type Goal,
  type HabitLog,
  type HabitIcon,
} from '@daily/shared';
import { z } from 'zod';
import { toLocalIso } from '../dates';

export const DATA_VERSION = 5;
export const APP_ID = 'daily';

export type ParseResult =
  { ok: true; snapshot: DataSnapshot; migratedFrom: number | null } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** v0 → v1: matérias ganham cor, status ganha novo vocabulário, conteúdos ganham `order`. */
const LEGACY_STATUS: Record<string, string> = {
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
      color: LEGACY_SUBJECT_COLORS[i % LEGACY_SUBJECT_COLORS.length],
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

function goalToHabit(goal: Goal, index: number, waterGoalMl: unknown): Obj {
  const icon: HabitIcon = (HABIT_ICONS as readonly string[]).includes(goal.icon)
    ? (goal.icon as HabitIcon)
    : DEFAULT_HABIT_ICON;
  const auto = goal.kind === 'auto-agua';
  return {
    id: goal.id,
    name: goal.title,
    icon,
    color: LEGACY_HABIT_COLORS[index % LEGACY_HABIT_COLORS.length] ?? 'amarelo',
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

/** Cor v3 → v4 (sem vermelho, verde, amarelo e laranja; sem repetir o azul e o roxo dos tipos). */
export const COLOR_V3_TO_V4: Record<string, (typeof PALETTE_COLORS)[number]> = {
  vermelho: 'fucsia',
  laranja: 'cinza',
  amarelo: 'ciano',
  verde: 'gelo',
  turquesa: 'ciano',
  azul: 'petroleo',
  violeta: 'lilas',
  rosa: 'rosa',
};

/**
 * Remapeia as cores preservando as escolhas que não conflitam. Percorre na ordem; se a cor
 * mapeada já foi usada por outro item e ainda há cor livre, usa a primeira livre da paleta.
 * Cores que já são da paleta nova ficam como estão (idempotente).
 */
export function remapColors<T>(items: readonly T[]): T[] {
  const palette = PALETTE_COLORS as readonly string[];
  const used = new Set<string>();
  return items.map((item) => {
    if (!isObj(item)) return item;
    const current = String(item.color);
    if (palette.includes(current)) {
      used.add(current);
      return item;
    }
    let color: string = COLOR_V3_TO_V4[current] ?? palette[0]!;
    if (used.has(color)) color = palette.find((c) => !used.has(c)) ?? color;
    used.add(color);
    return { ...item, color };
  });
}

const V3_TYPE_TO_V4: Record<string, string> = {
  entrega: 'tarefa',
  estudo: 'tarefa',
  revisao: 'tarefa',
  prova: 'prova',
  especial: 'especial',
};

/**
 * v3 → v4: tipos `tarefa | prova | especial`, status sem “em andamento”, conteúdos viram
 * subtarefas (mesmos ids e estado), blocos de estudo viram tarefas, `blockId` sai das sessões,
 * fonte `blocos` vira manual, cores remapeadas, descansos vazios e a marca do hábito de água.
 */
function migrateV3(data: unknown): unknown {
  // Sem `habits`, não é um v3 legível (ex.: metas v2 que não migraram): segue como veio, e a
  // validação final aciona o fluxo de corrupção em vez de inventar dados.
  if (!isObj(data) || !Array.isArray(data.habits)) return data;
  /** Converte só listas de objetos; qualquer outra coisa segue como veio (e a validação acusa). */
  const each = (value: unknown, convert: (item: Obj) => Obj): unknown =>
    Array.isArray(value) ? value.map((v) => (isObj(v) ? convert(v) : v)) : value;
  const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);

  const events = each(data.events, (event) => {
    const { contents, examId: _examId, ...rest } = event;
    void _examId;
    return {
      ...rest,
      type: V3_TYPE_TO_V4[String(event.type)] ?? event.type,
      status: event.status === 'em-andamento' ? 'pendente' : event.status,
      subtasks: Array.isArray(event.subtasks)
        ? event.subtasks
        : event.type === 'prova' && Array.isArray(contents)
          ? contents
          : [],
      createdAt: typeof event.createdAt === 'string' ? event.createdAt : event.start,
    };
  });

  const focusSessions = each(data.focusSessions, (session) => {
    const { blockId: _blockId, ...rest } = session;
    void _blockId;
    return { ...rest, origin: rest.origin ?? 'cronometro', note: rest.note ?? '' };
  });

  const habits = remapColors(
    data.habits.map((habit: unknown) =>
      isObj(habit) && habit.source === 'blocos'
        ? { ...habit, source: 'manual', type: 'check', unit: '' }
        : habit,
    ) as Obj[],
  );
  const subjects = Array.isArray(data.subjects)
    ? remapColors(data.subjects as Obj[])
    : data.subjects;

  const hasData =
    count(data.subjects) +
      count(data.events) +
      count(data.habits) +
      count(data.habitLogs) +
      count(data.waterLogs) +
      count(data.focusSessions) >
    0;
  return {
    ...data,
    subjects,
    events,
    habits,
    focusSessions,
    restDays: Array.isArray(data.restDays) ? data.restDays : [],
    onboarding: isObj(data.onboarding) ? data.onboarding : { waterHabitCreated: hasData },
  };
}

/**
 * v4 → v5: tarefas recorrentes. Nenhum evento muda (a recorrência é opcional); entra a coleção
 * de exceções por ocorrência. Idempotente. Sem `events`, não é um v4 legível: segue como veio e a
 * validação final aciona o fluxo de corrupção.
 */
function migrateV4(data: unknown): unknown {
  if (!isObj(data) || !Array.isArray(data.events)) return data;
  return { ...data, exceptions: Array.isArray(data.exceptions) ? data.exceptions : [] };
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
  3: (data) => migrateV3(data),
  4: (data) => migrateV4(data),
};

/**
 * Leva `data` da versão `version` até a atual (sem validar). Usada pelo envelope local e pela
 * sincronização ao baixar da nuvem dados de uma versão anterior.
 */
export function migrateData(version: number, data: unknown, now: Date = new Date()): unknown {
  let current = data;
  for (let v = version; v < DATA_VERSION; v += 1)
    current = MIGRATIONS[v]?.(current, { now }) ?? current;
  return current;
}

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

  const data = migrateData(version, parsed.data, now);

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
