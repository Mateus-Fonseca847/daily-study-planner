/**
 * Verificador de links relativos nos .md versionados (sem dependência): confere se o arquivo ou a
 * pasta existe no repositório (versionado) e, quando há âncora (`#titulo`), se o título existe no destino. Ignora links
 * externos e o conteúdo de blocos e trechos de código.
 * Uso: `pnpm check:links` (sai com código 1 se houver link quebrado).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const files = tracked.filter((f) => f.endsWith('.md'));

/** O destino precisa estar no Git: um arquivo ignorado existe no disco, mas não no repositório. */
const isTracked = (abs) => {
  const rel = path.relative(root, abs).split(path.sep).join('/');
  return tracked.some((f) => f === rel || f.startsWith(`${rel}/`));
};

/** Remove blocos ``` ``` e trechos `código`, mantendo as quebras de linha (para os números de linha). */
const stripCode = (text) =>
  text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ''))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));

/** Âncoras no estilo do GitHub: minúsculas, sem pontuação, espaços viram hífens. */
const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');

const anchorsCache = new Map();
function anchorsOf(file) {
  if (!anchorsCache.has(file)) {
    const text = stripCode(readFileSync(file, 'utf8'));
    const anchors = new Set();
    for (const m of text.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) anchors.add(slug(m[1]));
    anchorsCache.set(file, anchors);
  }
  return anchorsCache.get(file);
}

const broken = [];
let checked = 0;
for (const rel of files) {
  const abs = path.join(root, rel);
  const text = stripCode(readFileSync(abs, 'utf8'));
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      const target = m[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue; // http:, mailto:, etc.
      checked += 1;
      const [filePart, anchor] = target.split('#');
      let dest = abs;
      if (filePart) {
        dest = path.resolve(path.dirname(abs), decodeURIComponent(filePart));
        if (!existsSync(dest) || !isTracked(dest)) {
          broken.push(`${rel}:${i + 1}  ${target}  (não existe no repositório)`);
          continue;
        }
      }
      if (anchor && dest.endsWith('.md') && statSync(dest).isFile()) {
        if (!anchorsOf(dest).has(decodeURIComponent(anchor).toLowerCase())) {
          broken.push(`${rel}:${i + 1}  ${target}  (âncora não encontrada)`);
        }
      }
    }
  });
}

if (broken.length) {
  console.error(`${broken.length} link(s) quebrado(s):\n${broken.join('\n')}`);
  process.exit(1);
}
console.log(`${checked} links relativos em ${files.length} arquivos .md: todos válidos`);
