import { PALETTE_GROUPS, PICKER_ORDER } from './palette';

/** Início de cada grupo na ordem do seletor. */
const GROUP_STARTS = PALETTE_GROUPS.map((_, i) =>
  PALETTE_GROUPS.slice(0, i).reduce((n, g) => n + g.colors.length, 0),
);

const groupOf = (index: number): number => {
  let g = 0;
  for (let i = 0; i < GROUP_STARTS.length; i += 1) if (index >= GROUP_STARTS[i]!) g = i;
  return g;
};

/**
 * Próxima cor ao navegar pelo teclado no seletor (ou `null` se a tecla não navega). ← → andam uma
 * cor (sem dar a volta); ↑ ↓ vão ao grupo anterior/seguinte, na mesma posição (ou na última do
 * grupo, se ele for menor); Home e End vão à primeira e à última.
 */
export function nextPickerIndex(index: number, key: string): number | null {
  const last = PICKER_ORDER.length - 1;
  switch (key) {
    case 'ArrowRight':
      return Math.min(index + 1, last);
    case 'ArrowLeft':
      return Math.max(index - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return last;
    case 'ArrowDown':
    case 'ArrowUp': {
      const g = groupOf(index);
      const target = key === 'ArrowDown' ? g + 1 : g - 1;
      if (target < 0 || target >= PALETTE_GROUPS.length) return index;
      const offset = index - GROUP_STARTS[g]!;
      const size = PALETTE_GROUPS[target]!.colors.length;
      return GROUP_STARTS[target]! + Math.min(offset, size - 1);
    }
    default:
      return null;
  }
}
