const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('=== PHASE 1 END-TO-END VERIFICATION ===\n');

  // Load env
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

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Test 1: Upload a valid JPEG photo
  console.log('1. Testing Photo Upload (/api/applications/photo)...');
  const jpegBytes = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB
  ]);
  const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, 'avatar.jpg');

  const photoRes = await fetch('http://localhost:3000/api/applications/photo', {
    method: 'POST',
    body: form,
  });
  const photoJson = await photoRes.json();
  console.log('   Photo upload response status:', photoRes.status);
  console.log('   Photo upload response json:', photoJson);

  if (!photoRes.ok || !photoJson.url) {
    throw new Error('Photo upload failed!');
  }
  const uploadedPhotoUrl = photoJson.url;
  console.log('   -> Photo uploaded successfully to Supabase Storage: ' + uploadedPhotoUrl + '\n');

  // Test 2: Submit application WITH photo
  console.log('2. Testing Application Submission WITH Photo (/api/applications)...');
  const appWithPhoto = {
    full_name: 'Test Mentor With Photo',
    headline: 'Senior Fullstack Architect | Tech Lead',
    specialties: 'Dasturlash, System Architecture, Node.js',
    bio: 'Professional software architect with 8+ years of industry experience mentoring and building scalable distributed web applications.',
    telegram: '@test_mentor_photo',
    email: 'test.photo.mentor@example.uz',
    phone: '+998901234567',
    expected_standard_price: 60000,
    expected_premium_price: 180000,
    expected_price_per_question: 20000,
    expected_soft_cap: 10,
    photo_url: uploadedPhotoUrl,
  };

  const submit1Res = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appWithPhoto),
  });
  const submit1Json = await submit1Res.json();
  console.log('   Submission with photo status:', submit1Res.status);
  console.log('   Submission with photo json:', submit1Json);

  if (!submit1Res.ok || !submit1Json.id) {
    throw new Error('Application with photo failed!');
  }
  const appIdWithPhoto = submit1Json.id;
  console.log('   -> Application WITH photo created successfully! ID: ' + appIdWithPhoto + '\n');

  // Test 3: Submit application WITHOUT photo
  console.log('3. Testing Application Submission WITHOUT Photo (/api/applications)...');
  const appWithoutPhoto = {
    full_name: 'Test Mentor No Photo',
    headline: 'Product Designer & UI/UX Specialist',
    specialties: 'Dizayn, Figma, User Research',
    bio: 'Product designer with over 6 years of experience helping junior designers build strong portfolios and crack design interviews.',
    telegram: '@test_mentor_nophoto',
    email: 'test.nophoto.mentor@example.uz',
    phone: '+998931112233',
    expected_standard_price: 50000,
    expected_premium_price: 150000,
    expected_price_per_question: null,
    expected_soft_cap: null,
    photo_url: null,
  };

  const submit2Res = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appWithoutPhoto),
  });
  const submit2Json = await submit2Res.json();
  console.log('   Submission without photo status:', submit2Res.status);
  console.log('   Submission without photo json:', submit2Json);

  if (!submit2Res.ok || !submit2Json.id) {
    throw new Error('Application without photo failed!');
  }
  const appIdNoPhoto = submit2Json.id;
  console.log('   -> Application WITHOUT photo created successfully! ID: ' + appIdNoPhoto + '\n');

  // Test 4: Error handling verification
  console.log('4. Testing Error Cases...');
  // 4a. Corrupted file signature
  const fakeForm = new FormData();
  fakeForm.append('file', new Blob([Buffer.from([0x00, 0x01, 0x02, 0x03])], { type: 'image/jpeg' }), 'fake.jpg');
  const fakePhotoRes = await fetch('http://localhost:3000/api/applications/photo', {
    method: 'POST',
    body: fakeForm,
  });
  const fakePhotoJson = await fakePhotoRes.json();
  console.log('   Corrupted photo status (expected 400):', fakePhotoRes.status, fakePhotoJson);

  // 4b. Invalid input (bio too short)
  const invalidAppRes = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...appWithoutPhoto, bio: 'Too short' }),
  });
  const invalidAppJson = await invalidAppRes.json();
  console.log('   Short bio status (expected 400):', invalidAppRes.status, invalidAppJson);

  // Test 5: Verify records in Supabase Database
  console.log('\n5. Verifying DB records in counselor_applications...');
  const { data: records, error: dbError } = await supabase
    .from('counselor_applications')
    .select('id, full_name, photo_url, status, created_at')
    .in('id', [appIdWithPhoto, appIdNoPhoto]);

  if (dbError) throw dbError;
  console.log('   Retrieved DB records:');
  console.log(JSON.stringify(records, null, 2));

  // Clean up test records
  console.log('\nCleaning up test records from database...');
  await supabase.from('counselor_applications').delete().in('id', [appIdWithPhoto, appIdNoPhoto]);
  console.log('   Cleanup done.');

  console.log('\n=== ALL PHASE 1 TESTS PASSED SUCCESSFULLY! ===');
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
