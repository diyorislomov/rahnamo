import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { sendTelegramText } from '@/lib/telegram';
import { bodyOf, emailField, failure, HttpError, positiveInteger, rateLimit, sameOrigin, stringField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await bodyOf(request);
    await rateLimit(request, 'applications', 5);
    const textPrice = positiveInteger(body.expected_price_per_question, true);
    const cap = positiveInteger(body.expected_soft_cap, true);
    if (cap && (!textPrice || cap > 100)) throw new HttpError(400, 'invalid_cap');
    const row = { full_name: stringField(body.full_name, 3, 250), headline: stringField(body.headline, 5, 250), bio: stringField(body.bio, 20, 5000), specialties: stringField(body.specialties, 2, 1000), telegram: stringField(body.telegram, 3, 250), phone: stringField(body.phone, 9, 100), email: emailField(body.email), expected_standard_price: positiveInteger(body.expected_standard_price), expected_premium_price: positiveInteger(body.expected_premium_price), expected_price_per_question: textPrice, expected_soft_cap: cap, status: 'pending' };
    const { data, error } = await getServiceRoleClient().from('counselor_applications').insert(row).select('id,status').single();
    if (error) throw error;
    const notified = await sendTelegramText(`New mentor application: ${data.id}\n${row.full_name}`);
    return NextResponse.json({ success: true, application: data, ...(notified ? {} : { warning: 'notification_unavailable' }) }, { status: 201 });
  } catch (error) { return failure(error); }
}
