import { useRef, useState, type KeyboardEvent } from 'react';
import {
  durationNotice,
  formatDuration,
  parseDuration,
  sanitizeDurationText,
  stepDuration,
} from '../../lib/focus/time-input';

interface DurationInputProps {
  /** Duração atual em segundos. */
  seconds: number;
  /** Chamado com a nova duração confirmada (já dentro de 1 min – 3 h). */
  onCommit: (seconds: number) => void;
  /** Avisos educados para leitores de tela (entrada inválida ou ajustada). */
  onNotice: (message: string) => void;
}

/**
 * Tempo editável dentro do anel (estado ocioso): um `<input>` sem caixa, com a mesma tipografia dos
 * dígitos. Aceita só dígitos e “:”. Enter e sair do campo confirmam; Esc cancela; ↑/↓ = ±1 min (Shift ±5).
 */
export function DurationInput({ seconds, onCommit, onNotice }: DurationInputProps) {
  const [draft, setDraft] = useState<string | null>(null); // null = não está editando
  const shown = draft ?? formatDuration(seconds);
  // Enter/Esc já resolveram a edição; o blur que vem logo depois não deve confirmar de novo.
  const settled = useRef(false);

  const commit = () => {
    if (settled.current) {
      settled.current = false;
      return;
    }
    if (draft === null) return;
    const result = parseDuration(draft);
    const notice = durationNotice(result, seconds);
    if (notice) onNotice(notice);
    if (result.ok) onCommit(result.seconds);
    setDraft(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
      settled.current = true;
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(null); // cancela: volta ao valor anterior
      settled.current = true;
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const base = draft === null ? null : parseDuration(draft);
      const current = base?.ok ? base.seconds : seconds;
      const next = stepDuration(current, e.key === 'ArrowUp' ? 1 : -1, e.shiftKey);
      onCommit(next);
      setDraft(formatDuration(next));
      e.currentTarget.select();
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      aria-label="Duração da sessão"
      title="Digite a duração: 25, 25:30 ou 1:30:00"
      value={shown}
      onFocus={(e) => {
        setDraft(formatDuration(seconds));
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(sanitizeDurationText(e.target.value))}
      onKeyDown={onKeyDown}
      onBlur={commit}
      className="w-timer-input border-b-hair border-transparent bg-transparent text-center text-timer font-light tabular-nums text-fg caret-accent hover:border-line-strong focus:border-line-strong focus:outline-none"
    />
  );
}
