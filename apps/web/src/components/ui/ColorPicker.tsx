import { useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { isPaletteColor, type PaletteColor } from '@daily/shared';
import { cn } from '../../lib/cn';
import { HABIT_COLOR_CLASS, PALETTE_GROUPS, PALETTE_NAME, PICKER_ORDER } from '../../lib/palette';
import { nextPickerIndex } from '../../lib/palette-nav';

interface ColorPickerProps {
  /** Valor guardado (pode ser uma cor que este app não conhece: aí nada aparece marcado). */
  value: string;
  onChange: (color: PaletteColor) => void;
  /** Nome do grupo para o leitor de tela (ex.: “Cor do hábito”). */
  label: string;
}

/**
 * Seletor de cor de hábitos e matérias: uma linha por matiz (ordem estável), a cor escolhida com
 * anel e check, nome em pt-BR no rótulo e na dica. Teclado: Tab entra e sai; ← → andam uma cor;
 * ↑ ↓ trocam de grupo; Home e End vão às pontas; Enter e Espaço escolhem.
 */
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = isPaletteColor(value) ? value : null;
  const tabStop = selected ?? PICKER_ORDER[0];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, color: PaletteColor) => {
    const next = nextPickerIndex(PICKER_ORDER.indexOf(color), e.key);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {PALETTE_GROUPS.map((group) => (
        <div key={group.name} role="group" aria-label={group.name} className="flex flex-wrap gap-2">
          {group.colors.map((color) => {
            const index = PICKER_ORDER.indexOf(color);
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
      ))}
    </div>
  );
}
