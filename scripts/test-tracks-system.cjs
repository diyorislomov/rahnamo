const fs = require('fs');
const path = require('path');

// Manually parse .env.local
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

async function runTests() {
  console.log('=== TRACKS & APPLICATION VALIDATION TESTS ===\n');

  // 1. Verify GET /api/tracks
  console.log('1. Testing Public GET /api/tracks...');
  const resTracks = await fetch('http://localhost:3000/api/tracks');
  const tracksBody = await resTracks.json();
  console.log('  Status:', resTracks.status);
  console.log('  Active tracks count:', tracksBody.tracks?.length);
  if (!resTracks.ok || !tracksBody.success || tracksBody.tracks?.length !== 9) {
    throw new Error(`Expected 9 active launch tracks, got: ${tracksBody.tracks?.length}`);
  }
  const slugs = tracksBody.tracks.map((t) => t.slug);
  console.log('  Active track slugs:', slugs.join(', '));
  console.log('  ✓ Verified 9 active launch tracks returned publicly.');

  // 2. Verify Validation: Rejection of short bio (< 100 chars)
  console.log('\n2. Testing Form Validation: Short bio (e.g. "Bsbs sbs...")...');
  const shortBioPayload = {
    full_name: 'Short Bio Test',
    headline: 'Software Engineer',
    specialties: 'it-software',
    bio: 'Bsbs sbs...', // Only 11 chars!
    telegram: '@shortbio',
    email: 'shortbio@example.com',
    phone: '+998901234567',
    proof_link: 'https://linkedin.com/in/shortbio',
    consent_published: new Date().toISOString(),
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  };

  const resBio = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shortBioPayload),
  });
  const bodyBio = await resBio.json();
  console.log('  Status (expected 400):', resBio.status);
  console.log('  Failed fields:', bodyBio.failedFields);
  if (resBio.status !== 400 || !bodyBio.failedFields?.includes('bio')) {
    throw new Error('Server failed to reject short bio < 100 characters!');
  }
  console.log('  ✓ Short bio correctly rejected with 400 and failedFields: ["bio"].');

  // 3. Verify Validation: Rejection of missing photo
  console.log('\n3. Testing Form Validation: Missing photo...');
  const missingPhotoPayload = {
    ...shortBioPayload,
    bio: 'Tajribali dasturchi va arxitektor. 10 yillik tajribaga egaman va xalqaro loyihalarda muvaffaqiyatli ishtirok etganman. Yangi mutaxassislarga yo\'l-yo\'riq ko\'rsatishga tayyorman.',
    photo_url: '',
  };
  const resPhoto = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(missingPhotoPayload),
  });
  const bodyPhoto = await resPhoto.json();
  console.log('  Status (expected 400):', resPhoto.status);
  console.log('  Failed fields:', bodyPhoto.failedFields);
  if (resPhoto.status !== 400 || !bodyPhoto.failedFields?.includes('photo_url')) {
    throw new Error('Server failed to reject missing photo!');
  }
  console.log('  ✓ Missing photo correctly rejected with 400 and failedFields: ["photo_url"].');

  // 4. Verify Validation: Rejection of missing proof link
  console.log('\n4. Testing Form Validation: Missing proof link...');
  const missingProofPayload = {
    ...missingPhotoPayload,
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    proof_link: '',
  };
  const resProof = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(missingProofPayload),
  });
  const bodyProof = await resProof.json();
  console.log('  Status (expected 400):', resProof.status);
  console.log('  Failed fields:', bodyProof.failedFields);
  if (resProof.status !== 400 || !bodyProof.failedFields?.includes('proof_link')) {
    throw new Error('Server failed to reject missing proof link!');
  }
  console.log('  ✓ Missing proof link correctly rejected with 400 and failedFields: ["proof_link"].');

  // 5. Verify Full Valid Submission
  console.log('\n5. Testing Full Valid Submission with photo, proof link, consent, 100+ char bio...');
  const validPayload = {
    ...missingProofPayload,
    proof_link: 'https://linkedin.com/in/full-valid-test',
    email: `valid.mentor.${Date.now()}@example.com`,
  };
  const resValid = await fetch('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload),
  });
  const bodyValid = await resValid.json();
  console.log('  Status (expected 200):', resValid.status);
  console.log('  Response body:', bodyValid);
  if (!resValid.ok || !bodyValid.success) {
    throw new Error(`Valid submission failed: ${JSON.stringify(bodyValid)}`);
  }
  console.log('  ✓ Full valid submission succeeded! ID: ' + bodyValid.id);

  // Clean up
  await supabase.from('counselor_applications').delete().eq('id', bodyValid.id);
  console.log('  ✓ Cleaned up test application record.');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
