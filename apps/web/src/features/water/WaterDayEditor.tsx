import { useId, useState, type FormEvent } from 'react';
import { Check, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { WaterLog } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatLongDay } from '../../lib/habits/summary';
import { formatLiters } from '../../lib/stats/format';
import { describePlan, type DayTotalPlan } from '../../lib/water/day';
import { parseAgua, parseAguaTotal } from '../../lib/water/parse';
import { useWaterDay } from './useWaterDay';

const INPUT =
  'h-select w-full rounded-md border-hair bg-surface px-3 text-md text-fg placeholder:text-muted aria-invalid:border-danger coarse:h-touch';
const ICON_BUTTON = 'coarse:size-touch';

interface WaterDayEditorProps {
  /** Dia editado (`yyyy-MM-dd`). */
  date: string;
}

/** Uma linha da lista: horário, quantidade e editar/excluir; ao editar, vira um mini formulário. */
function LogRow({ log, api }: { log: WaterLog; api: ReturnType<typeof useWaterDay> }) {
  const [editing, setEditing] = useState(false);
  const [ml, setMl] = useState(String(log.ml));
  const [time, setTime] = useState(log.time);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const mlId = useId();
  const timeId = useId();

  const save = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseAgua(ml);
    if (!parsed.ok) return setError(parsed.error);
    const failure = api.edit(log.id, parsed.ml, time);
    if (failure) return setError(failure);
    setError(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <li>
        <form
          onSubmit={save}
          className="flex flex-col gap-2"
          aria-label={`Editar registro das ${log.time}`}
        >
          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={mlId} className="text-sm text-soft">
                Quantidade
              </label>
              <input
                id={mlId}
                data-autofocus
                inputMode="decimal"
                value={ml}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(e) => setMl(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="flex w-24 shrink-0 flex-col gap-1">
              <label htmlFor={timeId} className="text-sm text-soft">
                Horário
              </label>
              <input
                id={timeId}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Check aria-hidden strokeWidth={1.5} className="size-icon-sm" />
              Salvar
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setEditing(false);
                setError(null);
                setMl(String(log.ml));
                setTime(log.time);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 border-b-hair border-dashed py-1 last:border-b-0">
      <span className="w-12 text-sm tabular-nums text-muted">{log.time}</span>
      <span className="flex-1 text-md tabular-nums">{log.ml} ml</span>
      <Button
        variant="icon"
        size="xs"
        aria-label={`Editar registro de ${log.ml} ml das ${log.time}`}
        className={ICON_BUTTON}
        onClick={() => setEditing(true)}
      >
        <Pencil aria-hidden strokeWidth={1.5} className="size-icon-sm" />
      </Button>
      <Button
        variant="icon"
        size="xs"
        aria-label={`Excluir registro de ${log.ml} ml das ${log.time}`}
        className={ICON_BUTTON}
        onClick={() => api.remove(log.id)}
      >
        <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
      </Button>
    </li>
  );
}

/**
 * Painel de água de um dia: total e meta, atalhos (+ copo, − último), quantidade personalizada,
 * “definir o total do dia” e a lista de registros (editar e excluir, com “Desfazer”).
 */
export function WaterDayEditor({ date }: WaterDayEditorProps) {
  const api = useWaterDay(date);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [totalText, setTotalText] = useState('');
  const [totalError, setTotalError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ plan: DayTotalPlan; text: string } | null>(null);
  const amountId = useId();
  const amountErrorId = useId();
  const totalId = useId();
  const totalErrorId = useId();
  const listId = useId();

  const isToday = date === api.today;
  const title = isToday ? 'Água de hoje' : `Água de ${formatLongDay(date)}`;

  const submitAmount = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseAgua(amount);
    if (!parsed.ok) return setAmountError(parsed.error);
    const failure = api.add(parsed.ml);
    if (failure) return setAmountError(failure);
    setAmount('');
    setAmountError(null);
  };

  const submitTotal = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseAguaTotal(totalText);
    if (!parsed.ok) return setTotalError(parsed.error);
    setTotalError(null);
    const plan = api.planTotal(parsed.ml);
    const warning = describePlan(plan);
    if (warning) return setPending({ plan, text: warning });
    api.applyTotal(plan);
    setTotalText('');
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <header>
        <h2 className="text-md font-semibold">{title}</h2>
        <p className="mt-1 text-stat font-normal tabular-nums">{formatLiters(api.total)}</p>
        <p className="mb-2 text-sm text-muted">meta de {formatLiters(api.goalMl)}</p>
        <ProgressBar
          value={api.total / api.goalMl}
          aria-label={`Meta de água: ${formatLiters(api.total)} de ${formatLiters(api.goalMl)}`}
        />
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {api.announcement}
      </p>

      {!api.editable ? (
        <p className="text-sm text-muted">
          {date > api.today
            ? 'Dias futuros não podem ser registrados.'
            : 'Só dá para corrigir os últimos 366 dias.'}
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 px-3" onClick={() => void api.addCup()}>
              <Plus aria-hidden strokeWidth={1.5} className="size-icon-sm" />
              Copo ({api.cupMl} ml)
            </Button>
            <Button
              variant="secondary"
              className="flex-1 px-3"
              disabled={api.logs.length === 0}
              onClick={api.removeLast}
            >
              <Minus aria-hidden strokeWidth={1.5} className="size-icon-sm" />
              Último
            </Button>
          </div>

          <form onSubmit={submitAmount} className="flex flex-col gap-1" noValidate>
            <label htmlFor={amountId} className="text-sm text-soft">
              Quantidade personalizada
            </label>
            <div className="flex gap-2">
              <input
                id={amountId}
                data-autofocus
                inputMode="decimal"
                autoComplete="off"
                placeholder="300 ml ou 0,3 l"
                value={amount}
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountError ? amountErrorId : undefined}
                onChange={(e) => setAmount(e.target.value)}
                className={INPUT}
              />
              <Button type="submit" className="shrink-0 px-4">
                Adicionar
              </Button>
            </div>
            {amountError && (
              <p id={amountErrorId} role="alert" className="text-sm text-danger">
                {amountError}
              </p>
            )}
          </form>

          <form onSubmit={submitTotal} className="flex flex-col gap-1" noValidate>
            <label htmlFor={totalId} className="text-sm text-soft">
              Definir o total do dia
            </label>
            <div className="flex gap-2">
              <input
                id={totalId}
                inputMode="decimal"
                autoComplete="off"
                placeholder="1,5 l"
                value={totalText}
                aria-invalid={totalError ? true : undefined}
                aria-describedby={totalError ? totalErrorId : undefined}
                onChange={(e) => {
                  setTotalText(e.target.value);
                  setPending(null);
                }}
                className={INPUT}
              />
              <Button type="submit" variant="secondary" className="shrink-0 px-4">
                Definir
              </Button>
            </div>
            {totalError && (
              <p id={totalErrorId} role="alert" className="text-sm text-danger">
                {totalError}
              </p>
            )}
            {pending && (
              <div className="mt-1 flex flex-col gap-2 rounded-md bg-surface p-3" role="alert">
                <p className="text-sm">
                  {pending.text} O total ficará em {formatLiters(pending.plan.total)}.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      api.applyTotal(pending.plan);
                      setPending(null);
                      setTotalText('');
                    }}
                  >
                    Confirmar
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => setPending(null)}>
                    <X aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </form>
        </>
      )}

      <section aria-labelledby={listId}>
        <h3 id={listId} className="mb-1 text-sm font-medium text-soft">
          Registros {isToday ? 'de hoje' : 'do dia'}
        </h3>
        {api.logs.length === 0 ? (
          <p className="text-sm text-muted">Nenhum registro.</p>
        ) : api.editable ? (
          <ul className="flex flex-col">
            {api.logs.map((log) => (
              <LogRow key={log.id} log={log} api={api} />
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col">
            {api.logs.map((log) => (
              <li key={log.id} className="flex gap-2 py-1 text-md">
                <span className="w-12 text-sm tabular-nums text-muted">{log.time}</span>
                <span className="tabular-nums">{log.ml} ml</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
