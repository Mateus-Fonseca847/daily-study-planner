import { useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import type { PaletteColor } from '@daily/shared';
import { cn } from '../../lib/cn';
import { HABIT_COLOR_CLASS, PALETTE_NAME, PICKER_COLORS } from '../../lib/palette';
import { nextPickerIndex } from '../../lib/palette-nav';

interface ColorPickerProps {
  /** Valor guardado (pode ser uma cor que este app não conhece: aí nada aparece marcado). */
  value: string;
  onChange: (color: PaletteColor) => void;
  /** Nome do grupo para o leitor de tela (ex.: “Cor do hábito”). */
  label: string;
}

/**
 * Seletor de cor de hábitos e matérias: 8 cores em 2 linhas × 4 colunas, a escolhida com anel e
 * check, nome em pt-BR no rótulo e na dica. Teclado: Tab entra e sai; ← → andam uma cor; ↑ ↓ uma
 * linha; Home e End vão às pontas; Enter e Espaço escolhem. Uma cor guardada fora destas 8 (as da
 * paleta antiga) continua valendo e só não aparece marcada.
 */
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = PICKER_COLORS.find((c) => c === value) ?? null;
  const tabStop = selected ?? PICKER_COLORS[0];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, color: PaletteColor) => {
    const next = nextPickerIndex(PICKER_COLORS.indexOf(color), e.key);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="grid w-max grid-cols-4 gap-2">
      {PICKER_COLORS.map((color, index) => {
        const checked = color === selected;
        return (
          <button
            key={color}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={PALETTE_NAME[color]}
            title={PALETTE_NAME[color]}
            data-color={color}
            tabIndex={color === tabStop ? 0 : -1}
            onClick={() => onChange(color)}
            onKeyDown={(e) => onKeyDown(e, color)}
            className={cn(
              'habit-bg inline-flex size-control items-center justify-center rounded-full text-on-habit coarse:size-touch',
              HABIT_COLOR_CLASS[color],
              checked && 'ring-2 ring-fg ring-offset-2 ring-offset-raised',
            )}
          >
            {checked && <Check aria-hidden strokeWidth={3} className="size-icon-sm" />}
          </button>
        );
      })}
    </div>
  );
}
