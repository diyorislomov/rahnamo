import { NextResponse } from 'next/server';
import { postgres } from '@/lib/postgres';
import { normalizeSlots } from '@/lib/slots';
import { supabase } from '@/lib/supabase';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.length > 100) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  const { data: counselor, error } = await supabase
    .from('counselors')
    .select('available_slots')
    .eq('id', id)
    .maybeSingle();
  if (error || !counselor) {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }

  const booked = await postgres.query<{ slot: string }>(
    `SELECT slot FROM bookings
     WHERE counselor_id = $1 AND status = 'confirmed' AND tier IN ('standard', 'premium', 'service')`,
    [id]
  );
  const occupied = new Set(booked.rows.map((row) => row.slot));
  const configured = Array.isArray(counselor.available_slots)
    ? counselor.available_slots.filter((slot): slot is string => typeof slot === 'string')
    : [];
  const availableSlots = normalizeSlots(configured).filter((slot) => !occupied.has(slot));

  return NextResponse.json(
    { success: true, availableSlots },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
