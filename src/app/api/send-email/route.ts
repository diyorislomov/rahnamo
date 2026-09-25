import { NextResponse } from 'next/server';

// Delivery is triggered only by successful server-side booking/payment operations.
export async function POST() {
  return NextResponse.json({ success: false, error: 'use_booking_workflow' }, { status: 410 });
}
