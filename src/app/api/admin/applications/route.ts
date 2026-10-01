import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { isSameOrigin } from '@/lib/serverSecurity';

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const { id, action } = input as Record<string, unknown>;
  if (typeof id !== 'string' || id.length > 100 || !['reject', 'delete'].includes(String(action))) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const query =
    action === 'reject'
      ? supabase.from('counselor_applications').update({ status: 'rejected' }).eq('id', id).eq('status', 'pending')
      : supabase.from('counselor_applications').delete().eq('id', id);
  const { data, error } = await query.select('id').single();

  if (error || !data) {
    console.error('[ADMIN_APPLICATION_ACTION_FAILED]', action, id, error);
    return NextResponse.json({ success: false, error: 'action_failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true, id });
}
