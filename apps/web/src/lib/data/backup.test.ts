import { describe, expect, it } from 'vitest';
import { createBackupFile, readBackupFile } from './backup';
import { exam, snapshot } from './test-utils';

const now = new Date(2026, 10, 1, 12, 0);

describe('backup (exportar/importar)', () => {
  it('exporta e importa de volta o mesmo dado', () => {
    const file = createBackupFile(snapshot(), now);
    expect(file.filename).toBe('daily-backup-2026-11-01.json');
    const result = readBackupFile(file.content);
    expect(result.ok && result.snapshot).toEqual(snapshot());
  });

  const invalid: [string, string][] = [
    ['texto que não é JSON', 'isto não é json'],
    ['JSON de outro formato', JSON.stringify({ foo: 'bar' })],
    ['arquivo de outro aplicativo', JSON.stringify({ app: 'outro', version: 1, data: {} })],
    ['versão futura', JSON.stringify({ app: 'daily', version: 2, data: {} })],
    ['versão negativa', JSON.stringify({ app: 'daily', version: -1, data: {} })],
    [
      'evento com status desconhecido',
      JSON.stringify({
        app: 'daily',
        version: 1,
        data: { subjects: [], events: [{ ...exam('e'), status: 'talvez' }] },
      }),
    ],
    [
      'evento apontando para matéria inexistente',
      JSON.stringify({
        app: 'daily',
        version: 1,
        data: { subjects: [], events: [exam('e', 'fantasma')] },
      }),
    ],
    [
      'ids duplicados',
      JSON.stringify({
        app: 'daily',
        version: 1,
        data: { subjects: [], events: [exam('e'), exam('e')] },
      }),
    ],
  ];

  it.each(invalid)('rejeita %s com mensagem de erro', (_name, text) => {
    const result = readBackupFile(text);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.length).toBeGreaterThan(0);
  });
});
