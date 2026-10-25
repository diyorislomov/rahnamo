import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import pg from 'pg';
import imageFixtures from '../tests/fixtures/upload-images.json' with { type: 'json' };

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3102';
const dbUrl = new URL(process.env.DATABASE_URL);
assert(
  /_(ci|test)$/.test(dbUrl.pathname),
  'Integration tests require a disposable _ci or _test database',
);
assert(
  ['127.0.0.1', 'localhost'].includes(new URL(base).hostname),
  'Integration tests require a loopback app',
);
const db = new pg.Client({ connectionString: dbUrl.toString() });
await db.connect();
let checks = 0;
async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: process.env.NEXT_PUBLIC_SITE_URL || base,
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}
const expectStatus = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.data));
  checks++;
  return result.data;
};
const cookieFrom = (response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
const uploadOrigins = [process.env.NEXT_PUBLIC_SITE_URL || base];
if (uploadOrigins[0] === 'https://myrahnamo.com') uploadOrigins.push('https://www.myrahnamo.com');
if (uploadOrigins[0] === 'https://www.myrahnamo.com') uploadOrigins.push('https://myrahnamo.com');
async function checkPhotoUploads(route, cookie) {
  let uploaded;
  for (const origin of uploadOrigins) {
    for (const fixture of imageFixtures) {
      const bytes = Buffer.from(fixture.base64, 'base64');
      const form = new FormData();
      form.set('file', new File([bytes], 'photo.' + fixture.format, { type: fixture.mime }));
      uploaded = expectStatus(await request(route, {
        method: 'POST', body: form, cookie, headers: { Origin: origin },
      }), 200);
      assert.match(uploaded.url, /^\/api\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/);
      const image = await fetch(base + uploaded.url);
      assert.equal(image.status, 200);
      assert.equal(image.headers.get('content-type'), fixture.mime);
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
      checks++;
    }
  }
  expectStatus(await request(route, {
    method: 'POST', body: new FormData(), cookie,
    headers: { Origin: 'https://myrahnamo.com.evil.example' },
  }), 403);
  return uploaded;
}
const suffix = randomUUID();
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base + '/api/build-version')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  expectStatus(await request('/api/admin/overview'), 401);
  expectStatus(await request('/api/admin/users'), 401);
  expectStatus(await request('/api/mentor/profile'), 401);
  const admin = await request('/api/admin/login', {
    method: 'POST',
    body: { password: process.env.ADMIN_PASSWORD },
  });
  expectStatus(admin, 200);
  const adminCookie = cookieFrom(admin.response);
  assert(adminCookie);
  // Use the encoded cookie exactly as issued by the real login endpoint.
  expectStatus(await request('/api/admin/users', { cookie: adminCookie }), 200);
  expectStatus(await request('/api/admin/users', { cookie: 'locale=uz; ' + adminCookie }), 200);
  expectStatus(await request('/api/admin/users', { cookie: 'rahnamo_admin_session=invalid' }), 401);
  expectStatus(await request('/api/admin/users', { method: 'POST', body: {} }), 401);
  expectStatus(await request('/api/admin/users', { method: 'POST', body: {}, cookie: adminCookie }), 400);

  // Isolate failed-login checks from the other HTTP tests and real clients.
  const loginHeaders = { 'X-Forwarded-For': '192.0.2.19' };
  const loginKey = 'admin-login:192.0.2.19';
  const tryAdminLogin = (password) => request('/api/admin/login', {
    method: 'POST', body: { password }, headers: loginHeaders,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    expectStatus(await tryAdminLogin('incorrect'), 401);
  }
  expectStatus(await tryAdminLogin(process.env.ADMIN_PASSWORD), 200);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM api_rate_limits WHERE key=$1', [loginKey])).rows[0].count, 0);
  checks++;
  for (let attempt = 0; attempt < 10; attempt++) {
    expectStatus(await tryAdminLogin('incorrect'), 401);
  }
  const limitedLogin = await tryAdminLogin(process.env.ADMIN_PASSWORD);
  expectStatus(limitedLogin, 429);
  const retryAfter = Number(limitedLogin.response.headers.get('retry-after'));
  assert(retryAfter > 0 && retryAfter <= 900);
  assert.equal(limitedLogin.data.retryAfterSeconds, retryAfter);
  assert.equal(limitedLogin.data.error, 'rate_limited');
  checks++;
  // An expired database window must allow login without restarting the app.
  await db.query("UPDATE api_rate_limits SET reset_at=now()-interval '1 second' WHERE key=$1", [loginKey]);
  expectStatus(await tryAdminLogin(process.env.ADMIN_PASSWORD), 200);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM api_rate_limits WHERE key=$1', [loginKey])).rows[0].count, 0);
  checks++;

  expectStatus(await request('/api/mentor/photo', { method: 'POST', body: new FormData() }), 401);
  const uploaded = await checkPhotoUploads('/api/applications/photo');
  const badForm = new FormData();
  badForm.set('file', new File(['<script>alert(1)</script>'], 'bad.png', { type: 'image/png' }));
  expectStatus(await request('/api/applications/photo', { method: 'POST', body: badForm }), 400);
  const application = {
    full_name: 'Integration Mentor',
    headline: 'Software engineering mentor',
    specialties: 'it-software',
    bio: 'Professional experience in software development, mentoring students, reviewing portfolios, and helping people prepare for their first engineering role.',
    telegram: 'integration_mentor',
    email: `mentor-${suffix}@example.test`,
    phone: '+998900000000',
    photo_url: uploaded.url,
    proof_link: 'https://example.test/proof',
    consent_published: new Date().toISOString(),
    expected_standard_price: 45000,
    expected_premium_price: 130000,
    expected_price_per_question: 10000,
    expected_soft_cap: 3,
  };
  const saved = expectStatus(
    await request('/api/applications', { method: 'POST', body: application }),
    200,
  );
  assert.equal(
    (
      await db.query('SELECT count(*)::int AS count FROM counselor_applications WHERE id=$1', [
        saved.id,
      ])
    ).rows[0].count,
    1,
  );
  const approved = expectStatus(
    await request('/api/admin/approve-application', {
      method: 'POST',
      cookie: adminCookie,
      body: { applicationId: saved.id },
    }),
    200,
  );
  const counselorId = approved.counselorId;
  const token = new URLSearchParams(new URL(approved.activationUrl).hash.slice(1)).get('token');
  assert(token);
  expectStatus(
    await request('/api/admin/approve-application', {
      method: 'POST',
      cookie: adminCookie,
      body: { applicationId: saved.id },
    }),
    404,
  );
  const password = 'Local-mentor-passphrase-2026';
  expectStatus(
    await request('/api/mentor/password', { method: 'POST', body: { token, password: 'short' } }),
    400,
  );
  const activated = await request('/api/mentor/password', {
    method: 'POST',
    body: { token, password },
  });
  expectStatus(activated, 200);
  let mentorCookie = cookieFrom(activated.response);
  assert.match(activated.response.headers.get('set-cookie'), /HttpOnly/i);
  expectStatus(
    await request('/api/mentor/password', { method: 'POST', body: { token, password } }),
    400,
  );
  expectStatus(
    await request('/api/mentor/session', {
      method: 'POST',
      body: { email: application.email, password: 'incorrect' },
    }),
    401,
  );
  const login = await request('/api/mentor/session', {
    method: 'POST',
    body: { email: application.email, password },
  });
  expectStatus(login, 200);
  mentorCookie = cookieFrom(login.response);
  const mentorPhoto = await checkPhotoUploads('/api/mentor/photo', mentorCookie);
  const slot = new Date(Date.now() + 2 * 86400000).toISOString();
  const profile = expectStatus(
    await request('/api/mentor/profile', { cookie: mentorCookie }),
    200,
  ).counselor;
  expectStatus(
    await request('/api/mentor/profile', {
      method: 'POST',
      cookie: mentorCookie,
      body: {
        ...profile,
        avatar_url: mentorPhoto.url,
        headline: 'Updated local mentor',
        available_slots: [slot],
        counselorId: 'somebody-else',
      },
    }),
    200,
  );
  assert.equal(expectStatus(await request('/api/mentor/profile', { cookie: mentorCookie }), 200).counselor.avatar_url, mentorPhoto.url);
  expectStatus(
    await request('/api/mentor/profile', {
      method: 'POST',
      cookie: mentorCookie,
      headers: { Origin: 'https://evil.example' },
      body: profile,
    }),
    403,
  );
  const catalog = expectStatus(await request('/api/counselors'), 200).counselors;
  assert(catalog.some((c) => c.id === counselorId));
  assert(catalog.every((c) => !('email' in c) && !('password_hash' in c) && !('invite_hash' in c)));
  assert.equal(
    expectStatus(await request('/api/counselors?id=' + encodeURIComponent("' OR true --")), 200)
      .counselors.length,
    0,
  );
  const question = expectStatus(
    await request('/api/forum/questions', {
      method: 'POST',
      body: {
        name: 'Test learner',
        email: 'learner@example.test',
        category: 'it-software',
        title: 'How do I start a software career?',
        body: 'What should I study to begin a software engineering career?',
        isAnonymous: false,
      },
    }),
    201,
  ).question;
  assert(!('email' in question));
  expectStatus(
    await request('/api/forum/answer', {
      method: 'POST',
      body: { questionId: question.id, body: 'Start with a small project.' },
    }),
    401,
  );
  expectStatus(
    await request('/api/forum/answer', {
      method: 'POST',
      cookie: mentorCookie,
      body: { questionId: question.id, body: 'Start with a small project.' },
    }),
    201,
  );
  const forum = expectStatus(await request('/api/forum/questions'), 200);
  assert(forum.questions.every((q) => !('email' in q)));
  assert(forum.answers.some((a) => a.question_id === question.id));
  expectStatus(
    await request('/api/survey', {
      method: 'POST',
      body: {
        interested_in_service: 'yes',
        contact_info: 'test@example.test',
        willing_to_refer: true,
      },
    }),
    200,
  );
  const tracks = expectStatus(await request('/api/tracks'), 200);
  assert.equal(tracks.tracks.length, 9);
  expectStatus(
    await request('/api/admin/tracks', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'toggle_active', slug: 'it-software', is_active: false },
    }),
    200,
  );
  assert.equal(expectStatus(await request('/api/tracks'), 200).tracks.length, 8);
  expectStatus(
    await request('/api/admin/tracks', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'toggle_active', slug: 'it-software', is_active: true },
    }),
    200,
  );
  const userId = randomUUID(),
    otherId = randomUUID(),
    sessionToken = randomUUID(),
    otherToken = randomUUID();
  await db.query('INSERT INTO users(id,name,email) VALUES($1,$2,$3),($4,$5,$6)', [
    userId,
    'Test learner',
    `student-${suffix}@example.test`,
    otherId,
    'Other learner',
    `other-${suffix}@example.test`,
  ]);
  await db.query(
    'INSERT INTO sessions("userId",expires,"sessionToken") VALUES($1,now()+interval \'1 hour\',$2),($3,now()+interval \'1 hour\',$4)',
    [userId, sessionToken, otherId, otherToken],
  );
  const studentCookie = `authjs.session-token=${sessionToken}; __Secure-authjs.session-token=${sessionToken}`;
  const otherCookie = `authjs.session-token=${otherToken}; __Secure-authjs.session-token=${otherToken}`;
  expectStatus(await request('/api/profile', { cookie: studentCookie }), 200);
  expectStatus(
    await request('/api/profile', {
      method: 'POST',
      cookie: studentCookie,
      body: {
        name: 'Local learner',
        education_stage: 'university',
        privacy_consent: true,
        region: 'Tashkent',
        goal: 'First engineering job',
        locale: 'uz',
      },
    }),
    200,
  );
  assert.equal(
    (await db.query('SELECT region FROM profiles WHERE id=$1', [userId])).rows[0].region,
    'Tashkent',
  );
  const bookingPayload = {
    counselorId,
    tier: 'standard',
    paymentMethod: 'payme',
    slot,
    studentName: 'Test learner',
    email: `student-${suffix}@example.test`,
    telegram: 'test_learner',
    educationStage: 'university',
    question: 'How can I prepare for an engineering interview?',
    paymentReceipt: 'integration-receipt',
    privacyConsent: true,
    locale: 'uz',
  };
  const booking = expectStatus(
    await request('/api/bookings', { method: 'POST', cookie: studentCookie, body: bookingPayload }),
    200,
  ).booking;
  assert.equal(
    (await db.query('SELECT privacy_consent FROM bookings WHERE id=$1', [booking.id])).rows[0]
      .privacy_consent,
    true,
  );
  expectStatus(
    await request('/api/bookings', { method: 'POST', cookie: studentCookie, body: bookingPayload }),
    409,
  );
  assert.equal(
    expectStatus(await request('/api/bookings', { cookie: otherCookie }), 200).bookings.length,
    0,
  );
  expectStatus(
    await request('/api/bookings', {
      method: 'PATCH',
      cookie: otherCookie,
      body: { id: booking.id, action: 'cancel' },
    }),
    409,
  );
  const thread = expectStatus(
    await request('/api/threads/start', {
      method: 'POST',
      cookie: studentCookie,
      body: { counselorId, paymentMethod: 'card' },
    }),
    201,
  ).thread;
  expectStatus(
    await request('/api/threads/reply', {
      method: 'POST', cookie: mentorCookie,
      body: { threadId: thread.id, body: 'Payment must be confirmed first.' },
    }),
    403,
  );
  expectStatus(
    await request('/api/admin/threads', {
      method: 'POST', cookie: adminCookie,
      body: {
        action: 'confirm_payment', threadId: thread.id,
        bankReference: 'disposable-integration-test',
        confirmedAmount: thread.questions_paid * thread.price_per_question,
      },
    }),
    200,
  );
  expectStatus(
    await request('/api/threads/reply', {
      method: 'POST',
      cookie: mentorCookie,
      body: { threadId: thread.id, body: 'Welcome to your local mentoring session.' },
    }),
    200,
  );
  const secondMentor = 'c-' + randomUUID(),
    secondAccount = randomUUID(),
    secondToken = randomBytes(32).toString('hex');
  await db.query(
    "INSERT INTO counselors(id,full_name,headline,avatar_url,bio) VALUES($1,'Other mentor','Other mentor',$2,'Other mentor bio')",
    [secondMentor, uploaded.url],
  );
  await db.query('INSERT INTO mentor_accounts(id,counselor_id,email) VALUES($1,$2,$3)', [
    secondAccount,
    secondMentor,
    `second-${suffix}@example.test`,
  ]);
  await db.query(
    "INSERT INTO mentor_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
    [createHash('sha256').update(secondToken).digest('hex'), secondAccount],
  );
  expectStatus(
    await request('/api/threads/reply', {
      method: 'POST',
      cookie: 'rahnamo_mentor_session=' + secondToken,
      body: { threadId: thread.id, body: 'Cannot impersonate the other mentor.' },
    }),
    403,
  );
  assert.equal(
    expectStatus(
      await request('/api/threads/mentor-view', {
        method: 'POST',
        cookie: 'rahnamo_mentor_session=' + secondToken,
      }),
      200,
    ).threads.length,
    0,
  );
  expectStatus(
    await request('/api/admin/counselors', {
      method: 'POST',
      cookie: adminCookie,
      body: { id: counselorId, action: 'toggle_active', is_active: false },
    }),
    200,
  );
  assert(
    !expectStatus(await request('/api/counselors'), 200).counselors.some(
      (c) => c.id === counselorId,
    ),
  );
  expectStatus(
    await request('/api/admin/counselors', {
      method: 'POST',
      cookie: adminCookie,
      body: { id: counselorId, action: 'toggle_active', is_active: true },
    }),
    200,
  );
  expectStatus(await request('/api/profile', { method: 'DELETE', cookie: studentCookie }), 200);
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM bookings WHERE id=$1', [booking.id]))
      .rows[0].count,
    1,
  );
  assert.equal(
    (await db.query('SELECT email FROM bookings WHERE id=$1', [booking.id])).rows[0].email,
    '',
  );
  expectStatus(await request('/api/profile', { cookie: studentCookie }), 401);
  expectStatus(
    await request('/api/mentor/session', { method: 'DELETE', cookie: mentorCookie }),
    200,
  );
  expectStatus(await request('/api/mentor/profile', { cookie: mentorCookie }), 401);
  expectStatus(
    await request('/api/admin/mentor-access', {
      method: 'POST',
      body: { id: counselorId, email: application.email },
    }),
    401,
  );
  const renewal = expectStatus(
    await request('/api/admin/mentor-access', {
      method: 'POST',
      cookie: adminCookie,
      body: { id: counselorId, email: application.email },
    }),
    200,
  );
  assert(new URL(renewal.activationUrl).hash.includes('token='));
  console.log(`Local platform integration: ${checks} HTTP/data checks passed`);
} finally {
  await db.end();
}
