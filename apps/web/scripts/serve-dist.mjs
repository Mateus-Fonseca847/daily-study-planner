/**
 * Serve `dist` aplicando as regras de `vercel.json` (rewrites SPA e cabeçalhos, inclusive a CSP),
 * para os testes e2e rodarem com as mesmas regras da produção. É uma aproximação do roteador da
 * Vercel: cada `source` é tratado como expressão regular sobre o caminho inteiro e o arquivo
 * estático tem prioridade sobre o rewrite.
 * Uso: `node scripts/serve-dist.mjs <dir> <porta>`
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 5199);
const config = JSON.parse(readFileSync(path.resolve(here, '../vercel.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const matches = (source, pathname) => new RegExp(`^${source}$`).test(pathname);

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  let file = path.join(dir, pathname === '/' ? 'index.html' : decodeURIComponent(pathname));
  const isFile = file.startsWith(dir) && existsSync(file) && statSync(file).isFile();
  if (!isFile) {
    const rewrite = config.rewrites?.find((r) => matches(r.source, pathname));
    if (!rewrite) {
      res.writeHead(404).end('Not found');
      return;
    }
    file = path.join(dir, rewrite.destination);
  }
  const headers = { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' };
  for (const rule of config.headers ?? []) {
    if (!matches(rule.source, pathname)) continue;
    for (const { key, value } of rule.headers) headers[key] = value; // a regra mais específica vem depois
  }
  res.writeHead(200, headers).end(readFileSync(file));
});

server.listen(port, () => console.log(`dist em http://localhost:${port}`));
