import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { isSameOrigin } from '@/lib/serverSecurity';

// Approving an application now does three things atomically from the
// server: invite a real mentor account (needs the service_role key, so
// this can't run client-side the way the old direct-insert version did),
// insert the counselors row linked to that account, and mark the
// application approved. All three must happen here, in this order --
// inviting first means a counselors row never gets created for an email
// that couldn't be invited.
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(token);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }
  const applicationId = (input as Record<string, unknown>).applicationId;
  if (typeof applicationId !== 'string' || !applicationId || applicationId.length > 100) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const { data: application, error: applicationError } = await supabase
    .from('counselor_applications')
    .select('*')
    .eq('id', applicationId)
    .eq('status', 'pending')
    .maybeSingle();
  if (applicationError || !application) {
    return NextResponse.json({ success: false, error: 'application_not_found' }, { status: 404 });
  }
  if (
    typeof application.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email) ||
    typeof application.full_name !== 'string' ||
    application.full_name.trim().length < 3 ||
    application.full_name.length > 120 ||
    typeof application.headline !== 'string' ||
    application.headline.length > 200 ||
    typeof application.bio !== 'string' ||
    application.bio.length > 4_000 ||
    typeof application.specialties !== 'string' ||
    application.specialties.length > 500
  ) {
    return NextResponse.json({ success: false, error: 'invalid_application' }, { status: 400 });
  }

  const redirectTo = `${new URL(request.url).origin}/mentor/set-password`;
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(application.email, {
    data: { role: 'mentor', full_name: application.full_name },
    redirectTo,
  });

  if (inviteError || !inviteData?.user) {
    // A duplicate-email conflict (applicant already has an account, or this
    // is a retry after a partial failure below) is NOT auto-resolved here --
    // this SDK version's listUsers() has no email filter, so a reliable
    // lookup would mean paginating every user, which doesn't scale and
    // isn't built for v1. The admin gets a clear, distinct error instead of
    // either a silent failure or an incorrect guess.
    const alreadyRegistered = (inviteError?.message || '').toLowerCase().includes('already');
    console.error('[APPROVE_APPLICATION_INVITE_FAILED]', application.email, inviteError);
    return NextResponse.json(
      {
        success: false,
        error: alreadyRegistered ? 'email_already_registered' : 'invite_failed',
        message: alreadyRegistered
          ? 'This email already has a Supabase Auth account (a prior approval attempt, or an existing mentee account). Check the counselors table before retrying, or link the account manually.'
          : inviteError?.message,
      },
      { status: alreadyRegistered ? 409 : 500 }
    );
  }

  const counselorId = `c-${application.full_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;

  const { error: insertError } = await supabase.from('counselors').insert({
    id: counselorId,
    auth_id: inviteData.user.id,
    email: application.email,
    full_name: application.full_name,
    headline: application.headline,
    avatar_url:
      application.photo_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
    specialties: application.specialties.split(',').map((specialty: string) => specialty.trim()).filter(Boolean),
    bio: application.bio,
    standard_price: application.expected_standard_price || 45000,
    premium_price: application.expected_premium_price || 130000,
    rating: 5.0,
    reviews_count: 0,
    // Same placeholder-slots reasoning as before this route existed -- real
    // availability editing ships in the mentor dashboard (this same stage).
    available_slots: ['Dushanba, 19:00 - 19:30', 'Chorshanba, 19:00 - 19:30', 'Shanba, 12:00 - 12:30'],
    company: null,
    price_per_question: application.expected_price_per_question || null,
    soft_cap: application.expected_soft_cap || null,
  });

  if (insertError) {
    await supabase.auth.admin.deleteUser(inviteData.user.id);
    console.error('[APPROVE_APPLICATION_INSERT_FAILED]', counselorId, insertError);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  {
    const { data: updated, error: statusError } = await supabase
      .from('counselor_applications')
      .update({ status: 'approved' })
      .eq('id', applicationId)
      .eq('status', 'pending')
      .select('id')
      .single();
    if (statusError || !updated) {
      console.error('[APPROVE_APPLICATION_STATUS_UPDATE_FAILED]', applicationId, statusError);
      await Promise.all([
        supabase.from('counselors').delete().eq('id', counselorId),
        supabase.auth.admin.deleteUser(inviteData.user.id),
      ]);
      return NextResponse.json({ success: false, error: 'status_update_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, counselorId });
}
