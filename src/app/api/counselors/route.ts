import { NextResponse } from 'next/server';
import { postgres } from '@/lib/postgres';
import { PUBLIC_COUNSELOR_COLUMNS } from '@/lib/counselors';
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (id && id.length > 100) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const result = await postgres.query(
    `SELECT ${PUBLIC_COUNSELOR_COLUMNS} FROM counselors WHERE is_active=true ${id ? 'AND id=$1' : ''} ORDER BY joined_at`,
    id ? [id] : [],
  );
  return NextResponse.json(
    { success: true, counselors: result.rows },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
