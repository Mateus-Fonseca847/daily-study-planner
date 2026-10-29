/** Data fixa usada pela fixture de referência (mês da imagem: novembro de 2024). */
export const REFERENCE_NOW = new Date(2024, 10, 12, 9, 0);

/** Fixture de desenvolvimento: `?fixture=reference` (ignorada em produção). */
export const isReferenceFixture: boolean =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('fixture') === 'reference';

export const appNow = (): Date => (isReferenceFixture ? new Date(REFERENCE_NOW) : new Date());
