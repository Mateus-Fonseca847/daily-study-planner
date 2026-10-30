/**
 * Gera os ícones do app a partir do logo do Daily (“D” branco + ponto amarelo sobre #131313),
 * renderizando SVGs com o Chromium do Playwright (sem dependência nova).
 * Uso: `pnpm icons` → apps/web/public/icons/ e apps/web/public/favicon.*
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../public');
const iconsDir = path.join(publicDir, 'icons');

const BG = '#131313'; // --ds-color-bg
const ACCENT = '#f5e94b'; // --ds-color-accent
const FG = '#ffffff';

/**
 * “D” em negrito (contorno + miolo, `evenodd`) e o ponto amarelo na linha de base, num quadrado de
 * 512. A composição é centralizada; `scale` a reduz em torno do centro (área segura do maskable).
 */
function logo(scale) {
  const shift = -57; // centraliza o conjunto D + ponto
  return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path fill="${FG}" fill-rule="evenodd" transform="translate(${shift} 0)"
      d="M150 130H250C340 130 392 190 392 256C392 322 340 382 250 382H150Z M210 180V332H245C295 332 330 300 330 256C330 212 295 180 245 180Z"/>
    <circle fill="${ACCENT}" cx="${391}" cy="354" r="28"/>
  </g>`;
}

const svg = ({ rounded, scale }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" ${rounded ? 'rx="112" ' : ''}fill="${BG}"/>
  ${logo(scale)}
</svg>
`;

const ICON_SVG = svg({ rounded: true, scale: 1 });
const MASKABLE_SVG = svg({ rounded: false, scale: 0.9 }); // fundo cheio; conteúdo dentro dos 80 %

mkdirSync(iconsDir, { recursive: true });
writeFileSync(path.join(iconsDir, 'daily.svg'), ICON_SVG);
writeFileSync(path.join(publicDir, 'favicon.svg'), ICON_SVG);

const browser = await chromium.launch();
const page = await browser.newPage();

/** Renderiza o SVG em `size` px e devolve o PNG. */
async function render(source, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  return page.screenshot({ type: 'png', omitBackground: true });
}

try {
  const outputs = [
    ['daily-192.png', ICON_SVG, 192],
    ['daily-512.png', ICON_SVG, 512],
    ['daily-maskable-512.png', MASKABLE_SVG, 512],
    ['apple-touch-icon.png', MASKABLE_SVG, 180], // o iOS arredonda sozinho: fundo cheio
  ];
  for (const [name, source, size] of outputs) {
    writeFileSync(path.join(iconsDir, name), await render(source, size));
  }
  // favicon.ico com PNGs embutidos (16, 32 e 48 px).
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) pngs.push(await render(ICON_SVG, size));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2); // tipo: ícone
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size, at);
    header.writeUInt8(size, at + 1);
    header.writeUInt16LE(1, at + 4); // planos
    header.writeUInt16LE(32, at + 6); // bits por pixel
    header.writeUInt32LE(pngs[i].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += pngs[i].length;
  });
  writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ...pngs]));
  console.log('Ícones gerados em', publicDir);
} finally {
  await browser.close();
}
