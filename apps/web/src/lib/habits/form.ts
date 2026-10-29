import {
  habitSchema,
  type Habit,
  type HabitColor,
  type HabitIcon,
  type HabitSource,
  type HabitType,
  type Repeat,
} from '@daily/shared';
import { currentRule, type HabitDraft, type HabitEdit } from './edit';

export type RepeatMode = 'todo-dia' | 'dias' | 'a-cada-n';

/** Estado do formulário “Novo hábito / Editar hábito” (tudo texto, como nos campos). */
export interface HabitFormState {
  name: string;
  icon: HabitIcon;
  color: HabitColor;
  type: HabitType;
  unit: string;
  source: HabitSource;
  repeatMode: RepeatMode;
  days: number[];
  interval: string;
  target: string;
  since: string;
  endsOn: string;
  timeOn: boolean;
  timeStart: string;
  duration: string;
}

export type FormErrors = Partial<Record<keyof HabitFormState | 'time', string>>;

const WEEKDAYS_ALL = [0, 1, 2, 3, 4, 5, 6];

export function emptyForm(today: string): HabitFormState {
  return {
    name: '',
    icon: 'target',
    color: 'amarelo',
    type: 'check',
    unit: '',
    source: 'manual',
    repeatMode: 'todo-dia',
    days: WEEKDAYS_ALL,
    interval: '2',
    target: '',
    since: today,
    endsOn: '',
    timeOn: false,
    timeStart: '07:00',
    duration: '60',
  };
}

/** Fontes automáticas fixam tipo e unidade; o formulário aplica isso ao trocar de fonte. */
export function applySource(
  form: HabitFormState,
  source: HabitSource,
  waterGoalMl: number,
): HabitFormState {
  switch (source) {
    case 'agua':
      return { ...form, source, type: 'quantidade', unit: 'ml', target: String(waterGoalMl) };
    case 'foco':
      return { ...form, source, type: 'quantidade', unit: 'min', target: form.target || '60' };
    case 'blocos':
      return { ...form, source, type: 'check', unit: '', target: '' };
    case 'manual':
      return { ...form, source };
  }
}

export function formFromHabit(habit: Habit, today: string): HabitFormState {
  const rule = currentRule(habit, today);
  const repeat = rule.repeat;
  const every = repeat.kind === 'dias-da-semana' && repeat.days.length === 7;
  return {
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    type: habit.type,
    unit: habit.unit,
    source: habit.source,
    repeatMode: repeat.kind === 'a-cada-n-dias' ? 'a-cada-n' : every ? 'todo-dia' : 'dias',
    days: repeat.kind === 'dias-da-semana' ? [...repeat.days] : WEEKDAYS_ALL,
    interval: repeat.kind === 'a-cada-n-dias' ? String(repeat.interval) : '2',
    target: rule.target === null ? '' : String(rule.target),
    since: habit.rules[0]?.since ?? today,
    endsOn: habit.endsOn ?? '',
    timeOn: rule.time !== null,
    timeStart: rule.time?.start ?? '07:00',
    duration: String(rule.time?.durationMin ?? 60),
  };
}

const toNumber = (text: string): number => Number(text.trim().replace(',', '.'));

export function repeatFromForm(form: HabitFormState): Repeat {
  if (form.repeatMode === 'a-cada-n')
    return { kind: 'a-cada-n-dias', interval: toNumber(form.interval) };
  if (form.repeatMode === 'todo-dia') return { kind: 'dias-da-semana', days: WEEKDAYS_ALL };
  return { kind: 'dias-da-semana', days: form.days };
}

export type FormResult = { ok: true; draft: HabitDraft } | { ok: false; errors: FormErrors };

/** Valida o formulário (mensagens em pt-BR) e devolve o rascunho do hábito. */
export function validateForm(form: HabitFormState): FormResult {
  const errors: FormErrors = {};
  const name = form.name.trim();
  if (name === '') errors.name = 'Informe o nome do hábito.';
  else if (name.length > 60) errors.name = 'Use no máximo 60 caracteres.';

  if (form.repeatMode === 'dias' && form.days.length === 0) {
    errors.days = 'Escolha pelo menos um dia da semana.';
  }
  if (form.repeatMode === 'a-cada-n') {
    const interval = toNumber(form.interval);
    if (!Number.isInteger(interval)) errors.interval = 'Use um número inteiro de dias.';
    else if (interval < 2) errors.interval = 'O intervalo deve ser de pelo menos 2 dias.';
    else if (interval > 365) errors.interval = 'O intervalo deve ser de no máximo 365 dias.';
  }

  let target: number | null = null;
  if (form.type === 'quantidade') {
    target = toNumber(form.target);
    if (form.target.trim() === '' || !Number.isFinite(target)) errors.target = 'Informe a meta.';
    else if (target <= 0) errors.target = 'A meta deve ser maior que zero.';
  }
  if (form.unit.trim().length > 12) errors.unit = 'Use no máximo 12 caracteres.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.since)) errors.since = 'Informe a data de início.';
  if (form.endsOn !== '' && form.since !== '' && form.endsOn < form.since) {
    errors.endsOn = 'O fim não pode ser antes do início.';
  }

  let time: HabitDraft['time'] = null;
  if (form.timeOn) {
    const durationMin = toNumber(form.duration);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.timeStart))
      errors.time = 'Informe um horário válido.';
    else if (!Number.isInteger(durationMin) || durationMin < 1) {
      errors.time = 'A duração deve ser de pelo menos 1 minuto.';
    } else if (durationMin > 1440) errors.time = 'A duração deve ser de no máximo 24 horas.';
    else time = { start: form.timeStart, durationMin };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const draft: HabitDraft = {
    name,
    icon: form.icon,
    color: form.color,
    type: form.type,
    unit: form.type === 'check' ? '' : form.unit.trim(),
    source: form.source,
    repeat: repeatFromForm(form),
    target,
    time,
    since: form.since,
    endsOn: form.endsOn === '' ? null : form.endsOn,
  };

  // Última barreira: o schema compartilhado (regras entre campos, ex.: fonte × tipo).
  const check = habitSchema.safeParse({
    id: 'x',
    name: draft.name,
    icon: draft.icon,
    color: draft.color,
    type: draft.type,
    unit: draft.unit,
    source: draft.source,
    rules: [{ since: draft.since ?? form.since, repeat: draft.repeat, target, time }],
    createdAt: `${form.since}T00:00:00`,
    endsOn: draft.endsOn,
    order: 0,
  });
  if (!check.success) {
    const message = check.error.issues[0]?.message ?? 'Dados inválidos.';
    return { ok: false, errors: { name: errors.name ?? message } };
  }
  return { ok: true, draft };
}

/** O que mudou na edição em relação ao hábito (só repetição, meta e horário viram nova regra). */
export function editFromForm(
  habit: Habit,
  draft: HabitDraft,
  today: string,
): { edit: HabitEdit; changesRule: boolean } {
  const rule = currentRule(habit, today);
  const edit: HabitEdit = {
    name: draft.name,
    icon: draft.icon,
    color: draft.color,
    unit: draft.unit,
    endsOn: draft.endsOn,
    repeat: draft.repeat,
    target: draft.target,
    time: draft.time,
  };
  const changesRule =
    JSON.stringify([rule.repeat, rule.target, rule.time]) !==
    JSON.stringify([draft.repeat, habit.type === 'check' ? null : draft.target, draft.time]);
  return { edit, changesRule };
}
