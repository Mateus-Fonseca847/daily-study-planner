/**
 * Falha se aparecer cor literal fora de `src/styles/tokens.css`: hex, funções de cor (`rgb()`,
 * `hsl()`, `oklch()`…), classes de cor do Tailwind (`bg-white`, `text-gray-500`…) e cores nomeadas
 * do CSS em declarações. Cada componente usa só tokens semânticos, que valem nos dois temas.
 *   node apps/web/scripts/check-tokens.mjs   (ou `pnpm check:tokens`)
 * Exceção pontual: a linha leva `check-tokens: permitido — <motivo>` (ex.: a cor do theme-color,
 * que o JS precisa antes do CSS e que um teste confere contra os tokens). Testes ficam de fora.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(webRoot, 'src');
const TOKENS = path.join(SRC, 'styles', 'tokens.css');
const ALLOW = 'check-tokens: permitido';

const NAMED =
  'white|black|red|orange|yellow|green|blue|purple|pink|gray|grey|silver|maroon|navy|teal|olive|lime|aqua|fuchsia|brown|gold|indigo|violet';
const TW_COLORS =
  'white|black|gray|zinc|neutral|slate|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const TW_UTILS =
  'bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|shadow|divide|decoration|accent|caret|placeholder';

export const RULES = [
  { name: 'hex', re: /#[0-9a-f]{3,8}\b(?![-\w])/gi, files: /\.(css|tsx?)$/ },
  {
    name: 'função de cor',
    re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi,
    files: /\.(css|tsx?)$/,
  },
  {
    name: 'classe de cor do Tailwind',
    re: new RegExp(
      `(?<![\\w-])(?:${TW_UTILS})-(?:${TW_COLORS})(?:-\\d{2,3})?(?:\\/\\d+)?(?![\\w-])`,
      'g',
    ),
    files: /\.tsx?$/,
  },
  {
    name: 'cor nomeada no CSS',
    re: new RegExp(
      `(?:color|background|border|outline|fill|stroke|shadow)[\\w-]*\\s*:[^;{}]*(?<![\\w-])(?:${NAMED})(?![\\w-])`,
      'gi',
    ),
    files: /\.css$/,
  },
  {
    name: 'cor nomeada em estilo inline',
    re: new RegExp(
      `(?:color|background|borderColor|fill|stroke|outlineColor)\\w*\\s*:\\s*['"\`](?:${NAMED})['"\`]`,
      'g',
    ),
    files: /\.tsx?$/,
  },
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Tira comentários (mantendo as quebras de linha, para o número da linha continuar certo). */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

export function check(files) {
  const problems = [];
  for (const file of files) {
    if (path.resolve(file) === TOKENS || /\.test\.tsx?$/.test(file)) continue;
    const raw = readFileSync(file, 'utf8');
    const rawLines = raw.split('\n');
    const lines = stripComments(raw).split('\n');
    for (const rule of RULES) {
      if (!rule.files.test(file)) continue;
      lines.forEach((line, i) => {
        if (rawLines[i]?.includes(ALLOW)) return;
        for (const match of line.matchAll(rule.re)) {
          problems.push({
            file: path.relative(webRoot, file),
            line: i + 1,
            rule: rule.name,
            text: match[0],
          });
        }
      });
    }
  }
  return problems;
}

if (process.argv[1]?.endsWith('check-tokens.mjs')) {
  const files = [...walk(SRC)].filter((f) => /\.(css|tsx?)$/.test(f));
  const problems = check(files);
  if (problems.length) {
    console.error(`Cor literal fora de tokens.css (${problems.length}):`);
    for (const p of problems) console.error(`  ${p.file}:${p.line}  ${p.rule}: ${p.text}`);
    console.error(
      '\nUse um token semântico (docs/design/design-system.md) ou crie um em tokens.css.',
    );
    process.exit(1);
  }
  console.log(`${files.length} arquivos: nenhuma cor fora de tokens.css`);
}
