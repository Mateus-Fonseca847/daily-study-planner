/** Tipos do verificador de paleta (usado pelo teste `src/styles/palette.test.ts`). */
export const PALETTE: Record<string, string>;
export const RESERVED: Record<string, string>;
export const SURFACE: string;
export const MIN_DELTA_E: number;
export function luminance(hex: string): number;
export function contrast(a: string, b: string): number;
export function deltaE(a: string, b: string): number;
export const PALETTE_LIGHT: Record<string, string>;
export const RESERVED_LIGHT: Record<string, string>;
export const SURFACE_LIGHT: string;
export const MIN_DELTA_E_LIGHT: number;
export function report(theme?: 'dark' | 'light'): {
  pairs: { a: string; b: string; dE: number }[];
  contrasts: { name: string; ratio: number }[];
};
