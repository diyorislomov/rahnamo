import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const currentDir = dirname(fileURLToPath(import.meta.url));
const schema = await readFile(resolve(currentDir, '../database/schema.sql'), 'utf8');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(schema);
  console.log('Database schema applied successfully.');
} finally {
  await pool.end();
}

