import { describe, expect, it, vi } from 'vitest';

// `lib/fixture` lê a URL ao ser importado; no Node não há `window`.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window ??= { location: { search: '' } };
});
import { dataSnapshotSchema } from '@daily/shared';
import { sampleSnapshot } from './events';
import { referenceSnapshot } from './reference-fixture';
import { statsSnapshot } from './stats-fixture';
import { viewsSnapshot } from './views-fixture';

/** As fixtures montam snapshots em tempo de execução: um formato velho só quebraria no navegador. */
describe('fixtures', () => {
  it.each([
    ['exemplo', () => sampleSnapshot(new Date(2026, 10, 10))],
    ['referência', () => referenceSnapshot()],
    ['estatísticas', () => statsSnapshot()],
    ['visões', () => viewsSnapshot()],
  ])('%s gera um snapshot v4 válido', (_name, build) => {
    expect(dataSnapshotSchema.safeParse(build()).success).toBe(true);
  });
});
