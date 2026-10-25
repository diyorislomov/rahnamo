const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const MIGRATIONS = [
  {
    id: 'c1',
    newSpecialties: ['study-abroad', 'career-start', 'Residency in Turkey & Germany', 'Clinical Research'],
  },
  {
    id: 'c2',
    newSpecialties: ['design-creative', 'Portfolio Review', 'Freelance & Studio Launch'],
  },
  {
    id: 'c3',
    newSpecialties: ['career-start', 'study-abroad', 'International LL.M.', 'Corporate Law Career'],
  },
  {
    id: 'c4',
    newSpecialties: ['study-abroad', 'Scholarship Essays', 'IELTS & GRE Strategy'],
  },
  {
    id: 'c5',
    newSpecialties: ['trade-logistics', 'business', 'Export Logistics', 'Starting a Business'],
  },
  {
    id: 'c6',
    newSpecialties: ['it-software', 'System Design', 'Tech Interview Prep'],
  },
];

async function run() {
  console.log('Migrating existing mentors specialties in Supabase...');
  for (const m of MIGRATIONS) {
    const { error } = await supabase
      .from('counselors')
      .update({ specialties: m.newSpecialties })
      .eq('id', m.id);
    if (error) {
      console.error(`Failed to update counselor ${m.id}:`, error);
    } else {
      console.log(`Updated counselor ${m.id} -> ${m.newSpecialties[0]} (primary)`);
    }
  }

  // Update existing applications
  console.log('\nMigrating existing applications...');
  const { data: apps } = await supabase.from('counselor_applications').select('id, specialties');
  if (apps) {
    for (const app of apps) {
      if (app.specialties && app.specialties.includes('Engineering & Tech')) {
        const updated = app.specialties.replace('Engineering & Tech', 'it-software');
        await supabase.from('counselor_applications').update({ specialties: updated }).eq('id', app.id);
        console.log(`Updated application ${app.id}: ${updated}`);
      }
    }
  }
  console.log('Specialties migration completed successfully!');
}

run();
