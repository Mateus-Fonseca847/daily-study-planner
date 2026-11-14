import { useId, useState, type FormEvent } from 'react';
import { Check, Palette, Repeat, Shapes, Target } from 'lucide-react';
import { HABIT_COLORS, HABIT_ICONS, type Habit, type HabitSource } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { MetaRow, MoreOptionsToggle } from '../../components/ui/MetaRow';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/cn';
import { useData } from '../../lib/data/app-store';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import {
  applySource,
  editFromForm,
  emptyForm,
  formFromHabit,
  validateForm,
  type FormErrors,
  type HabitFormState,
  type RepeatMode,
} from '../../lib/habits/form';
import { WEEKDAY_LABELS } from '../../lib/habits/repeat';
import {
  HABIT_COLOR_CLASS,
  HABIT_COLOR_LABEL,
  HABIT_ICON_COMPONENT,
  HABIT_ICON_LABEL,
} from './habit-icons';

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual (eu registro)' },
  { value: 'agua', label: 'Água do dia' },
  { value: 'foco', label: 'Tempo de foco' },
] as const;

const TYPE_OPTIONS = [
  { value: 'check', label: 'Check (feito ou não)' },
  { value: 'quantidade', label: 'Quantidade (meta numérica)' },
] as const;

const REPEAT_OPTIONS = [
  { value: 'todo-dia', label: 'Todo dia' },
  { value: 'dias', label: 'Dias da semana' },
  { value: 'a-cada-n', label: 'A cada N dias' },
] as const;

const INPUT =
  'h-field min-w-0 rounded-md bg-hover px-2 text-base text-fg aria-invalid:outline-1 aria-invalid:outline-danger';

const RULE_CHANGE_NOTICE = 'A mudança vale a partir de hoje; o histórico não muda.';

interface HabitFormModalProps {
  /** Hábito em edição; ausente = novo. */
  habit?: Habit | undefined;
  onClose: () => void;
}

/**
 * Painel “Novo hábito / Editar hábito”, no mesmo padrão do painel de tarefa: nome grande, linhas
 * com ícone e rótulo para o essencial e o resto em “Mais opções”. Validação em pt-BR e aviso de
 * nova regra.
 */
export function HabitFormModal({ habit, onClose }: HabitFormModalProps) {
  const createHabit = useData((s) => s.createHabit);
  const updateHabit = useData((s) => s.updateHabit);
  const waterGoalMl = useData((s) => s.preferences.waterGoalMl);
  const now = appNow();
  const today = dayKey(now);

  const [form, setForm] = useState<HabitFormState>(() =>
    habit ? formFromHabit(habit, today) : emptyForm(today),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const editing = habit !== undefined;
  const ids = {
    name: useId(),
    nameError: useId(),
    repeat: useId(),
    target: useId(),
    more: useId(),
  };
  const set = <K extends keyof HabitFormState>(key: K, value: HabitFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const result = validateForm(form);
  const changesRule =
    editing && result.ok ? editFromForm(habit, result.draft, today).changesRule : false;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const checked = validateForm(form);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    if (habit) updateHabit(habit.id, editFromForm(habit, checked.draft, today).edit, now);
    else createHabit(checked.draft, now);
    onClose();
  };

  const toggleDay = (day: number) =>
    set('days', form.days.includes(day) ? form.days.filter((d) => d !== day) : [...form.days, day]);
  const auto = form.source !== 'manual';

  // “Mais opções” abre sozinho na edição de um hábito que já usa campos avançados, ou com erro neles.
  const advancedError = Boolean(errors.since || errors.endsOn || errors.time || errors.unit);
  const [moreOpen, setMoreOpen] = useState(
    () => editing && (form.source !== 'manual' || form.timeOn || form.endsOn !== ''),
  );
  const showMore = moreOpen || advancedError;

  return (
    <Modal
      title={editing ? 'Editar hábito' : 'Novo hábito'}
      onClose={onClose}
      variant="side"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="habit-form">
            {editing ? 'Salvar' : 'Criar hábito'}
          </Button>
        </>
      }
    >
      <form id="habit-form" onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
        <div>
          <label htmlFor={ids.name} className="sr-only">
            Nome
          </label>
          <input
            id={ids.name}
            data-autofocus
            placeholder="Nome do hábito"
            value={form.name}
            maxLength={80}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? ids.nameError : undefined}
            onChange={(e) => set('name', e.target.value)}
            className="w-full rounded-md bg-transparent px-1 py-1 text-display font-semibold tracking-tight text-fg placeholder:text-subtle"
          />
          {errors.name && (
            <p id={ids.nameError} className="text-sm text-danger">
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <MetaRow icon={Shapes} label="Ícone">
            <div role="radiogroup" aria-label="Ícone" className="flex flex-wrap gap-2">
              {HABIT_ICONS.map((icon) => {
                const Icon = HABIT_ICON_COMPONENT[icon];
                return (
                  <button
                    key={icon}
                    type="button"
                    role="radio"
                    aria-checked={form.icon === icon}
                    aria-label={HABIT_ICON_LABEL[icon]}
                    title={HABIT_ICON_LABEL[icon]}
                    onClick={() => set('icon', icon)}
                    className={cn(
                      'inline-flex size-control items-center justify-center rounded-full coarse:size-touch',
                      form.icon === icon ? 'bg-accent text-accent-fg' : 'bg-surface text-soft',
                    )}
                  >
                    <Icon aria-hidden strokeWidth={1.5} className="size-icon" />
                  </button>
                );
              })}
            </div>
          </MetaRow>

          <MetaRow icon={Palette} label="Cor">
            <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={form.color === color}
                  aria-label={HABIT_COLOR_LABEL[color]}
                  title={HABIT_COLOR_LABEL[color]}
                  onClick={() => set('color', color)}
                  className={cn(
                    'habit-bg inline-flex size-control items-center justify-center rounded-full text-on-habit coarse:size-touch',
                    HABIT_COLOR_CLASS[color],
                  )}
                >
                  {form.color === color && (
                    <Check aria-hidden strokeWidth={3} className="size-icon-sm" />
                  )}
                </button>
              ))}
            </div>
          </MetaRow>

          <MetaRow icon={Repeat} label="Repetição" htmlFor={ids.repeat}>
            <select
              id={ids.repeat}
              value={form.repeatMode}
              onChange={(e) => set('repeatMode', e.target.value as RepeatMode)}
              className={INPUT}
            >
              {REPEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {form.repeatMode === 'dias' && (
              <div className="flex w-full flex-col gap-1">
                <div role="group" aria-label="Dias da semana" className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={form.days.includes(day)}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'h-control rounded-full px-3 text-sm font-medium uppercase coarse:h-touch',
                        form.days.includes(day)
                          ? 'bg-accent text-accent-fg'
                          : 'bg-surface text-soft',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors.days && (
                  <p role="alert" className="text-sm text-danger">
                    {errors.days}
                  </p>
                )}
              </div>
            )}
            {form.repeatMode === 'a-cada-n' && (
              <TextField
                label="Intervalo (dias)"
                inputMode="numeric"
                value={form.interval}
                error={errors.interval}
                onChange={(e) => set('interval', e.target.value)}
              />
            )}
          </MetaRow>

          {form.type === 'quantidade' && (
            <MetaRow icon={Target} label="Meta do dia" htmlFor={ids.target}>
              <input
                id={ids.target}
                inputMode="decimal"
                value={form.target}
                aria-invalid={errors.target ? true : undefined}
                onChange={(e) => set('target', e.target.value)}
                className={cn(INPUT, 'w-panel-label')}
              />
              <span className="text-base text-muted">{form.unit}</span>
              {errors.target && <p className="w-full text-sm text-danger">{errors.target}</p>}
            </MetaRow>
          )}
        </div>

        <MoreOptionsToggle
          open={showMore}
          controls={ids.more}
          onToggle={() => setMoreOpen((open) => !open)}
        />
        {showMore && (
          <div id={ids.more} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 phone:grid-cols-1">
              <SelectField
                label="Fonte"
                value={form.source}
                disabled={editing}
                options={SOURCE_OPTIONS}
                onChange={(e) =>
                  setForm(applySource(form, e.target.value as HabitSource, waterGoalMl))
                }
              />
              <SelectField
                label="Tipo"
                value={form.type}
                disabled={editing || auto}
                options={TYPE_OPTIONS}
                onChange={(e) => set('type', e.target.value as HabitFormState['type'])}
              />
            </div>
            {form.type === 'quantidade' && (
              <TextField
                label="Unidade"
                value={form.unit}
                disabled={auto}
                placeholder="ml, min, vezes"
                error={errors.unit}
                onChange={(e) => set('unit', e.target.value)}
              />
            )}
            <div className="grid grid-cols-2 gap-4 phone:grid-cols-1">
              <TextField
                label="Início"
                type="date"
                value={form.since}
                disabled={editing}
                error={errors.since}
                onChange={(e) => set('since', e.target.value)}
              />
              <TextField
                label="Fim (opcional)"
                type="date"
                value={form.endsOn}
                error={errors.endsOn}
                onChange={(e) => set('endsOn', e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-base coarse:min-h-touch">
              <input
                type="checkbox"
                checked={form.timeOn}
                onChange={(e) => set('timeOn', e.target.checked)}
                className="size-checkbox accent-accent-ink"
              />
              Definir horário
            </label>
            {form.timeOn && (
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Início do horário"
                  type="time"
                  value={form.timeStart}
                  error={errors.time}
                  onChange={(e) => set('timeStart', e.target.value)}
                />
                <TextField
                  label="Duração (min)"
                  inputMode="numeric"
                  value={form.duration}
                  onChange={(e) => set('duration', e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {changesRule && (
          <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm text-fg">
            {RULE_CHANGE_NOTICE}
          </p>
        )}
      </form>
    </Modal>
  );
}
