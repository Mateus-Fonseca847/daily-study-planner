import { PICKER_COLORS, PICKER_COLUMNS } from './palette';

/**
 * Próxima cor ao navegar pelo teclado na grade do seletor (ou `null` se a tecla não navega).
 * ← → andam uma cor e ↑ ↓ uma linha, sem dar a volta; Home e End vão à primeira e à última.
 */
export function nextPickerIndex(index: number, key: string): number | null {
  const last = PICKER_COLORS.length - 1;
  switch (key) {
    case 'ArrowRight':
      return Math.min(index + 1, last);
    case 'ArrowLeft':
      return Math.max(index - 1, 0);
    case 'ArrowDown':
      return index + PICKER_COLUMNS <= last ? index + PICKER_COLUMNS : index;
    case 'ArrowUp':
      return index - PICKER_COLUMNS >= 0 ? index - PICKER_COLUMNS : index;
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}
