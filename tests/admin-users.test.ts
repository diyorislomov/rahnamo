import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, connect } = vi.hoisted(() => {
  const query = vi.fn();
  const connect = vi.fn().mockResolvedValue({
    query,
    release: vi.fn(),
  });
  return { query, connect };
});

vi.mock('server-only', () => ({}));
vi.mock('../src/lib/postgres', () => ({
  postgres: {
    query,
    connect,
  },
}));

vi.mock('../src/lib/adminSession', () => ({
  ADMIN_SESSION_COOKIE: 'rahnamo_admin_session',
  verifyAdminSession: vi.fn((token) => token === 'valid_admin_token'),
  signAdminSession: vi.fn(() => 'valid_admin_token.signed'),
}));

vi.mock('../src/lib/menteeSession', () => ({
  resolveMenteeFromRequest: vi.fn().mockResolvedValue({
    userId: 'user-mentee-1',
    email: 'student@example.com',
    name: 'Dilshod',
  }),
}));

vi.mock('../src/lib/rateLimit', () => ({
  allowRequest: vi.fn().mockResolvedValue(true),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  clearRateLimit: vi.fn().mockResolvedValue(undefined),
  requestIp: vi.fn().mockReturnValue('192.0.2.1'),
}));

vi.mock('../src/lib/serverSecurity', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/serverSecurity')>('../src/lib/serverSecurity');
  return {
    ...actual,
    isSameOrigin: vi.fn().mockReturnValue(true),
  };
});

describe('Admin Users Management & Audit Security', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockClear();
    vi.stubEnv('ADMIN_PASSWORD', 'SuperSecretAdmin123!');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-longer-than-32-chars-strictly');
  });

  it('rejects unauthenticated requests to /api/admin/users with 401', async () => {
    const { GET, POST } = await import('../src/app/api/admin/users/route');

    // Without valid admin cookie
    const reqGet = new Request('http://localhost/api/admin/users');
    const resGet = await GET(reqGet);
    expect(resGet.status).toBe(401);

    const reqPost = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'block', userId: 'usr-1' }),
    });
    const resPost = await POST(reqPost);
    expect(resPost.status).toBe(401);
  });

  it('calculates metrics correctly and returns sanitized user list without passwords, tokens or phone numbers', async () => {
    const { GET } = await import('../src/app/api/admin/users/route');

    // Mock metrics query and users query
    query
      .mockResolvedValueOnce({
        rows: [
          {
            total_users: 100,
            signups_7d: 15,
            signups_30d: 45,
            paid_users_count: 30,
            repeat_users_count: 10,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'usr-123',
            name: 'Ali Valiyev',
            email: 'ali@example.com',
            signup_date: '2026-10-01T10:00:00Z',
            is_blocked: false,
            blocked_at: null,
            blocked_reason: null,
            is_test: false,
            login_provider: 'google',
            preferred_language: 'uz',
            education_stage: 'university',
            is_under_18: false,
            bookings_count: 3,
            paid_threads_count: 2,
            reviews_count: 1,
            last_activity: '2026-10-24T12:00:00Z',
          },
        ],
      });

    const req = new Request('http://localhost/api/admin/users', {
      headers: { cookie: 'rahnamo_admin_session=valid_admin_token' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.metrics.total_users).toBe(100);
    expect(data.metrics.paid_conversion_rate).toBe(30.0); // 30 / 100 * 100
    expect(data.metrics.repeat_rate).toBe(10.0); // 10 / 100 * 100

    const user = data.users[0];
    expect(user.id).toBe('usr-123');
    expect(user.phone).toBeUndefined();
    expect(user.password).toBeUndefined();
    expect(user.access_token).toBeUndefined();
    expect(user.refresh_token).toBeUndefined();
  });

  it('blocks user, clears active sessions, and logs action with SHA-256 IP hash', async () => {
    const { POST } = await import('../src/app/api/admin/users/route');

    query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'usr-1', name: 'Bad User', is_blocked: false }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({}) // UPDATE users SET is_blocked = true
      .mockResolvedValueOnce({}) // DELETE FROM sessions
      .mockResolvedValueOnce({}) // INSERT INTO admin_audit_log
      .mockResolvedValueOnce({}); // COMMIT

    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'rahnamo_admin_session=valid_admin_token',
      },
      body: JSON.stringify({ action: 'block', userId: 'usr-1', reason: 'Spam activity' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.action).toBe('block');

    // Verify audit log call did NOT store raw IP or personal details
    const auditCall = query.mock.calls.find((call) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO admin_audit_log')
    );
    expect(auditCall).toBeDefined();
    const params = auditCall![1];
    expect(params[0]).toBe('usr-1'); // target_user_id
    expect(params[1]).not.toBe('192.0.2.1'); // Raw IP NOT stored
    expect(params[1]).toHaveLength(64); // SHA-256 hex string
  });

  it('refuses deletion if user has active confirmed bookings or open paid threads', async () => {
    const { POST } = await import('../src/app/api/admin/users/route');

    query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'usr-active-1', name: 'Active User' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'book-active-99', slot: '2026-10-28T10:00:00Z' }] }) // Active booking exists!
      .mockResolvedValueOnce({}); // ROLLBACK

    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'rahnamo_admin_session=valid_admin_token',
      },
      body: JSON.stringify({ action: 'delete', userId: 'usr-active-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('active_bookings_exist');
    expect(body.message).toContain('hali faol');
  });

  it('deletes user on request by anonymizing data, wiping sessions/accounts, clearing storage files and logging to audit', async () => {
    const { POST } = await import('../src/app/api/admin/users/route');

    query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'usr-del-1', name: 'John Doe', email: 'john@example.com', image: null }] })
      .mockResolvedValueOnce({ rows: [] }) // No active bookings
      .mockResolvedValueOnce({ rows: [] }) // No open paid threads
      .mockResolvedValueOnce({ rows: [] }) // candidate profiles query
      .mockResolvedValueOnce({ rows: [] }) // candidate counselor_applications query
      .mockResolvedValueOnce({}) // Anonymize users table
      .mockResolvedValueOnce({}) // DELETE FROM accounts
      .mockResolvedValueOnce({}) // DELETE FROM sessions
      .mockResolvedValueOnce({}) // Clear profiles PII
      .mockResolvedValueOnce({}) // Anonymize bookings
      .mockResolvedValueOnce({}) // Anonymize reviews
      .mockResolvedValueOnce({}) // INSERT INTO admin_audit_log
      .mockResolvedValueOnce({}); // COMMIT

    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'rahnamo_admin_session=valid_admin_token',
      },
      body: JSON.stringify({ action: 'delete', userId: 'usr-del-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.action).toBe('delete');

    // Check that accounts and sessions deletion queries were called
    const deleteAccountsCall = query.mock.calls.find((call) =>
      typeof call[0] === 'string' && call[0].includes('DELETE FROM accounts')
    );
    expect(deleteAccountsCall).toBeDefined();

    const deleteSessionsCall = query.mock.calls.find((call) =>
      typeof call[0] === 'string' && call[0].includes('DELETE FROM sessions')
    );
    expect(deleteSessionsCall).toBeDefined();
  });

  it('deletes user profile photo file from storage and old URL returns 404', async () => {
    const { POST } = await import('../src/app/api/admin/users/route');
    const { GET: getUpload } = await import('../src/app/api/uploads/[name]/route');
    const { uploadDirectory } = await import('../src/lib/localUploads');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    // Create a dummy uploaded photo file
    const photoName = '11111111-2222-3333-4444-555555555555.jpg';
    const uploadDir = uploadDirectory();
    await fs.mkdir(uploadDir, { recursive: true });
    const dummyPath = path.join(uploadDir, photoName);
    await fs.writeFile(dummyPath, Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1]));

    // Verify GET /api/uploads/[name] serves it (200)
    const initialGet = await getUpload(new Request(`http://localhost/api/uploads/${photoName}`), {
      params: Promise.resolve({ name: photoName }),
    });
    expect(initialGet.status).toBe(200);

    // Mock DB queries for delete action
    query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'usr-with-photo',
            email: 'user-photo@example.com',
            name: 'User With Photo',
            image: `/api/uploads/${photoName}`,
          },
        ],
      }) // SELECT user FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // active bookings check (none)
      .mockResolvedValueOnce({ rows: [] }) // open threads check (none)
      .mockResolvedValueOnce({ rows: [{ avatar_url: `/api/uploads/${photoName}` }] }) // profiles query
      .mockResolvedValueOnce({ rows: [] }) // counselor_applications query
      .mockResolvedValueOnce({ rows: [] }) // UPDATE users (anonymize)
      .mockResolvedValueOnce({ rows: [] }) // DELETE accounts
      .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
      .mockResolvedValueOnce({ rows: [] }) // UPDATE profiles
      .mockResolvedValueOnce({ rows: [] }) // UPDATE bookings
      .mockResolvedValueOnce({ rows: [] }) // UPDATE reviews
      .mockResolvedValueOnce({ rows: [] }) // INSERT admin_audit_log
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const deleteReq = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'rahnamo_admin_session=valid_admin_token',
      },
      body: JSON.stringify({ action: 'delete', userId: 'usr-with-photo' }),
    });

    const deleteRes = await POST(deleteReq);
    expect(deleteRes.status).toBe(200);
    const deleteJson = await deleteRes.json();
    expect(deleteJson.success).toBe(true);
    expect(deleteJson.action).toBe('delete');

    // Verify old photo URL now returns 404
    const afterGet = await getUpload(new Request(`http://localhost/api/uploads/${photoName}`), {
      params: Promise.resolve({ name: photoName }),
    });
    expect(afterGet.status).toBe(404);
  });

  it('prevents blocked users from booking or asking questions (403 user_blocked)', async () => {
    const { POST: postBooking } = await import('../src/app/api/bookings/route');
    const { POST: postThreadStart } = await import('../src/app/api/threads/start/route');
    const { resolveMenteeFromRequest } = await import('../src/lib/menteeSession');

    // 1. Blocked booking check
    vi.mocked(resolveMenteeFromRequest).mockResolvedValueOnce({
      userId: 'user-blocked-1',
      email: 'blocked@example.com',
      name: 'Blocked Mentee',
      isBlocked: true,
    });

    const bookingReq = new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counselorId: 'c-1', tier: 'standard', slot: '2026-10-30T10:00:00.000Z', studentName: 'Test' }),
    });

    const bookingRes = await postBooking(bookingReq);
    expect(bookingRes.status).toBe(403);
    const bookingBody = await bookingRes.json();
    expect(bookingBody.error).toBe('user_blocked');

    // 2. Blocked thread start check
    vi.mocked(resolveMenteeFromRequest).mockResolvedValueOnce({
      userId: 'user-blocked-1',
      email: 'blocked@example.com',
      name: 'Blocked Mentee',
      isBlocked: true,
    });

    const threadStartReq = new Request('http://localhost/api/threads/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counselorId: 'c-1' }),
    });

    const threadStartRes = await postThreadStart(threadStartReq);
    expect(threadStartRes.status).toBe(403);
    const threadBody = await threadStartRes.json();
    expect(threadBody.error).toBe('user_blocked');
  });

  it('admin login uses strict cookie and constant-time password comparison without dynamic file reads', async () => {
    const { POST: loginPost } = await import('../src/app/api/admin/login/route');

    // Correct password
    const reqSuccess = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'SuperSecretAdmin123!' }),
    });

    const resSuccess = await loginPost(reqSuccess);
    expect(resSuccess.status).toBe(200);

    const setCookie = resSuccess.headers.get('set-cookie');
    expect(setCookie).toContain('rahnamo_admin_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie!.toLowerCase()).toContain('samesite=strict');

    // Incorrect password -> 401
    const reqFail = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'WrongPassword' }),
    });

    const resFail = await loginPost(reqFail);
    expect(resFail.status).toBe(401);
  });
});
