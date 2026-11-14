import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RESERVED_USERNAMES } from '@daily/shared';

/** Cliente e banco usam a MESMA lista de @ reservados (a migração é a fonte do banco). */
describe('reservados: packages/shared × supabase/migrations', () => {
  it('as duas listas são iguais', () => {
    const sql = readFileSync(
      fileURLToPath(
        new URL(
          '../../../../../supabase/migrations/20261115000001_social_tables.sql',
          import.meta.url,
        ),
      ),
      'utf8',
    );
    const start = sql.indexOf('insert into public.reserved_usernames');
    const block = sql.slice(start, sql.indexOf(';', start));
    const inSql = [...block.matchAll(/\('([a-z0-9._]+)'\)/g)].map((m) => m[1]).sort();
    expect(inSql).toEqual([...RESERVED_USERNAMES].sort());
  });
});
