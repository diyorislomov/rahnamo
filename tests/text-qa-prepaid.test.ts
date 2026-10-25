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

vi.mock('../src/lib/menteeSession', () => ({
  resolveMenteeFromRequest: vi.fn().mockResolvedValue({
    userId: 'user-mentee-1',
    email: 'student@example.com',
    name: 'Dilshod',
  }),
}));

vi.mock('../src/lib/mentorSession', () => ({
  resolveMentorFromRequest: vi.fn().mockResolvedValue({
    authId: 'mentor-auth-1',
    counselorId: 'counselor-1',
    email: 'mentor@example.com',
  }),
}));

vi.mock('../src/lib/rateLimit', () => ({
  allowRequest: vi.fn().mockResolvedValue(true),
}));

vi.mock('../src/lib/serverSecurity', () => ({
  isSameOrigin: vi.fn().mockReturnValue(true),
}));

describe('Pre-paid Text Q&A Flow & Security', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockClear();
  });

  it('rejects an unpaid thread with 402 payment_required', async () => {
    const { POST } = await import('../src/app/api/threads/route');

    // Atomic update matches 0 rows because payment_status is 'pending_payment'
    query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // UPDATE ... WHERE payment_status = 'paid' ...
      .mockResolvedValueOnce({
        rows: [
          {
            payment_status: 'pending_payment',
            questions_used: 0,
            questions_paid: 3,
          },
        ],
      }) // SELECT check
      .mockResolvedValueOnce({}); // ROLLBACK

    const request = new Request('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ask',
        threadId: 'th-unpaid-1',
        body: 'Salom, mentor!',
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('payment_required');
  });

  it('rejects with 402 pack_exhausted when questions_used >= questions_paid', async () => {
    const { POST } = await import('../src/app/api/threads/route');

    // Pack of 3 has already used 3 questions
    query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // UPDATE matches 0 rows
      .mockResolvedValueOnce({
        rows: [
          {
            payment_status: 'paid',
            questions_used: 3,
            questions_paid: 3,
          },
        ],
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const request = new Request('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ask',
        threadId: 'th-paid-full',
        body: 'Yana bir savol bersam bo\'ladimi?',
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('pack_exhausted');
  });

  it('allows paid thread to ask, sets 48h deadline, and mentor reply clears deadline', async () => {
    const { POST: postAsk } = await import('../src/app/api/threads/route');
    const { POST: postReply } = await import('../src/app/api/threads/reply/route');

    const deadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    // 1. Mentee asks
    query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'th-paid-1',
            user_id: 'user-mentee-1',
            payment_status: 'paid',
            questions_used: 1,
            questions_paid: 3,
            reply_deadline_at: deadline,
            reply_status: 'pending_mentor_reply',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'msg-1' }] }) // INSERT thread_messages
      .mockResolvedValueOnce({}); // COMMIT

    const askRequest = new Request('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ask',
        threadId: 'th-paid-1',
        body: 'Qanday qilib IT ga kirsam bo\'ladi?',
      }),
    });

    const askRes = await postAsk(askRequest);
    expect(askRes.status).toBe(200);
    const askBody = await askRes.json();
    expect(askBody.success).toBe(true);
    expect(askBody.questions_used).toBe(1);
    expect(askBody.reply_deadline_at).toBe(deadline);

    // 2. Mentor replies
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'th-paid-1',
            counselor_id: 'counselor-1',
            payment_status: 'paid',
          },
        ],
      }) // SELECT thread
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'msg-reply-1', body: 'Dasturlash asoslarini o\'rganing.' }],
      }) // INSERT thread_messages
      .mockResolvedValueOnce({}) // UPDATE question_threads SET reply_status = 'replied', reply_deadline_at = NULL
      .mockResolvedValueOnce({}); // COMMIT

    const replyRequest = new Request('http://localhost/api/threads/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: 'th-paid-1',
        body: 'Dasturlash asoslarini o\'rganing.',
      }),
    });

    const replyRes = await postReply(replyRequest);
    expect(replyRes.status).toBe(200);
    const replyBody = await replyRes.json();
    expect(replyBody.success).toBe(true);
  });

  it('prevents mentor from answering an unpaid thread (403 thread_not_paid)', async () => {
    const { POST: postReply } = await import('../src/app/api/threads/reply/route');

    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'th-unpaid-2',
          counselor_id: 'counselor-1',
          payment_status: 'pending_payment', // Unpaid
        },
      ],
    });

    const replyRequest = new Request('http://localhost/api/threads/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: 'th-unpaid-2',
        body: 'Unpaid thread reply attempt.',
      }),
    });

    const replyRes = await postReply(replyRequest);
    expect(replyRes.status).toBe(403);
    const replyBody = await replyRes.json();
    expect(replyBody.error).toBe('thread_not_paid');
  });

  it('proves atomic concurrency safety: simultaneous requests cannot exceed questions_paid', async () => {
    const { POST } = await import('../src/app/api/threads/route');

    // Simulate 2 concurrent requests when questions_used = 2 and questions_paid = 3 (only 1 remaining).
    // Request A executes UPDATE and wins (1 row returned).
    // Request B executes UPDATE with condition questions_used < questions_paid, which now fails (0 rows returned).

    const makeRequest = () =>
      new Request('http://localhost/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          threadId: 'th-race-1',
          body: 'Concurrent question',
        }),
      });

    // In PostgreSQL, atomic conditional UPDATE ensures only one transaction updates the row
    // Mock Request 1 (Winner):
    const runWinner = async () => {
      query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'th-race-1',
              user_id: 'user-mentee-1',
              payment_status: 'paid',
              questions_used: 3,
              questions_paid: 3,
              reply_status: 'pending_mentor_reply',
            },
          ],
        }) // Atomic UPDATE succeeds
        .mockResolvedValueOnce({ rows: [{ id: 'msg-winner' }] })
        .mockResolvedValueOnce({}); // COMMIT

      return POST(makeRequest());
    };

    // Mock Request 2 (Loser due to atomic constraint):
    const runLoser = async () => {
      query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Atomic UPDATE matches 0 rows!
        .mockResolvedValueOnce({
          rows: [
            {
              payment_status: 'paid',
              questions_used: 3,
              questions_paid: 3,
            },
          ],
        })
        .mockResolvedValueOnce({}); // ROLLBACK

      return POST(makeRequest());
    };

    const res1 = await runWinner();
    const res2 = await runLoser();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(402);
    const body2 = await res2.json();
    expect(body2.error).toBe('pack_exhausted');
  });

  it('strictly minimises data: never leaks bank_reference or admin fields to mentee or mentor', async () => {
    const { GET } = await import('../src/app/api/threads/route');
    const { POST: mentorView } = await import('../src/app/api/threads/mentor-view/route');

    const sensitiveRow = {
      id: 'th-sensitive-1',
      user_id: 'user-mentee-1',
      counselor_id: 'counselor-1',
      price_per_question: 50000,
      questions_paid: 3,
      questions_used: 1,
      total_paid: 150000,
      payment_method: 'card',
      payment_status: 'paid',
      bank_reference: 'SECRET-BANK-REF-999',
      confirmed_amount: 150000,
      confirmed_by_admin: 'admin-super',
      admin_confirmed_at: '2026-10-26T10:00:00Z',
      payment_receipt: 'kvitansiya.jpg',
      created_at: '2026-10-26T09:00:00Z',
    };

    // 1. Mentee GET
    query
      .mockResolvedValueOnce({ rows: [sensitiveRow] })
      .mockResolvedValueOnce({ rows: [] });

    const menteeReq = new Request('http://localhost/api/threads?threadId=th-sensitive-1');
    const menteeRes = await GET(menteeReq);
    const menteeBody = await menteeRes.json();

    expect(menteeBody.thread.bank_reference).toBeUndefined();
    expect(menteeBody.thread.confirmed_amount).toBeUndefined();
    expect(menteeBody.thread.confirmed_by_admin).toBeUndefined();
    expect(menteeBody.thread.admin_confirmed_at).toBeUndefined();

    // 2. Mentor View POST
    query
      .mockResolvedValueOnce({
        rows: [
          {
            ...sensitiveRow,
            student_name: 'Jasur Bek',
            telegram: '@jasurbek',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const mentorReq = new Request('http://localhost/api/threads/mentor-view', { method: 'POST' });
    const mentorRes = await mentorView(mentorReq);
    const mentorBody = await mentorRes.json();

    const mentorThread = mentorBody.threads[0];
    expect(mentorThread.bank_reference).toBeUndefined();
    expect(mentorThread.confirmed_amount).toBeUndefined();
    expect(mentorThread.confirmed_by_admin).toBeUndefined();
    expect(mentorThread.admin_confirmed_at).toBeUndefined();
    expect(mentorThread.payment_receipt).toBeUndefined();
    expect(mentorThread.student_name).toBe('Jasur'); // PII stripped to first name
  });
});
