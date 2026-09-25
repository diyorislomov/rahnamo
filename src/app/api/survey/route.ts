import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { bodyOf, failure, HttpError, rateLimit, sameOrigin, stringField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await bodyOf(request);
    await rateLimit(request, 'survey', 8);
    const contact = stringField(body.contact_info, 3, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !/^@?[a-zA-Z][\w]{4,31}$/.test(contact)) throw new HttpError(400, 'invalid_contact');
    const row: Record<string, unknown> = { contact_info: contact, interested_in_service: stringField(body.interested_in_service, 1, 100), willing_to_refer: body.willing_to_refer === true };
    for (const key of ['age_range', 'status', 'field_of_study', 'interest_area', 'biggest_challenge', 'prior_advice_source', 'price_willingness', 'preferred_format']) row[key] = stringField(body[key], 0, key === 'biggest_challenge' ? 3000 : 300) || null;
    const { error } = await getServiceRoleClient().from('survey_responses').insert(row);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) { return failure(error); }
}
