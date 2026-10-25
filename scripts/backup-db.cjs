const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');

const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
const env = {};
for (const line of lines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  'counselors',
  'counselor_applications',
  'bookings',
  'reviews',
  'profiles',
  'survey_responses',
  'forum_questions',
  'forum_answers',
  'question_threads',
  'thread_messages'
];

async function backup() {
  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of TABLES) {
    try {
      const { data, error } = await sb.from(table).select('*');
      if (error) {
        console.warn(`Warning for table ${table}:`, error.message);
        backupData.tables[table] = { error: error.message };
      } else {
        backupData.tables[table] = data;
        console.log(`Backed up ${table}: ${data.length} records`);
      }
    } catch (err) {
      console.warn(`Failed table ${table}:`, err.message);
    }
  }

  const backupDir = path.join(root, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const dest = path.join(backupDir, filename);
  fs.writeFileSync(dest, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\nDatabase backup successfully saved to: ${dest}`);
}

backup().catch(console.error);
