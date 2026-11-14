import { PALETTE_COLORS, resolvePaletteColor, type PaletteColor } from '@daily/shared';

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
  carmim: 'Carmim',
  coral: 'Coral',
  laranja: 'Laranja',
  terracota: 'Terracota',
  amarelo: 'Amarelo',
  mostarda: 'Mostarda',
  lima: 'Lima',
  verde: 'Verde',
  oliva: 'Oliva',
  menta: 'Menta',
  celeste: 'Celeste',
  azul: 'Azul',
  anil: 'Anil',
  violeta: 'Violeta',
  roxo: 'Roxo',
  vinho: 'Vinho',
  marrom: 'Marrom',
  pedra: 'Pedra',
  grafite: 'Grafite',
};

/** Linhas do seletor, por matiz e em ordem estável (os ids guardados não dependem disto). */
export const PALETTE_GROUPS: readonly { name: string; colors: readonly PaletteColor[] }[] = [
  { name: 'Vermelhos', colors: ['vermelho', 'carmim', 'vinho'] },
  { name: 'Laranjas e terrosos', colors: ['laranja', 'coral', 'terracota', 'marrom'] },
  { name: 'Amarelos', colors: ['amarelo', 'mostarda'] },
  { name: 'Verdes', colors: ['lima', 'verde', 'oliva', 'menta'] },
  { name: 'Azul-esverdeados', colors: ['ciano', 'petroleo'] },
  { name: 'Azuis', colors: ['celeste', 'azul', 'anil', 'gelo'] },
  { name: 'Roxos', colors: ['violeta', 'roxo', 'lilas'] },
  { name: 'Rosas', colors: ['rosa', 'fucsia'] },
  { name: 'Neutros', colors: ['cinza', 'pedra', 'grafite'] },
];

/** Ordem do seletor (grupo por grupo). */
export const PICKER_ORDER: readonly PaletteColor[] = PALETTE_GROUPS.flatMap((g) => g.colors);

/** Nome de qualquer valor guardado (uma cor desconhecida aparece como a cor usada no lugar). */
export const paletteName = (value: string): string => PALETTE_NAME[resolvePaletteColor(value)];

/** Todas as cores do catálogo, na ordem dos ids (para os testes). */
export const ALL_PALETTE_COLORS: readonly PaletteColor[] = PALETTE_COLORS;

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
  carmim: 'habit-carmim',
  coral: 'habit-coral',
  laranja: 'habit-laranja',
  terracota: 'habit-terracota',
  amarelo: 'habit-amarelo',
  mostarda: 'habit-mostarda',
  lima: 'habit-lima',
  verde: 'habit-verde',
  oliva: 'habit-oliva',
  menta: 'habit-menta',
  celeste: 'habit-celeste',
  azul: 'habit-azul',
  anil: 'habit-anil',
  violeta: 'habit-violeta',
  roxo: 'habit-roxo',
  vinho: 'habit-vinho',
  marrom: 'habit-marrom',
  pedra: 'habit-pedra',
  grafite: 'habit-grafite',
};

/** Classe da cor guardada; uma cor desconhecida usa a cor segura (`resolvePaletteColor`). */
export const habitColorClass = (color: string): string =>
  HABIT_COLOR_CLASS[resolvePaletteColor(color)];
