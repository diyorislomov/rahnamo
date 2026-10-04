import { NextResponse } from 'next/server';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { mapService, serviceInput, type CounselorServiceRow } from '@/lib/services';

async function requireMentor(request: Request) {
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return null;
  const allowed = await allowRequest(`mentor-services:${mentor.authId}`, 60, 15 * 60_000);
  return allowed ? mentor : null;
}

export async function GET(request: Request) {
  const mentor = await requireMentor(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  const result = await postgres.query<CounselorServiceRow>(
    `SELECT id, counselor_id, title, description, service_type, duration_minutes, price, active
     FROM counselor_services WHERE counselor_id = $1 ORDER BY created_at ASC`,
    [mentor.counselorId]
  );
  return NextResponse.json({ success: true, services: result.rows.map(mapService) });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentor = await requireMentor(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 }); }
  const value = serviceInput(body);
  if (!value) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  const result = await postgres.query<CounselorServiceRow>(
    `INSERT INTO counselor_services (counselor_id, title, description, service_type, duration_minutes, price)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, counselor_id, title, description, service_type, duration_minutes, price, active`,
    [mentor.counselorId, value.title, value.description, value.serviceType, value.durationMinutes, value.price]
  );
  return NextResponse.json({ success: true, service: mapService(result.rows[0]) }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentor = await requireMentor(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 }); }
  const id = typeof body.id === 'string' ? body.id : '';
  const value = serviceInput(body);
  const active = typeof body.active === 'boolean' ? body.active : null;
  if (!id || !value || active === null) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }
  const result = await postgres.query<CounselorServiceRow>(
    `UPDATE counselor_services SET
       title = $1, description = $2, service_type = $3, duration_minutes = $4,
       price = $5, active = $6, updated_at = now()
     WHERE id = $7 AND counselor_id = $8
     RETURNING id, counselor_id, title, description, service_type, duration_minutes, price, active`,
    [value.title, value.description, value.serviceType, value.durationMinutes, value.price, active, id, mentor.counselorId]
  );
  if (!result.rows[0]) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ success: true, service: mapService(result.rows[0]) });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentor = await requireMentor(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 }); }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  const result = await postgres.query(
    'DELETE FROM counselor_services WHERE id = $1 AND counselor_id = $2 RETURNING id',
    [id, mentor.counselorId]
  );
  if (!result.rows[0]) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
