import { describe, expect, it } from 'vitest';
import { reconcile } from './reconcile';

const base = { pristineHash: 'P' };

describe('reconcile', () => {
  it('nuvem vazia: envia o local', () => {
    expect(reconcile({ ...base, localHash: 'A', remote: null, meta: null })).toEqual({
      kind: 'push',
      expectedRevision: null,
    });
  });

  it('primeiro login com local virgem: puxa a nuvem', () => {
    expect(
      reconcile({ ...base, localHash: 'P', remote: { revision: 4, hash: 'R' }, meta: null }),
    ).toEqual({ kind: 'pull' });
  });

  it('primeiro login com dados nos dois lados: conflito', () => {
    expect(
      reconcile({ ...base, localHash: 'A', remote: { revision: 4, hash: 'R' }, meta: null }),
    ).toEqual({ kind: 'conflict' });
  });

  it('primeiro login com dados idênticos: adota sem trocar nada', () => {
    expect(
      reconcile({ ...base, localHash: 'A', remote: { revision: 4, hash: 'A' }, meta: null }),
    ).toEqual({ kind: 'adopt' });
  });

  it('só o local mudou: envia com a revisão esperada', () => {
    expect(
      reconcile({
        ...base,
        localHash: 'B',
        remote: { revision: 5, hash: 'A' },
        meta: { revision: 5, hash: 'A' },
      }),
    ).toEqual({ kind: 'push', expectedRevision: 5 });
  });

  it('só a nuvem mudou: puxa', () => {
    expect(
      reconcile({
        ...base,
        localHash: 'A',
        remote: { revision: 6, hash: 'C' },
        meta: { revision: 5, hash: 'A' },
      }),
    ).toEqual({ kind: 'pull' });
  });

  it('os dois mudaram: conflito', () => {
    expect(
      reconcile({
        ...base,
        localHash: 'B',
        remote: { revision: 6, hash: 'C' },
        meta: { revision: 5, hash: 'A' },
      }),
    ).toEqual({ kind: 'conflict' });
  });

  it('nada mudou: noop', () => {
    expect(
      reconcile({
        ...base,
        localHash: 'A',
        remote: { revision: 5, hash: 'A' },
        meta: { revision: 5, hash: 'A' },
      }),
    ).toEqual({ kind: 'noop' });
  });

  it('a nuvem foi apagada depois de sincronizar: reenvia', () => {
    expect(
      reconcile({ ...base, localHash: 'A', remote: null, meta: { revision: 5, hash: 'A' } }),
    ).toEqual({ kind: 'push', expectedRevision: null });
  });
});
