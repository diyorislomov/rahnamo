import { NextResponse } from 'next/server';
import { postgres } from '@/lib/postgres';
import { mapService, type CounselorServiceRow } from '@/lib/services';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.length > 100) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }
  const result = await postgres.query<CounselorServiceRow>(
    `SELECT id, counselor_id, title, description, service_type, duration_minutes, price, active
     FROM counselor_services WHERE counselor_id = $1 AND active = true
     ORDER BY price ASC, created_at ASC`,
    [id]
  );
  return NextResponse.json(
    { success: true, services: result.rows.map(mapService) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
