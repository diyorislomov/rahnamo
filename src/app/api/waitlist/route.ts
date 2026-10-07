import { NextResponse } from 'next/server';
import { postgres } from '@/lib/postgres';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { sendTelegramText } from '@/lib/telegram';
import { parseWaitlistInput } from '@/lib/waitlist';

export async function POST(request: Request) {
  if (!(await allowRequest(`waitlist:${requestIp(request)}`, 5, 24 * 60 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const input = parseWaitlistInput(body);
  if (!input) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let id: string | undefined;
  try {
    const result = await postgres.query<{ id: string }>(
      `INSERT INTO career_waitlist (full_name, contact, goal, field, experience_level, locale)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (contact) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         goal = EXCLUDED.goal,
         field = EXCLUDED.field,
         experience_level = EXCLUDED.experience_level,
         locale = EXCLUDED.locale,
         updated_at = now()
       RETURNING id`,
      [input.fullName, input.contact, input.goal, input.field, input.experienceLevel, input.locale]
    );
    id = result.rows[0]?.id;
  } catch (error) {
    console.error('[WAITLIST_INSERT_FAILED]', error);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  if (!id) return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });

  void sendTelegramText([
    '🎯 YANGI KARYERA MAQSADI',
    `ID: ${id}`,
    `Ism: ${input.fullName}`,
    `Aloqa: ${input.contact}`,
    `Maqsad: ${input.goal}`,
    `Yo‘nalish: ${input.field}`,
    `Daraja: ${input.experienceLevel}`,
  ].join('\n'));

  return NextResponse.json({ success: true, id });
}
