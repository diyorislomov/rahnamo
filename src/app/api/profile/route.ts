import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { postgres } from '@/lib/postgres';
import { isSameOrigin } from '@/lib/serverSecurity';
import { isValidLocale } from '@/i18n/config';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  const { rows } = await postgres.query(
    `SELECT u.id,u.name,u.email,u.image,p.education_stage,p.is_under_18,p.parental_consent,p.region,p.telegram,p.goal,p.privacy_consent,p.preferred_language AS locale FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=$1`,
    [session.user.id],
  );
  if (!rows[0]) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    success: true,
    user: {
      ...rows[0],
      locale: rows[0].locale || (await cookies()).get('NEXT_LOCALE')?.value || 'uz',
    },
  });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object')
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  const text = (key: string, max: number) =>
    typeof body[key] === 'string' ? body[key].trim().slice(0, max) : null;
  const name = text('name', 120),
    image = text('image', 1000);
  if (!name || name.length < 2)
    return NextResponse.json({ success: false, error: 'invalid_name' }, { status: 400 });
  const locale = isValidLocale(body.locale) ? body.locale : 'uz';
  const stage = ['school', 'university', 'working', 'other'].includes(body.education_stage)
    ? body.education_stage
    : null;
  const under18 = body.is_under_18 === true,
    consent = body.privacy_consent === true;
  const parent = under18 && body.parental_consent === true;
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      'UPDATE users SET name=$1,image=$2 WHERE id=$3 RETURNING id',
      [name, image, session.user.id],
    );
    if (!updated.rowCount) throw new Error('user_missing');
    await client.query(
      `INSERT INTO profiles(id,education_stage,is_under_18,parental_consent,region,telegram,goal,preferred_language,privacy_consent,privacy_consent_at,privacy_policy_version)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $9 THEN now() END,CASE WHEN $9 THEN 'v1.0' END)
      ON CONFLICT(id) DO UPDATE SET education_stage=EXCLUDED.education_stage,is_under_18=EXCLUDED.is_under_18,parental_consent=EXCLUDED.parental_consent,region=EXCLUDED.region,telegram=EXCLUDED.telegram,goal=EXCLUDED.goal,preferred_language=EXCLUDED.preferred_language,privacy_consent=EXCLUDED.privacy_consent,privacy_consent_at=EXCLUDED.privacy_consent_at,privacy_policy_version=EXCLUDED.privacy_policy_version`,
      [
        session.user.id,
        stage,
        under18,
        parent,
        text('region', 100),
        text('telegram', 50)?.replace(/^@/, ''),
        text('goal', 500),
        locale,
        consent,
      ],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PROFILE_SAVE_FAILED]', error);
    return NextResponse.json({ success: false, error: 'save_failed' }, { status: 503 });
  } finally {
    client.release();
  }
  (await cookies()).set('NEXT_LOCALE', locale, { path: '/', maxAge: 365 * 86400, sameSite: 'lax' });
  return GET();
}
export async function DELETE(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "UPDATE bookings SET student_name='Deleted user',email='',phone='',telegram='',education='',question='[Deleted]',region=NULL WHERE user_id=$1",
      [session.user.id],
    );
    await client.query("UPDATE reviews SET student_first_name='Anonim' WHERE user_id=$1", [
      session.user.id,
    ]);
    await client.query('DELETE FROM profiles WHERE id=$1', [session.user.id]);
    await client.query('DELETE FROM accounts WHERE "userId"=$1', [session.user.id]);
    await client.query('DELETE FROM sessions WHERE "userId"=$1', [session.user.id]);
    // Keep an anonymous referential record so payment history is not cascade-deleted.
    await client.query(
      'UPDATE users SET name=\'Deleted user\',email=NULL,image=NULL,"emailVerified"=NULL,deleted_at=now() WHERE id=$1',
      [session.user.id],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const jar = await cookies();
  jar.delete('authjs.session-token');
  jar.delete('__Secure-authjs.session-token');
  return NextResponse.json({ success: true });
}
