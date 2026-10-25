import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { requestIp } from '@/lib/rateLimit';
import { deleteUserStoredFiles } from '@/lib/storageCleanup';

// Admin endpoints require a verified admin session
async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(token);
}

function hashIp(rawIp: string): string {
  return crypto.createHash('sha256').update(rawIp || 'unknown').digest('hex');
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  try {
    // 1. Overview metrics: calculated with Asia/Tashkent time and test/deleted accounts excluded
    const metricsResult = await postgres.query(`
      WITH user_orders AS (
        SELECT u.id AS user_id,
          (
            COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id AND b.payment_status IN ('paid', 'confirmed') AND b.price > 0), 0) +
            COALESCE((SELECT COUNT(*) FROM question_threads qt WHERE qt.user_id = u.id AND qt.payment_status = 'paid'), 0)
          ) AS paid_orders_count
        FROM users u
        WHERE u.deleted_at IS NULL AND COALESCE(u.is_test, false) = false
      )
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE u.created_at >= (now() AT TIME ZONE 'Asia/Tashkent' - interval '7 days')) AS signups_7d,
        COUNT(*) FILTER (WHERE u.created_at >= (now() AT TIME ZONE 'Asia/Tashkent' - interval '30 days')) AS signups_30d,
        COUNT(*) FILTER (WHERE uo.paid_orders_count >= 1) AS paid_users_count,
        COUNT(*) FILTER (WHERE uo.paid_orders_count >= 2) AS repeat_users_count
      FROM users u
      LEFT JOIN user_orders uo ON uo.user_id = u.id
      WHERE u.deleted_at IS NULL AND COALESCE(u.is_test, false) = false
    `);

    const rawMetrics = metricsResult?.rows?.[0] || {};
    const totalUsers = Number(rawMetrics.total_users || 0);
    const signups7d = Number(rawMetrics.signups_7d || 0);
    const signups30d = Number(rawMetrics.signups_30d || 0);
    const paidUsersCount = Number(rawMetrics.paid_users_count || 0);
    const repeatUsersCount = Number(rawMetrics.repeat_users_count || 0);

    const paidConversionRate = totalUsers > 0 ? Number(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0;
    const repeatRate = totalUsers > 0 ? Number(((repeatUsersCount / totalUsers) * 100).toFixed(1)) : 0;

    const metrics = {
      total_users: totalUsers,
      signups_7d: signups7d,
      signups_30d: signups30d,
      paid_users_count: paidUsersCount,
      repeat_users_count: repeatUsersCount,
      paid_conversion_rate: paidConversionRate,
      repeat_rate: repeatRate,
    };

    // 2. Searchable, paginated user list with RBAC data minimization (no phone, no tokens, no passwords)
    let whereClause = 'WHERE u.deleted_at IS NULL';
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }

    const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const totalCountRes = await postgres.query(countQuery, params);
    const total = Number(totalCountRes?.rows?.[0]?.total || 0);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const usersQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at AS signup_date,
        u.is_blocked,
        u.blocked_at,
        u.blocked_reason,
        u.is_test,
        COALESCE(
          (SELECT a.provider FROM accounts a WHERE a."userId" = u.id LIMIT 1),
          'email'
        ) AS login_provider,
        p.preferred_language,
        p.education_stage,
        p.is_under_18,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id), 0) AS bookings_count,
        COALESCE((SELECT COUNT(*) FROM question_threads qt WHERE qt.user_id = u.id AND qt.payment_status = 'paid'), 0) AS paid_threads_count,
        COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.booking_id IN (SELECT id FROM bookings WHERE user_id = u.id)), 0) AS reviews_count,
        GREATEST(
          u.created_at,
          (SELECT MAX(created_at) FROM bookings WHERE user_id = u.id),
          (SELECT MAX(created_at) FROM question_threads WHERE user_id = u.id)
        ) AS last_activity
      FROM users u
      LEFT JOIN profiles p ON p.id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const usersResult = await postgres.query(usersQuery, params);

    return NextResponse.json({
      success: true,
      metrics,
      users: usersResult?.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('[ADMIN_USERS_GET_FAILED]', error);
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const { action, userId } = input;
  if (typeof userId !== 'string' || typeof action !== 'string') {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const client = await postgres.connect();
  const ipHash = hashIp(requestIp(request));

  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const user = userRes?.rows?.[0];
    if (!user) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'user_not_found' }, { status: 404 });
    }

    if (action === 'block') {
      const reason = typeof input.reason === 'string' ? input.reason.trim() : null;
      await client.query(
        `UPDATE users
         SET is_blocked = true, blocked_at = now(), blocked_reason = $1
         WHERE id = $2`,
        [reason, userId]
      );

      // Invalidate active web sessions immediately
      await client.query('DELETE FROM sessions WHERE "userId" = $1', [userId]);

      // Record in audit log
      await client.query(
        `INSERT INTO admin_audit_log (admin_identifier, action, target_user_id, ip_hash)
         VALUES ('admin', 'block_user', $1, $2)`,
        [userId, ipHash]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, action: 'block', userId });
    }

    if (action === 'unblock') {
      await client.query(
        `UPDATE users
         SET is_blocked = false, blocked_at = NULL, blocked_reason = NULL
         WHERE id = $1`,
        [userId]
      );

      // Record in audit log
      await client.query(
        `INSERT INTO admin_audit_log (admin_identifier, action, target_user_id, ip_hash)
         VALUES ('admin', 'unblock_user', $1, $2)`,
        [userId, ipHash]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, action: 'unblock', userId });
    }

    if (action === 'toggle_test') {
      const isTest = !Boolean(user.is_test);
      await client.query('UPDATE users SET is_test = $1 WHERE id = $2', [isTest, userId]);
      await client.query('COMMIT');
      return NextResponse.json({ success: true, is_test: isTest });
    }

    if (action === 'delete') {
      // 1. Refuse to delete if user has an upcoming or active confirmed booking
      const activeBookings = await client.query(
        `SELECT id, slot FROM bookings
         WHERE user_id = $1 AND status IN ('pending', 'confirmed')
           AND payment_status = 'confirmed'
           AND (created_at >= now() - interval '14 days')
         LIMIT 1`,
        [userId]
      );
      if (activeBookings?.rows?.[0]) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: 'active_bookings_exist',
          message: 'Foydalanuvchida hali faol yoki yaqinlashib kelayotgan to‘langan bron mavjud. Avval uni kuting yoki bekor qiling.',
        }, { status: 409 });
      }

      // 2. Refuse to delete if user has an open paid question thread
      const openThreads = await client.query(
        `SELECT id FROM question_threads
         WHERE user_id = $1 AND payment_status = 'paid'
         LIMIT 1`,
        [userId]
      );
      if (openThreads?.rows?.[0]) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: 'active_threads_exist',
          message: 'Foydalanuvchida ochiq to‘langan matnli maslahat to‘plami mavjud. Avval uni yoping.',
        }, { status: 409 });
      }

      // 3. Collect stored file URLs tied to this user to clean up from storage
      const candidateUrls: (string | null | undefined)[] = [user.image];
      try {
        const profRes = await client.query('SELECT avatar_url FROM profiles WHERE id = $1', [userId]);
        if (profRes.rows?.[0]?.avatar_url) candidateUrls.push(profRes.rows[0].avatar_url);
      } catch {
        // ignore if profiles table or avatar_url is missing
      }
      if (user.email) {
        try {
          const appRes = await client.query('SELECT photo_url FROM counselor_applications WHERE email = $1', [user.email]);
          if (appRes.rows?.[0]?.photo_url) candidateUrls.push(appRes.rows[0].photo_url);
        } catch {}
      }

      // Delete the actual files (local uploads and Supabase Storage buckets)
      await deleteUserStoredFiles(userId, candidateUrls);

      // 4. Anonymize user record
      await client.query(
        `UPDATE users
         SET name = 'O''chirilgan foydalanuvchi',
             email = concat('deleted_', id::text, '@anonymized.local'),
             image = NULL,
             deleted_at = now(),
             is_blocked = true
         WHERE id = $1`,
        [userId]
      );

      // 5. Delete linked OAuth accounts and sessions
      await client.query('DELETE FROM accounts WHERE "userId" = $1', [userId]);
      await client.query('DELETE FROM sessions WHERE "userId" = $1', [userId]);

      // 6. Clear sensitive profile details
      await client.query(
        `UPDATE profiles
         SET telegram = NULL,
             goal = NULL,
             region = NULL,
             avatar_url = NULL
         WHERE id = $1`,
        [userId]
      );

      // 7. Anonymize bookings & reviews so financial integrity remains but PII is wiped
      await client.query(
        `UPDATE bookings
         SET student_name = 'Foydalanuvchi',
             email = '',
             phone = '',
             telegram = ''
         WHERE user_id = $1`,
        [userId]
      );

      await client.query(
        `UPDATE reviews
         SET student_first_name = 'Foydalanuvchi'
         WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)`,
        [userId]
      );

      // 8. Write to audit log (only target_user_id and ip_hash, no personal data)
      await client.query(
        `INSERT INTO admin_audit_log (admin_identifier, action, target_user_id, ip_hash)
         VALUES ('admin', 'delete_user', $1, $2)`,
        [userId, ipHash]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, action: 'delete', userId });
    }

    await client.query('ROLLBACK');
    return NextResponse.json({ success: false, error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[ADMIN_USER_ACTION_FAILED]', error);
    return NextResponse.json({ success: false, error: 'action_failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
