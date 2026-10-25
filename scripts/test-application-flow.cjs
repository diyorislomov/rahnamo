const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[trimmed.slice(0, eq).trim()] = v;
    }
  }
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('=== TESTING APPLICATION FLOW (WITH & WITHOUT PHOTO) ===\n');

  const createdIds = [];

  // TEST 1: Submit WITHOUT photo (using User\'s exact test case)
  console.log('Test 1: Submitting application WITHOUT photo (User exact test case)...');
  const payloadWithoutPhoto = {
    full_name: 'Jasurbek Aliyev',
    headline: 'Senior Product Manager at FinTech',
    specialties: 'Boshqa, Agile, Scrums, Tech Roadmaps',
    bio: '10 yildan ortiq vaqt davomida xalqaro fintech kompaniyalarida mahsulot boshqaruvi va jamoalarni boshqarish bo\'yicha faoliyat yuritib kelmoqdaman.',
    telegram: '@jasur_pm',
    email: `jasur.pm.${Date.now()}@example.com`,
    phone: '+998901234567',
    proof_link: 'https://linkedin.com/in/jasur-pm',
    consent_published: new Date().toISOString(),
    expected_standard_price: 120000,
    expected_premium_price: 200000,
    expected_price_per_question: 10000,
    expected_soft_cap: 5,
    photo_url: '',
  };

  const res1 = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadWithoutPhoto),
  });

  const body1 = await res1.json();
  console.log('  Status code:', res1.status);
  console.log('  Response body:', body1);

  if (!res1.ok || !body1.success) {
    throw new Error(`Test 1 failed: ${JSON.stringify(body1)}`);
  }
  createdIds.push(body1.id);
  console.log('  ✓ Test 1 Passed: Successfully submitted application WITHOUT photo! (id: ' + body1.id + ')');

  // Verify status is "pending" and not in counselors
  const { data: dbRow1 } = await supabase.from('counselor_applications').select('*').eq('id', body1.id).single();
  if (dbRow1.status !== 'pending') {
    throw new Error(`Expected status 'pending', got: ${dbRow1.status}`);
  }
  console.log('  ✓ DB Verification: status is "pending", expected_standard_price = ' + dbRow1.expected_standard_price + ', expected_premium_price = ' + dbRow1.expected_premium_price);

  // Verify it does NOT appear in public counselors list
  const { data: publicCheck } = await supabase.from('counselors').select('id').eq('email', payloadWithoutPhoto.email);
  if (publicCheck && publicCheck.length > 0) {
    throw new Error('Application should NOT appear in counselors table before approval!');
  }
  console.log('  ✓ Public Visibility: Application does NOT appear publicly.');

  // TEST 2: Submit WITH photo
  console.log('\nTest 2: Uploading photo to /api/applications/photo and submitting WITH photo...');
  const form = new FormData();
  const sampleJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const blob = new Blob([sampleJpeg], { type: 'image/jpeg' });
  form.append('file', blob, 'avatar.jpg');

  const photoRes = await fetch('http://localhost:3000/api/applications/photo', {
    method: 'POST',
    body: form,
  });
  const photoBody = await photoRes.json();
  console.log('  Photo upload status:', photoRes.status);
  console.log('  Photo upload body:', photoBody);

  if (!photoRes.ok || !photoBody.url) {
    throw new Error(`Photo upload failed: ${JSON.stringify(photoBody)}`);
  }
  console.log('  ✓ Photo uploaded successfully:', photoBody.url);

  const payloadWithPhoto = {
    ...payloadWithoutPhoto,
    email: `jasur.photo.${Date.now()}@example.com`,
    photo_url: photoBody.url,
  };

  const res2 = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadWithPhoto),
  });

  const body2 = await res2.json();
  console.log('  Submit with photo status:', res2.status);
  console.log('  Submit with photo body:', body2);

  if (!res2.ok || !body2.success) {
    throw new Error(`Test 2 failed: ${JSON.stringify(body2)}`);
  }
  createdIds.push(body2.id);
  console.log('  ✓ Test 2 Passed: Successfully submitted application WITH photo! (id: ' + body2.id + ')');

  // Verify photo_url in DB
  const { data: dbRow2 } = await supabase.from('counselor_applications').select('*').eq('id', body2.id).single();
  if (!dbRow2.photo_url) {
    throw new Error('Expected photo_url to be saved in DB!');
  }
  console.log('  ✓ DB Verification: photo_url is stored in DB: ' + dbRow2.photo_url);

  // CLEANUP
  console.log('\nCleaning up test records from database...');
  for (const id of createdIds) {
    await supabase.from('counselor_applications').delete().eq('id', id);
  }
  console.log('  ✓ Cleaned up all test records (' + createdIds.length + ' records).');

  console.log('\n=== ALL END-TO-END TESTS PASSED CLEANLY ===');
}

run().catch((err) => {
  console.error('\nE2E Test Failed:', err);
  process.exit(1);
});
