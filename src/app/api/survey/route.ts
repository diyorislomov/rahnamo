import { NextResponse } from 'next/server';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

const FIELDS = [
  'age_range',
  'status',
  'field_of_study',
  'interest_area',
  'biggest_challenge',
  'prior_advice_source',
  'interested_in_service',
  'price_willingness',
  'preferred_format',
  'contact_info',
] as const;

export async function POST(request: Request) {
  if (!(await allowRequest(`survey:${requestIp(request)}`, 3, 24 * 60 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const row: Record<string, string | boolean | null> = {};
  for (const field of FIELDS) {
    const value = input[field];
    if (value == null || value === '') row[field] = null;
    else if (typeof value === 'string' && value.trim().length <= 2_000) row[field] = value.trim();
    else return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }
  if (!row.interested_in_service || !row.contact_info) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }
  row.willing_to_refer = input.willing_to_refer === true;
  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch {
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }
  const { error } = await supabase.from('survey_responses').insert(row);
  if (error) return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}
