import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const root = new URL('../database/', import.meta.url);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('rahnamo-migrations'))");
  const { rows } = await client.query("SELECT to_regclass('public.users') AS existing");
  if (!rows[0].existing) await client.query(await readFile(new URL('schema.sql', root), 'utf8'));
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const directory = fileURLToPath(new URL('migrations/', root));
  for (const name of (await readdir(directory)).filter((n) => n.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL('migrations/' + name, root), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const previous = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [
      name,
    ]);
    if (previous.rows[0]) {
      if (previous.rows[0].checksum !== checksum)
        throw new Error('Applied migration changed: ' + name);
      continue;
    }
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [
      name,
      checksum,
    ]);
    console.log('Applied ' + name);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
