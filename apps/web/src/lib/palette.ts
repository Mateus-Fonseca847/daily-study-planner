import { resolvePaletteColor, type PaletteColor } from '@daily/shared';

/** Nome de cada cor em pt-BR (rótulo acessível e dica do seletor). */
export const PALETTE_NAME: Record<PaletteColor, string> = {
  ciano: 'Ciano',
  petroleo: 'Azul-petróleo',
  gelo: 'Gelo',
  lilas: 'Lilás',
  fucsia: 'Fúcsia',
  rosa: 'Rosa',
  cinza: 'Cinza',
  vermelho: 'Vermelho',
  laranja: 'Laranja',
  amarelo: 'Amarelo',
  lima: 'Lima',
  verde: 'Verde',
  azul: 'Azul',
};

/**
 * Cores oferecidas no seletor (escolha do dono, Prompt 13.2), em 2 linhas × 4 colunas, por matiz.
 * As outras chaves de `PALETTE_COLORS` (a paleta da v4) continuam válidas para os dados antigos,
 * mas não aparecem para escolha.
 */
export const PICKER_COLORS: readonly PaletteColor[] = [
  'vermelho',
  'laranja',
  'amarelo',
  'lima',
  'verde',
  'ciano',
  'azul',
  'fucsia',
];

/** Colunas da grade do seletor (as setas ↑ ↓ andam uma linha). */
export const PICKER_COLUMNS = 4;

/** Nome de qualquer valor guardado (uma cor desconhecida aparece como a cor usada no lugar). */
export const paletteName = (value: string): string => PALETTE_NAME[resolvePaletteColor(value)];

/** Classes completas (o Tailwind só gera o que aparece literalmente no código). */
export const HABIT_COLOR_CLASS: Record<PaletteColor, string> = {
  ciano: 'habit-ciano',
  petroleo: 'habit-petroleo',
  gelo: 'habit-gelo',
  lilas: 'habit-lilas',
  fucsia: 'habit-fucsia',
  rosa: 'habit-rosa',
  cinza: 'habit-cinza',
  vermelho: 'habit-vermelho',
  laranja: 'habit-laranja',
  amarelo: 'habit-amarelo',
  lima: 'habit-lima',
  verde: 'habit-verde',
  azul: 'habit-azul',
};

/** Classe da cor guardada; uma cor desconhecida usa a cor segura (`resolvePaletteColor`). */
export const habitColorClass = (color: string): string =>
  HABIT_COLOR_CLASS[resolvePaletteColor(color)];
