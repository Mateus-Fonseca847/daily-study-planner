/** Tipos do verificador de cores literais (usado pelo teste `src/styles/check-tokens.test.ts`). */
export const RULES: { name: string; re: RegExp; files: RegExp }[];
export function check(
  files: string[],
): { file: string; line: number; rule: string; text: string }[];
