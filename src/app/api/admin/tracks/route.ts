import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { isSameOrigin } from '@/lib/serverSecurity';
import { getAllTracksAdmin, updateTrack } from '@/lib/tracks';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const tracks = await getAllTracksAdmin();
  return NextResponse.json({ success: true, tracks });
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

  const { action, slug } = body;
  if (typeof slug !== 'string' || !slug) {
    return NextResponse.json({ success: false, error: 'missing_slug' }, { status: 400 });
  }

  if (action === 'toggle_active') {
    const isActive = Boolean(body.is_active);
    const ok = await updateTrack(slug, { is_active: isActive });
    return NextResponse.json({ success: ok });
  }

  if (action === 'reorder') {
    const sortOrder = Number(body.sort_order);
    if (!Number.isInteger(sortOrder)) {
      return NextResponse.json({ success: false, error: 'invalid_sort_order' }, { status: 400 });
    }
    const ok = await updateTrack(slug, { sort_order: sortOrder });
    return NextResponse.json({ success: ok });
  }

  return NextResponse.json({ success: false, error: 'unknown_action' }, { status: 400 });
}
