const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');
    await client.query('BEGIN');

    // 1. counselor_applications enhancements
    console.log('1. Adding proof_link and consent_published to counselor_applications...');
    await client.query(`
      ALTER TABLE public.counselor_applications 
      ADD COLUMN IF NOT EXISTS proof_link TEXT;

      ALTER TABLE public.counselor_applications 
      ADD COLUMN IF NOT EXISTS consent_published TIMESTAMP WITH TIME ZONE;
    `);

    // 2. counselors is_active for Phase 4
    console.log('2. Adding is_active to counselors...');
    await client.query(`
      ALTER TABLE public.counselors 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    `);

    // 3. platform_settings table for Phase 6 (global launch date & commission settings)
    console.log('3. Creating platform_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.platform_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      INSERT INTO public.platform_settings (key, value)
      VALUES ('global_launch_date', '"2026-11-01T00:00:00.000Z"'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('Migrations completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
