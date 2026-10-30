import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudApi, CloudRow } from '../sync/engine';

const COLUMNS = 'data, version, revision, updated_at';
const UNIQUE_VIOLATION = '23505';

interface DbRow {
  data: unknown;
  version: number;
  revision: number;
  updated_at: string;
}

const toRow = (r: DbRow): CloudRow => ({
  data: r.data,
  version: r.version,
  revision: Number(r.revision),
  updatedAt: r.updated_at,
});

/** `public.user_data`: uma linha por usuário; a RLS garante que só a própria é visível. */
export function createSupabaseApi(client: SupabaseClient, userId: string): CloudApi {
  const table = () => client.from('user_data');
  return {
    async fetch() {
      const { data, error } = await table().select(COLUMNS).eq('user_id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toRow(data as DbRow) : null;
    },
    async insert(data, version) {
      const { data: row, error } = await table()
        .insert({ user_id: userId, data, version })
        .select(COLUMNS)
        .single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) return 'conflict';
        throw new Error(error.message);
      }
      return toRow(row as DbRow);
    },
    async update(expectedRevision, data, version) {
      // Compare-and-set: só grava se a revisão ainda é a que este dispositivo conhece.
      const { data: rows, error } = await table()
        .update({ data, version })
        .eq('user_id', userId)
        .eq('revision', expectedRevision)
        .select(COLUMNS);
      if (error) throw new Error(error.message);
      const [row] = rows as DbRow[];
      return row ? toRow(row) : 'conflict';
    },
  };
}
