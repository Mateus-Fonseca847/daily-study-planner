import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { check } from '../../scripts/check-tokens.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'check-tokens-'));
const file = (name: string, content: string) => {
  const full = path.join(dir, name);
  writeFileSync(full, content);
  return full;
};
const rules = (name: string, content: string) => check([file(name, content)]).map((p) => p.rule);

describe('check:tokens', () => {
  it('acusa hex, funções de cor, classes de cor do Tailwind e cores nomeadas', () => {
    expect(
      rules('a.tsx', `<div className="bg-white text-gray-500 hover:border-red-400/50" />`),
    ).toEqual([
      'classe de cor do Tailwind',
      'classe de cor do Tailwind',
      'classe de cor do Tailwind',
    ]);
    expect(rules('b.tsx', `const c = '#ff0000'; const d = 'rgb(0 0 0)';`)).toEqual([
      'hex',
      'função de cor',
    ]);
    expect(rules('c.tsx', `<p style={{ color: 'white' }} />`)).toEqual([
      'cor nomeada em estilo inline',
    ]);
    expect(rules('d.css', `.x { background: black; border-color: oklch(70% 0.1 200); }`)).toEqual([
      'função de cor',
      'cor nomeada no CSS',
    ]);
  });

  it('aceita tokens, comentários, transparent/currentColor e a exceção marcada', () => {
    expect(
      rules('e.tsx', `<div className="bg-surface text-fg border-transparent bg-accent-ink" />`),
    ).toEqual([]);
    expect(
      rules(
        'f.css',
        `/* antes era #fff */ .x { color: currentColor; fill: var(--ds-color-white-pill); }`,
      ),
    ).toEqual([]);
    expect(rules('g.ts', `const c = '#131313'; // check-tokens: permitido — teste`)).toEqual([]);
    expect(rules('h.tsx', `const id = '#root'; // ok`)).toEqual([]);
  });

  it('o número da linha aponta o lugar certo', () => {
    const [p] = check([file('i.tsx', `const a = 1;\n/* x */\nconst b = '#abcdef';`)]);
    expect(p?.line).toBe(3);
  });
});
