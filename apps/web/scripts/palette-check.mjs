/**
 * Verifica a paleta dos dois temas: distinção (CIEDE2000) entre todas as cores de matéria/hábito, os
 * status, os tipos e a marca, e contraste sobre a superfície. Uso:
 * `node apps/web/scripts/palette-check.mjs [dark|light]` (sem argumento, os dois).
 * Os valores precisam espelhar `src/styles/tokens.css` (o teste `palette.test.ts` confere).
 */
export const PALETTE = {
  ciano: '#2beeee',
  petroleo: '#53a9c6',
  gelo: '#c6dfec',
  lilas: '#e2c6ec',
  fucsia: '#de2bee',
  rosa: '#d279a6',
  cinza: '#a3998f',
};
export const RESERVED = {
  'status-pendente': '#f2c94c',
  'status-concluido': '#3dd68c',
  'status-cancelado': '#ff6b78',
  'tipo-prova': '#5c97ff',
  'tipo-especial': '#b48cff',
  marca: '#f5e94b',
  chama: '#ff8a3d',
};
export const SURFACE = '#1b1b1d';
/** Distância mínima entre cores da paleta e entre a paleta e as cores reservadas. */
export const MIN_DELTA_E = 15;

/** Tema claro: tinta escura (AA sobre o branco); o ΔE mínimo é 14 (decisão do Prompt 13). */
export const PALETTE_LIGHT = {
  ciano: '#007d77',
  petroleo: '#177692',
  gelo: '#4c575e',
  lilas: '#7a5a86',
  fucsia: '#9a1686',
  rosa: '#bd3f71',
  cinza: '#72685c',
};
export const RESERVED_LIGHT = {
  'status-pendente': '#8a6100',
  'status-concluido': '#16794a',
  'status-cancelado': '#c22a3b',
  'tipo-prova': '#2458c9',
  'tipo-especial': '#7545d6',
  marca: '#6b5d00',
  chama: '#b04f09',
};
/** Fundo da página no claro (o pior caso de contraste; a superfície é branca). */
export const SURFACE_LIGHT = '#f4f4f6';
export const MIN_DELTA_E_LIGHT = 14;

export const THEMES = {
  dark: { palette: PALETTE, reserved: RESERVED, surface: SURFACE, minDeltaE: MIN_DELTA_E },
  light: {
    palette: PALETTE_LIGHT,
    reserved: RESERVED_LIGHT,
    surface: SURFACE_LIGHT,
    minDeltaE: MIN_DELTA_E_LIGHT,
  },
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
function toLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
/** CIEDE2000. */
export function deltaE(h1, h2) {
  const [L1, a1, b1] = toLab(h1);
  const [L2, a2, b2] = toLab(h2);
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hp = (a, b) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);
  const dL = L2 - L1;
  const dC = C2p - C1p;
  let dh = h2p - h1p;
  if (C1p * C2p === 0) dh = 0;
  else if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hb += h1p + h2p < 360 ? 360 : -360;
    hb /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hb - 30) * rad) +
    0.24 * Math.cos(2 * hb * rad) +
    0.32 * Math.cos((3 * hb + 6) * rad) -
    0.2 * Math.cos((4 * hb - 63) * rad);
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT =
    -2 *
    Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) *
    Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

export function report(theme = 'dark') {
  const { palette, reserved, surface } = THEMES[theme];
  const all = { ...palette, ...reserved };
  const names = Object.keys(all);
  const pairs = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const [a, b] = [names[i], names[j]];
      // Entre cores reservadas a distinção já é dada por ícone/texto; mede o que envolve a paleta.
      if (!(a in palette) && !(b in palette)) continue;
      pairs.push({ a, b, dE: deltaE(all[a], all[b]) });
    }
  }
  const contrasts = names.map((n) => ({ name: n, ratio: contrast(all[n], surface) }));
  return { pairs: pairs.sort((x, y) => x.dE - y.dE), contrasts };
}

if (process.argv[1]?.endsWith('palette-check.mjs')) {
  const arg = process.argv[2];
  let failed = false;
  for (const theme of arg ? [arg] : ['dark', 'light']) {
    const { surface, minDeltaE } = THEMES[theme];
    const { pairs, contrasts } = report(theme);
    console.log(`\n[${theme}] Menores distâncias (ΔE2000):`);
    for (const p of pairs.slice(0, 10)) console.log(`  ${p.a} × ${p.b}: ${p.dE.toFixed(1)}`);
    console.log(`\n[${theme}] Contraste sobre ${surface}:`);
    for (const c of contrasts) console.log(`  ${c.name}: ${c.ratio.toFixed(2)}:1`);
    const bad = pairs.filter((p) => p.dE < minDeltaE);
    const low = contrasts.filter((c) => c.ratio < 4.5);
    if (bad.length || low.length) {
      console.error(
        `\n[${theme}] FALHOU: ${bad.length} pares < ${minDeltaE}, ${low.length} cores < 4.5:1`,
      );
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log('\nok');
}
