import { NextResponse } from 'next/server';
// The public platform no longer issues site-gate credentials.
export async function POST() { return NextResponse.json({ success: false, error: 'site_gate_retired' }, { status: 410 }); }
