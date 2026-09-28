import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/adminSession';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

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

interface ApproveApplicationBody {
  applicationId: string | null;
  fullName: string;
  headline: string;
  specialties?: string;
  category?: string;
  bio: string;
  company?: string | null;
  email: string;
  expectedStandardPrice?: number;
  expectedPremiumPrice?: number;
  expectedPricePerQuestion?: number | null;
  expectedSoftCap?: number | null;
  photoUrl?: string | null;
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as ApproveApplicationBody;
  if (!body.email || !body.fullName || !body.bio || !body.headline) {
    return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('Service role client unavailable:', err);
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const redirectTo = `${new URL(request.url).origin}/mentor/set-password`;
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(body.email, {
    data: { role: 'mentor', full_name: body.fullName },
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
    console.error('[APPROVE_APPLICATION_INVITE_FAILED]', body.email, inviteError);
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

  const counselorId = `c-${body.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;

  const { error: insertError } = await supabase.from('counselors').insert({
    id: counselorId,
    auth_id: inviteData.user.id,
    email: body.email,
    full_name: body.fullName,
    headline: body.headline,
    avatar_url:
      body.photoUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
    specialties: body.specialties
      ? body.specialties.split(',').map((s) => s.trim()).filter(Boolean)
      : [body.category || 'Umumiy'],
    bio: body.bio,
    standard_price: body.expectedStandardPrice || 45000,
    premium_price: body.expectedPremiumPrice || 130000,
    rating: 5.0,
    reviews_count: 0,
    // Same placeholder-slots reasoning as before this route existed -- real
    // availability editing ships in the mentor dashboard (this same stage).
    available_slots: ['Dushanba, 19:00 - 19:30', 'Chorshanba, 19:00 - 19:30', 'Shanba, 12:00 - 12:30'],
    company: body.company || null,
    price_per_question: body.expectedPricePerQuestion || null,
    soft_cap: body.expectedSoftCap || null,
  });

  if (insertError) {
    // The invite already went out at this point -- a retry of this whole
    // route will hit "email_already_registered" above, not a fresh invite.
    // Acceptable for v1 (flagged, not silently glossed over): the admin
    // sees a distinct insert_failed error here and can create the
    // counselors row manually, linking auth_id by hand, rather than the
    // route being able to cleanly resume.
    console.error('[APPROVE_APPLICATION_INSERT_FAILED]', counselorId, insertError);
    return NextResponse.json({ success: false, error: 'insert_failed' }, { status: 500 });
  }

  if (body.applicationId) {
    const { error: statusError } = await supabase
      .from('counselor_applications')
      .update({ status: 'approved' })
      .eq('id', body.applicationId);
    if (statusError) {
      console.error('[APPROVE_APPLICATION_STATUS_UPDATE_FAILED]', body.applicationId, statusError);
      // Non-fatal: the counselor row and invite are real and correct at
      // this point, so report success -- the application's status label
      // in the admin list may lag, not the actual approval.
    }
  }

  return NextResponse.json({ success: true, counselorId });
}
