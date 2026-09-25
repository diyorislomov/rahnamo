/* eslint-disable @typescript-eslint/no-require-imports -- Runs directly in Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const studentId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
const bookingId = '00000000-0000-4000-8000-000000000003';
const nextServer = {
  NextResponse: { json(body, init = {}) { return new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...init.headers } }); } },
};

// Load actual route/helper code. Only framework boundaries and external I/O are mocked.
function sourceLoader(mocks = {}, options = {}) {
  const cache = new Map();
  const load = (relativePath) => {
    const filename = path.join(root, relativePath);
    if (cache.has(filename)) return cache.get(filename);
    const sessionModule = { exports: {} };
    cache.set(filename, sessionModule.exports);
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, { fileName: filename, compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
    } }).outputText;
    vm.runInNewContext(compiled, {
      module: sessionModule, exports: sessionModule.exports, Buffer, URL, Request, Response, Headers, AbortSignal,
      process: { env: { SESSION_SECRET: 'test-only-session-secret', ...options.env } },
      console: { error() {}, warn() {}, log() {} },
      fetch: options.fetch || (() => { throw new Error('Unexpected network request in test'); }),
      require(specifier) {
        if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
        if (specifier === 'server-only') return {};
        if (specifier === 'next/server') return nextServer;
        if (specifier === 'next/headers') return { cookies: async () => ({ get: () => undefined }) };
        if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
        if (specifier.startsWith('@/')) return load(`src/${specifier.slice(2)}.ts`);
        throw new Error(`Unexpected dependency in ${relativePath}: ${specifier}`);
      },
    }, { filename, timeout: 1000 });
    cache.set(filename, sessionModule.exports);
    return sessionModule.exports;
  };
  return load;
}

function bookingHarness(options = {}) {
  const events = [];
  const rows = new Map();
  const notifications = [];
  if (options.existing) rows.set(options.existing.id, options.existing);
  const counselor = {
    id: 'live-mentor', full_name: 'Live Mentor', headline: 'Career guidance', avatar_url: '/mentor.png',
    standard_price: 45000, premium_price: 90000, available_slots: ['Monday 10:00'],
    ...options.counselor,
  };
  const db = {
    auth: { async getUser(token) {
      events.push('authenticate');
      return token === 'valid-student-token' && !options.invalidAuth
        ? { data: { user: { id: studentId } }, error: null }
        : { data: { user: null }, error: { message: 'Invalid token' } };
    } },
    async rpc(name) {
      assert.equal(name, 'consume_api_limit');
      events.push('rate-limit');
      return { data: !options.rateLimited, error: null };
    },
    from(table) {
      let action = 'select';
      let payload;
      const filters = {};
      const execute = async () => {
        events.push(`${action}:${table}`);
        if (action === 'insert') {
          assert.equal(table, 'bookings');
          if (options.insertError) return { data: null, error: { code: 'XX001', message: 'Private database failure details' } };
          const stored = { ...payload, created_at: '2026-09-25T12:00:00Z' };
          rows.set(stored.id, stored);
          events.push('booking-persisted');
          return { data: stored, error: null };
        }
        if (table === 'bookings') {
          const found = rows.get(filters.id);
          return { data: found && Object.entries(filters).every(([key, value]) => found[key] === value) ? found : null, error: null };
        }
        assert.equal(table, 'counselors');
        return { data: !options.missingCounselor && filters.id === counselor.id ? counselor : null, error: null };
      };
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        insert(value) { action = 'insert'; payload = value; return query; },
        maybeSingle: execute,
        single: execute,
        then(resolve, reject) { return execute().then(resolve, reject); },
      };
      return query;
    },
  };
  const load = sourceLoader({
    '@/lib/supabaseServiceRole': { getServiceRoleClient: () => db },
    '@/lib/server/bookingNotifications': { async notifyBooking(row, kind) {
      events.push('notify');
      assert.ok(rows.has(row.id), 'The booking must exist before any notification');
      notifications.push({ row, kind });
      return !options.notificationFailure;
    } },
  });
  return { route: load('src/app/api/bookings/route.ts'), events, rows, notifications, load };
}

function bookingRequest(overrides = {}, headers = {}) {
  return new Request('https://rahnamo.example/api/bookings', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer valid-student-token', ...headers },
    body: JSON.stringify({
      id: bookingId, counselorId: 'live-mentor', slot: 'Monday 10:00', tier: 'standard', studentName: 'Test Student',
      email: 'student@example.test', phone: '', telegram: '', education: '', question: 'Which career path should I consider?',
      paymentMethod: 'payme', paymentReceipt: 'receipt-123', locale: 'en', ...overrides,
    }),
  });
}

test('Booking route rejects missing/invalid authentication and cross-origin requests before any write', async () => {
  const harness = bookingHarness();
  const missing = await harness.route.POST(bookingRequest({}, { authorization: '' }));
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).error, 'unauthorized');
  const invalid = await harness.route.POST(bookingRequest({}, { authorization: 'Bearer forged-token' }));
  assert.equal(invalid.status, 401);
  const external = await harness.route.POST(bookingRequest({}, { origin: 'https://attacker.example' }));
  assert.equal(external.status, 403);
  assert.equal(harness.rows.size, 0);
  assert.equal(harness.notifications.length, 0);
  assert.equal(harness.events.includes('insert:bookings'), false);
});

test('Booking saves authoritative mentor price, ownership, pending status and receipt before notification', async () => {
  const harness = bookingHarness();
  const response = await harness.route.POST(bookingRequest({ tier: 'premium', price: 1, student_auth_id: otherId,
    counselorName: 'Forged Mentor', meet_link: 'https://attacker.example', payment_status: 'confirmed', paymentReceipt: '  real-reference  ',
  }));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.booking.price, 90000);
  assert.equal(body.booking.counselor_name, 'Live Mentor');
  assert.equal(body.booking.student_auth_id, studentId);
  assert.equal(body.booking.payment_status, 'pending');
  assert.equal(body.booking.meet_link, null);
  assert.equal(body.booking.payment_receipt, 'real-reference');
  assert.equal(body.booking.locale, 'en');
  assert.equal(harness.notifications.length, 1);
  assert.equal(harness.notifications[0].kind, 'booking_created');
  assert.ok(harness.events.indexOf('booking-persisted') < harness.events.indexOf('notify'));
});

test('Failed booking persistence returns an error and sends no notification', async () => {
  const harness = bookingHarness({ insertError: true });
  const response = await harness.route.POST(bookingRequest());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { success: false, error: 'service_unavailable' });
  assert.equal(harness.rows.size, 0);
  assert.equal(harness.notifications.length, 0);
});

test('Booking retry returns the saved record without a second insert or notification', async () => {
  const harness = bookingHarness();
  const first = await harness.route.POST(bookingRequest());
  const second = await harness.route.POST(bookingRequest());
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.deepEqual((await second.json()).booking, (await first.json()).booking);
  assert.equal(harness.events.filter((event) => event === 'insert:bookings').length, 1);
  assert.equal(harness.notifications.length, 1);
});

test('A booking ID cannot be reused for another student, counselor, tier or slot', async () => {
  for (const override of [{ student_auth_id: otherId }, { counselor_id: 'different-mentor' }, { tier: 'premium' }, { slot: 'Other time' }]) {
    const harness = bookingHarness({ existing: { id: bookingId, student_auth_id: studentId, counselor_id: 'live-mentor', tier: 'standard', slot: 'Monday 10:00', ...override } });
    const response = await harness.route.POST(bookingRequest());
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, 'idempotency_conflict');
    assert.equal(harness.notifications.length, 0);
    assert.equal(harness.events.includes('insert:bookings'), false);
  }
});

test('Unavailable slots, invalid live prices and rate limits prevent booking writes', async () => {
  for (const [options, body, expected] of [
    [{}, { slot: 'Invented time' }, 409],
    [{ counselor: { standard_price: -1 } }, {}, 409],
    [{ missingCounselor: true }, {}, 404],
    [{ rateLimited: true }, {}, 429],
  ]) {
    const harness = bookingHarness(options);
    const response = await harness.route.POST(bookingRequest(body));
    assert.equal(response.status, expected);
    assert.equal(harness.rows.size, 0);
    assert.equal(harness.notifications.length, 0);
  }
});

test('Notification failure is a warning after a successfully saved booking', async () => {
  const harness = bookingHarness({ notificationFailure: true });
  const response = await harness.route.POST(bookingRequest());
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.warning, 'notification_unavailable');
  assert.equal(harness.rows.size, 1);
});

test('Legacy public email route is disabled with 410', async () => {
  const route = sourceLoader()('src/app/api/send-email/route.ts');
  const response = await route.POST();
  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), { success: false, error: 'use_booking_workflow' });
});

function emailHarness(options = {}) {
  const deliveries = [];
  const translationRequests = [];
  const load = sourceLoader({ 'next-intl/server': { async getTranslations(request) {
    translationRequests.push(request);
    return (key, values) => `${request.namespace}.${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`;
  } } }, {
    env: { RESEND_API_KEY: 'test-only-resend-key', ...options.env },
    async fetch(url, init) {
      deliveries.push({ url, init, body: JSON.parse(init.body) });
      return new Response('{}', { status: options.status || 200 });
    },
  });
  return { send: load('src/lib/bookingEmail.ts').sendBookingEmail, deliveries, translationRequests };
}

const emailInput = {
  id: bookingId, studentName: 'Student', counselorName: 'Mentor', tier: 'standard', price: 45000,
  slot: 'Monday 10:00', email: 'student@example.test', paymentMethod: 'payme', locale: 'ru',
};

test('Booking email escapes submitted HTML, uses stored locale and never includes a pending meeting link', async () => {
  const harness = emailHarness();
  const success = await harness.send({ ...emailInput, kind: 'booking_created',
    studentName: '<img src=x onerror="alert(1)">', counselorName: '<script>alert(1)</script>', slot: 'Monday <b>& "soon"</b>',
    meetLink: 'https://meet.jit.si/should-still-be-hidden',
  });
  assert.equal(success, true);
  const message = harness.deliveries[0];
  assert.equal(message.url, 'https://api.resend.com/emails');
  assert.match(message.body.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(message.body.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(message.body.html, /&amp; &quot;soon&quot;/);
  assert.doesNotMatch(message.body.html, /<img|<script|should-still-be-hidden/i);
  assert.ok(harness.translationRequests.every((request) => request.locale === 'ru'));
  assert.equal(message.init.headers['Idempotency-Key'], `rahnamo/booking_created/${bookingId}`);
});

test('Payment email rejects external, deceptive and non-HTTPS meeting URLs without sending', async () => {
  const harness = emailHarness();
  for (const meetLink of ['https://attacker.example/meeting', 'https://meet.jit.si.attacker.example/meeting', 'https://meet.jit.si@attacker.example/meeting', 'http://meet.jit.si/meeting', 'javascript:alert(1)', '']) {
    assert.equal(await harness.send({ ...emailInput, kind: 'payment_confirmed', meetLink }), false);
  }
  assert.equal(harness.deliveries.length, 0);
  const valid = 'https://meet.jit.si/rahnamo-00000000-0000-4000-8000-000000000010';
  assert.equal(await harness.send({ ...emailInput, kind: 'payment_confirmed', meetLink: valid }), true);
  assert.ok(harness.deliveries[0].body.html.includes(`href="${valid}"`));
});

test('Email provider rejection and missing configuration produce failure without a fake success', async () => {
  const failed = emailHarness({ status: 403 });
  assert.equal(await failed.send(emailInput), false);
  const missing = emailHarness({ env: { RESEND_API_KEY: '' } });
  assert.equal(await missing.send(emailInput), false);
  assert.equal(missing.deliveries.length, 0);
});

test('Mentor credentials are scoped to one counselor and rate limits apply even to a valid credential', async () => {
  let limited = false;
  const calls = [];
  const db = { async rpc(name, args) { calls.push({ name, args }); return { data: !limited, error: null }; } };
  const load = sourceLoader({ '@/lib/supabaseServiceRole': { getServiceRoleClient: () => db } }, {
    env: { COUNSELOR_PASSCODES: JSON.stringify({ first: 'mentor-one-unique-secret', second: 'mentor-two-unique-secret' }) },
  });
  const { requireMentor } = load('src/lib/server/http.ts');
  const req = new Request('http://localhost/api/threads/mentor-view');
  assert.equal(await requireMentor(req, 'first', 'mentor-one-unique-secret'), 'first');
  await assert.rejects(requireMentor(req, 'second', 'mentor-one-unique-secret'), error => error.status === 401);
  assert.equal(calls.length, 2);
  limited = true;
  await assert.rejects(requireMentor(req, 'first', 'mentor-one-unique-secret'), error => error.status === 429);
  assert.equal(calls[2].args.p_limit, 300);
});
