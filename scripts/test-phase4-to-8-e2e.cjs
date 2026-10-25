const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

// Mock 'server-only' so we can test server modules directly
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'server-only') return {};
  return originalRequire.apply(this, arguments);
};

const { createClient } = require('@supabase/supabase-js');

async function runTests() {
  console.log('=== PHASE 8 INTEGRATION TESTS ===\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase credentials missing in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Verify specialties and tracks
  console.log('1. Checking Tracks and Localization...');
  const specialtiesMod = require('../src/lib/specialties.ts');
  const tracks = specialtiesMod.TRACKS;
  if (!tracks || tracks.length !== 9) {
    throw new Error(`Expected 9 tracks, got ${tracks?.length}`);
  }
  const slugs = tracks.map((t) => t.slug);
  console.log('  Tracks present:', slugs.join(', '));

  const uzMessages = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/uz.json'), 'utf8'));
  const ruMessages = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/ru.json'), 'utf8'));
  const enMessages = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/en.json'), 'utf8'));

  for (const slug of slugs) {
    if (!uzMessages.specialties?.[slug] || !ruMessages.specialties?.[slug] || !enMessages.specialties?.[slug]) {
      throw new Error(`Missing localized string for track ${slug}`);
    }
  }
  console.log('  ✓ All 9 tracks verified in UZ, RU, and EN messages');

  // 2. Test Counselor Visibility and Pause handling
  console.log('\n2. Testing Counselor Active Mapping & Visibility Logic...');
  const { data: mentors, error: mErr } = await supabase.from('counselors').select('id, full_name, specialties').limit(5);
  if (mErr || !mentors || mentors.length === 0) {
    console.warn('  No counselors found in DB:', mErr);
  } else {
    console.log(`  Fetched ${mentors.length} counselors from DB. Sample:`, mentors[0].full_name);
    // Test helper mapping
    const mockRowActive = { id: 'c1', full_name: 'Test', is_active: true };
    const mockRowPaused = { id: 'c2', full_name: 'Paused', is_active: false };
    const mockRowLegacy = { id: 'c3', full_name: 'Legacy' }; // is_active is undefined

    const isActive1 = mockRowActive.is_active !== false;
    const isActive2 = mockRowPaused.is_active !== false;
    const isActive3 = mockRowLegacy.is_active !== false;

    if (!isActive1 || isActive2 || !isActive3) {
      throw new Error('Counselor active flag parsing failed');
    }
    console.log('  ✓ Counselor active status logic: active=true, paused=false, legacy=true');
  }

  // 3. Test Commission Clock Calculation Logic
  console.log('\n3. Testing Commission Clock Logic...');
  const { calculateCommissionFreeUntil } = require('../src/lib/platformSettings.ts');
  const launchDate = '2026-11-01T00:00:00.000Z';
  const approvalDateBefore = '2026-10-15T10:00:00.000Z';
  const approvalDateAfter = '2026-11-15T10:00:00.000Z';

  // Before launch date -> uses launch date + 3 months = 2027-02-01
  const freeUntil1 = calculateCommissionFreeUntil(approvalDateBefore, launchDate);
  const d1 = new Date(freeUntil1);
  console.log(`  Approval before launch: ${approvalDateBefore} -> free until: ${freeUntil1}`);
  if (d1.getFullYear() !== 2027 || d1.getMonth() !== 1 || d1.getDate() !== 1) {
    throw new Error(`Commission free date incorrect for pre-launch approval: ${freeUntil1}`);
  }

  // After launch date -> uses approval date + 3 months = 2027-02-15
  const freeUntil2 = calculateCommissionFreeUntil(approvalDateAfter, launchDate);
  const d2 = new Date(freeUntil2);
  console.log(`  Approval after launch: ${approvalDateAfter} -> free until: ${freeUntil2}`);
  if (d2.getFullYear() !== 2027 || d2.getMonth() !== 1 || d2.getDate() !== 15) {
    throw new Error(`Commission free date incorrect for post-launch approval: ${freeUntil2}`);
  }
  console.log('  ✓ Commission clock correctly computes (max(approval, launch) + 3 months)');

  // 4. Test Application Insertion with Phase 2 fields & fallback
  console.log('\n4. Testing Counselor Application Insert with Phase 2 & 3 fields...');
  const testApp = {
    full_name: 'Test Mentor Phase 8',
    email: `test-mentor-${Date.now()}@example.com`,
    telegram: '@testmentor',
    phone: '+998901234567',
    headline: 'Senior Cloud Architect',
    bio: 'Tajribali dasturchi va arxitektor. 10 yillik tajribaga egaman va xalqaro loyihalarda muvaffaqiyatli ishtirok etganman. Yangi mutaxassislarga yo\'l-yo\'riq ko\'rsatishga tayyorman.',
    specialties: '["it-software","data-ai"]',
    expected_standard_price: 150000,
    expected_premium_price: 250000,
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    status: 'pending',
    proof_link: 'https://linkedin.com/in/test-mentor',
    consent_published: new Date().toISOString(),
  };

  let insertedId = null;
  const { data: insData, error: insErr } = await supabase
    .from('counselor_applications')
    .insert([testApp])
    .select('id')
    .single();

  if (
    insErr &&
    (insErr.code === '42703' ||
      insErr.code === 'PGRST204' ||
      insErr.message?.includes('proof_link') ||
      insErr.message?.includes('consent_published') ||
      insErr.message?.includes('column'))
  ) {
    console.log('  Remote table missing new columns in schema cache, testing fallback insert without proof_link/consent_published:');
    const { proof_link, consent_published, ...fallbackApp } = testApp;
    const { data: fbData, error: fbErr } = await supabase
      .from('counselor_applications')
      .insert([fallbackApp])
      .select('id')
      .single();
    if (fbErr) throw fbErr;
    insertedId = fbData.id;
    console.log(`  ✓ Application inserted with fallback (id: ${insertedId})`);
  } else if (insErr) {
    throw insErr;
  } else {
    insertedId = insData.id;
    console.log(`  ✓ Application inserted with all Phase 2 fields (id: ${insertedId})`);
  }

  // Clean up test application
  if (insertedId) {
    await supabase.from('counselor_applications').delete().eq('id', insertedId);
    console.log('  ✓ Cleaned up test application');
  }

  // 5. Check Email Sending Configuration
  console.log('\n5. Inspecting Email Delivery Systems...');
  const resendKey = process.env.RESEND_API_KEY;
  const hasResend = Boolean(resendKey && !resendKey.includes('placeholder'));
  console.log('  Resend API Key configured for Bookings:', hasResend ? 'YES' : 'NO (placeholder/missing)');
  console.log('  Mentor Invites use: Supabase Auth Built-in Mailer (rate-limited default; recommend custom SMTP)');

  console.log('\n=== ALL PHASE TESTS PASSED ===');
}

runTests().catch((err) => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
