/** Data fixa da fixture de referência (mês da imagem do calendário: novembro de 2024). */
export const REFERENCE_NOW = new Date(2024, 10, 12, 9, 0);

/** Data fixa das fixtures de Estatísticas e Modo Foco (terça-feira, 10/11/2026, 10h30). */
export const STATS_NOW = new Date(2026, 10, 10, 10, 30);

export type FixtureName = 'reference' | 'stats' | 'focus';

const FIXTURES: readonly string[] = ['reference', 'stats', 'focus'];

/**
 * Fixtures de desenvolvimento (`?fixture=reference|stats|focus`), ignoradas em produção:
 * dados em memória e data fixa, sem tocar nos dados reais do usuário.
 */
export const fixtureName: FixtureName | null = (() => {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get('fixture');
  return value !== null && FIXTURES.includes(value) ? (value as FixtureName) : null;
})();

export const isFixture: boolean = fixtureName !== null;
export const isReferenceFixture: boolean = fixtureName === 'reference';

/** “Agora” do app: fixo nas fixtures, real no uso normal. */
export const appNow = (): Date => {
  if (fixtureName === 'reference') return new Date(REFERENCE_NOW);
  if (fixtureName !== null) return new Date(STATS_NOW);
  return new Date();
};
