import { NextResponse } from 'next/server';
import { getActiveTracks } from '@/lib/tracks';

export async function GET() {
  const tracks = await getActiveTracks();
  return NextResponse.json({ success: true, tracks });
}
