import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { one } from '@/lib/database';
import { isSameOrigin } from '@/lib/serverSecurity';

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const { id, action, is_active } = input;
  if (typeof id !== 'string' || !id || !['toggle_active', 'delete'].includes(String(action))) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  if (action === 'toggle_active') {
    const targetState = typeof is_active === 'boolean' ? is_active : false;
    const { data, error } = await one('UPDATE counselors SET is_active=$1 WHERE id=$2 RETURNING id,is_active',[targetState,id]);

    if (error) {
      console.error('[ADMIN_COUNSELOR_TOGGLE_ACTIVE_FAILED]', id, error);
      return NextResponse.json({ success: false, error: 'update_failed', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, counselor: data });
  }

  if (action === 'delete') {
    const { data, error } = await one('DELETE FROM counselors WHERE id=$1 RETURNING id',[id]);

    if (error) {
      console.error('[ADMIN_COUNSELOR_DELETE_FAILED]', id, error);
      return NextResponse.json({ success: false, error: 'delete_failed', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data?.id });
  }

  return NextResponse.json({ success: false, error: 'unknown_action' }, { status: 400 });
}
