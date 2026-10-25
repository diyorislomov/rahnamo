import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getGlobalLaunchDate, setGlobalLaunchDate } from '@/lib/platformSettings';
import { isSameOrigin } from '@/lib/serverSecurity';

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const launchDate = await getGlobalLaunchDate();
  return NextResponse.json({
    success: true,
    global_launch_date: launchDate.toISOString(),
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const { global_launch_date } = body;
  if (typeof global_launch_date !== 'string') {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const updated = await setGlobalLaunchDate(global_launch_date);
  if (!updated) {
    return NextResponse.json({ success: false, error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, global_launch_date });
}
