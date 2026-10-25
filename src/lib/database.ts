import 'server-only';
import type { QueryResultRow } from 'pg';
import { postgres } from './postgres';

// SQL and identifiers come only from server code; values always use parameters.
export async function rows<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  try {
    const result = await postgres.query<T>(sql, values);
    return { data: result.rows, error: null };
  } catch (error) {
    console.error('[DATABASE_QUERY_FAILED]', error instanceof Error ? error.message : 'unknown');
    return { data: null, error: { message: 'Database operation failed' } };
  }
}
export async function one<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  const result = await rows<T>(sql, values);
  return { data: result.data?.[0] ?? null, error: result.error };
}
function identifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid SQL identifier');
  return '"' + value + '"';
}
export async function insertRow(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  return one(
    `INSERT INTO ${identifier(table)} (${keys.map(identifier).join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
    Object.values(row),
  );
}
export async function updateRow(table: string, id: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  return one(
    `UPDATE ${identifier(table)} SET ${keys.map((key, i) => identifier(key) + '=$' + (i + 1)).join(',')} WHERE id=$${keys.length + 1} RETURNING *`,
    [...Object.values(row), id],
  );
}
