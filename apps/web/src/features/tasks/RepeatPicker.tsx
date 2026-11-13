import { useId, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { MAX_RECURRENCE_COUNT, MAX_RECURRENCE_INTERVAL, type Recurrence } from '@daily/shared';
import { cn } from '../../lib/cn';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { describeRule, WEEKDAY_CHIPS, WEEKDAY_NAMES } from '../../lib/recurrence/describe';
import { nextOccurrences, weekdayOf } from '../../lib/recurrence/engine';
import {
  formatPreviewDate,
  presetOf,
  presetsFor,
  validateRule,
  type PresetKey,
} from '../../lib/recurrence/presets';

/** Quantas próximas ocorrências a prévia mostra. */
export const PREVIEW_COUNT = 5;

const FREQ_UNITS = [
  { value: 'diaria', label: 'dias' },
  { value: 'semanal', label: 'semanas' },
  { value: 'mensal', label: 'meses' },
  { value: 'anual', label: 'anos' },
] as const;

interface CustomDraft {
  freq: Recurrence['freq'];
  interval: string;
  weekdays: number[];
  monthDay: string;
  lastDay: boolean;
  end: 'nunca' | 'em' | 'apos';
  endDate: string;
  count: string;
}

function draftFrom(rule: Recurrence | null, anchor: string): CustomDraft {
  return {
    freq: rule?.freq ?? 'semanal',
    interval: String(rule?.interval ?? 1),
    weekdays: rule?.weekdays ?? [weekdayOf(anchor)],
    monthDay:
      typeof rule?.monthDay === 'number'
        ? String(rule.monthDay)
        : String(Number(anchor.slice(8, 10))),
    lastDay: rule?.monthDay === 'ultimo',
    end: rule?.end.kind ?? 'nunca',
    endDate: rule?.end.kind === 'em' ? rule.end.date : '',
    count: rule?.end.kind === 'apos' ? String(rule.end.count) : '10',
  };
}

/** Converte o rascunho em regra (pode ser inválida: a validação diz o porquê). */
function ruleFrom(d: CustomDraft): unknown {
  const end =
    d.end === 'em'
      ? { kind: 'em', date: d.endDate }
      : d.end === 'apos'
        ? { kind: 'apos', count: Number(d.count) }
        : { kind: 'nunca' };
  return {
    freq: d.freq,
    interval: Number(d.interval),
    ...(d.freq === 'semanal' ? { weekdays: d.weekdays } : {}),
    ...(d.freq === 'mensal' ? { monthDay: d.lastDay ? 'ultimo' : Number(d.monthDay) } : {}),
    end,
  };
}

const CHIP =
  'inline-flex h-control-sm items-center rounded-full px-3 text-sm font-medium transition-colors coarse:h-touch';
const INPUT =
  'h-field min-w-0 rounded-md bg-hover px-2 text-base text-fg aria-invalid:outline-1 aria-invalid:outline-danger';

interface RepeatPickerProps {
  /** Regra atual (`null` = não repete). */
  value: Recurrence | null;
  /** Data inicial (`aaaa-mm-dd`): base dos atalhos, da prévia e da validação. */
  anchor: string;
  /** Regra nova e o erro (em pt-BR), se a escolha personalizada ainda for inválida. */
  onChange: (rule: Recurrence | null, error: string | null) => void;
}

/**
 * Escolha da repetição: atalhos de um toque, “Personalizado…” (a cada N dias/semanas/meses/anos,
 * dias da semana, dia do mês ou último dia, término) e, sempre, o resumo em texto e a prévia das
 * próximas ocorrências.
 */
export function RepeatPicker({ value, anchor, onChange }: RepeatPickerProps) {
  const ids = { custom: useId(), interval: useId(), unit: useId(), day: useId(), end: useId() };
  const presets = useMemo(() => presetsFor(anchor), [anchor]);
  const [customOpen, setCustomOpen] = useState(() => presetOf(value, anchor) === 'personalizado');
  const [draft, setDraft] = useState<CustomDraft>(() => draftFrom(value, anchor));
  const [error, setError] = useState<string | null>(null);
  const selected: PresetKey = customOpen ? 'personalizado' : presetOf(value, anchor);

  const pick = (key: PresetKey) => {
    if (key === 'personalizado') {
      setCustomOpen(true);
      const next = draftFrom(value ?? presets[3]!.rule, anchor);
      setDraft(next);
      emit(next);
      return;
    }
    setCustomOpen(false);
    setError(null);
    const rule = presets.find((p) => p.key === key)?.rule ?? null;
    onChange(rule, null);
  };

  const emit = (next: CustomDraft) => {
    const candidate = ruleFrom(next);
    const problem = validateRule(candidate, anchor);
    setError(problem);
    onChange(problem ? value : (candidate as Recurrence), problem);
  };
  const update = (patch: Partial<CustomDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    emit(next);
  };

  const preview = useMemo(
    () => {
      if (!value || error) return [];
      // Numa série já em curso, a prévia começa hoje (não no início da série).
      const today = dayKey(appNow());
      return nextOccurrences(value, anchor, today > anchor ? today : anchor, PREVIEW_COUNT);
    },
    [value, anchor, error],
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div role="radiogroup" aria-label="Repetir" className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={selected === p.key}
            aria-controls={p.key === 'personalizado' ? ids.custom : undefined}
            onClick={() => pick(p.key)}
            className={cn(
              CHIP,
              selected === p.key
                ? 'bg-accent text-accent-fg'
                : 'bg-surface text-soft hover:text-fg',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {customOpen && (
        <fieldset id={ids.custom} className="flex flex-col gap-3 rounded-card-sm border-hair p-3">
          <legend className="px-1 text-sm font-medium text-soft">Personalizado</legend>
          <div className="flex flex-wrap items-center gap-2 text-base">
            <label htmlFor={ids.interval}>A cada</label>
            <input
              id={ids.interval}
              inputMode="numeric"
              value={draft.interval}
              min={1}
              max={MAX_RECURRENCE_INTERVAL}
              onChange={(e) => update({ interval: e.target.value.replace(/\D/g, '') })}
              className={cn(INPUT, 'w-16 text-center')}
            />
            <label htmlFor={ids.unit} className="sr-only">
              Unidade
            </label>
            <select
              id={ids.unit}
              value={draft.freq}
              onChange={(e) => update({ freq: e.target.value as Recurrence['freq'] })}
              className={INPUT}
            >
              {FREQ_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {draft.freq === 'semanal' && (
            <div role="group" aria-label="Dias da semana" className="flex flex-wrap gap-1.5">
              {WEEKDAY_CHIPS.map((label, day) => {
                const on = draft.weekdays.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    aria-label={WEEKDAY_NAMES[day]}
                    onClick={() =>
                      update({
                        weekdays: on
                          ? draft.weekdays.filter((d) => d !== day)
                          : [...draft.weekdays, day].sort((a, b) => a - b),
                      })
                    }
                    className={cn(
                      CHIP,
                      'px-2.5',
                      on ? 'bg-accent text-accent-fg' : 'bg-surface text-soft hover:text-fg',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {draft.freq === 'mensal' && (
            <div className="flex flex-wrap items-center gap-2 text-base">
              <label htmlFor={ids.day}>No dia</label>
              <input
                id={ids.day}
                inputMode="numeric"
                value={draft.monthDay}
                disabled={draft.lastDay}
                onChange={(e) => update({ monthDay: e.target.value.replace(/\D/g, '') })}
                className={cn(INPUT, 'w-16 text-center disabled:opacity-50')}
              />
              <label className="flex items-center gap-2 coarse:min-h-touch">
                <input
                  type="checkbox"
                  checked={draft.lastDay}
                  onChange={(e) => update({ lastDay: e.target.checked })}
                  className="size-checkbox accent-accent"
                />
                Último dia do mês
              </label>
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-muted">Termina</legend>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
              {(['nunca', 'em', 'apos'] as const).map((kind) => (
                <label key={kind} className="flex items-center gap-2 coarse:min-h-touch">
                  <input
                    type="radio"
                    name={ids.end}
                    checked={draft.end === kind}
                    onChange={() => update({ end: kind })}
                    className="size-checkbox accent-accent"
                  />
                  {kind === 'nunca' ? 'Nunca' : kind === 'em' ? 'Em' : 'Após'}
                  {kind === 'em' && (
                    <input
                      type="date"
                      aria-label="Data final"
                      value={draft.endDate}
                      min={anchor}
                      onChange={(e) => update({ end: 'em', endDate: e.target.value })}
                      className={INPUT}
                    />
                  )}
                  {kind === 'apos' && (
                    <>
                      <input
                        inputMode="numeric"
                        aria-label="Número de vezes"
                        value={draft.count}
                        max={MAX_RECURRENCE_COUNT}
                        onChange={(e) =>
                          update({ end: 'apos', count: e.target.value.replace(/\D/g, '') })
                        }
                        className={cn(INPUT, 'w-16 text-center')}
                      />
                      vezes
                    </>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>
      )}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        value && (
          <div aria-live="polite" className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-fg">{describeRule(value, anchor)}</p>
            <p className="text-muted">
              Próximas: {preview.map((d) => formatPreviewDate(d, anchor)).join(' · ')}
            </p>
          </div>
        )
      )}

      <p className="flex items-start gap-2 text-xs text-muted">
        <Info aria-hidden strokeWidth={1.5} className="mt-0.5 size-icon-sm shrink-0" />
        Hábito é para marcar no dia, com sequência e calor; tarefa recorrente é um compromisso com
        horário e subtarefas que se repete.
      </p>
    </div>
  );
}
