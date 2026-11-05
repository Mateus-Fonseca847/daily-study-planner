/** Limites de um registro de água e do total do dia (ml). */
export const MIN_WATER_ML = 1;
export const MAX_WATER_LOG_ML = 5000;
export const MAX_WATER_DAY_ML = 20_000;

export type ParseAguaResult = { ok: true; ml: number } | { ok: false; error: string };

const EXAMPLES = 'Use, por exemplo, 300, 300 ml, 0,3 l ou 1,5L.';

/** Número com vírgula ou ponto decimal e unidade opcional (`ml`, `l`, `litro`, `litros`). */
const PATTERN = /^(\d+(?:[.,]\d+)?)\s*(ml|l|litros?)?$/i;

/** Lê o texto como ml inteiros, sem aplicar limites. */
function readMl(text: string): ParseAguaResult {
  const raw = text.trim();
  if (raw === '') return { ok: false, error: `Digite a quantidade. ${EXAMPLES}` };
  const match = PATTERN.exec(raw);
  if (!match) return { ok: false, error: `Não entendi “${raw}”. ${EXAMPLES}` };

  const digits = match[1] as string;
  const unit = match[2]?.toLowerCase();
  // Sem unidade só vale inteiro (ml): “0,3” seria ambíguo.
  if (unit === undefined && /[.,]/.test(digits)) {
    return { ok: false, error: `Informe a unidade (ml ou L) quando houver decimais. ${EXAMPLES}` };
  }
  const number = Number(digits.replace(',', '.'));
  const liters = unit !== undefined && unit !== 'ml';
  return { ok: true, ml: Math.round(liters ? number * 1000 : number) };
}

/**
 * Quantidade de **um registro**, em ml inteiros: `300`, `300 ml`, `0,3 l`, `1,5L`, `1.5 litros`.
 * Vale de 1 a 5000 ml. Função pura.
 */
export function parseAgua(text: string): ParseAguaResult {
  const read = readMl(text);
  if (!read.ok) return read;
  if (read.ml < MIN_WATER_ML || read.ml > MAX_WATER_LOG_ML) {
    return {
      ok: false,
      error: `Informe de ${MIN_WATER_ML} a ${MAX_WATER_LOG_ML} ml por registro.`,
    };
  }
  return read;
}

/** Quantidade do **total do dia**: mesmos formatos, de 0 (zera o dia) a 20 L. */
export function parseAguaTotal(text: string): ParseAguaResult {
  const read = readMl(text);
  if (!read.ok) return read;
  if (read.ml > MAX_WATER_DAY_ML) {
    return { ok: false, error: `O total do dia vai de 0 a ${MAX_WATER_DAY_ML / 1000} L.` };
  }
  return read;
}
