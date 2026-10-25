import { NextResponse } from 'next/server';
import { saveImage } from '@/lib/localUploads';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { isSameOrigin } from '@/lib/serverSecurity';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest('mentor-photo:' + mentor.authId, 20, 60 * 60_000)))
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 6 * 1024 * 1024)
    return NextResponse.json({ success: false, error: 'file_too_large' }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ success: false, error: 'invalid_file' }, { status: 400 });
  try {
    return NextResponse.json({ success: true, url: await saveImage(file) });
  } catch (error) {
    const invalid = error instanceof Error && error.message.startsWith('invalid_');
    return NextResponse.json(
      { success: false, error: invalid ? 'invalid_file' : 'upload_failed' },
      { status: invalid ? 400 : 503 },
    );
  }
}
