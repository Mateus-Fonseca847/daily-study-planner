import { describe, expect, it } from 'vitest';
import { formatBytes } from './storage';

describe('formatBytes', () => {
  it('mostra bytes inteiros e sobe de unidade a cada 1024', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(3.25 * 1024 ** 3)).toBe('3,3 GB');
  });

  it('não aceita valores negativos', () => {
    expect(formatBytes(-10)).toBe('0 B');
  });
});
