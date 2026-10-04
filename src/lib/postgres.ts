import 'server-only';

import { Pool } from 'pg';

const globalForPostgres = globalThis as unknown as { rahnamoPool?: Pool };

export const postgres =
  globalForPostgres.rahnamoPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== 'production') globalForPostgres.rahnamoPool = postgres;

