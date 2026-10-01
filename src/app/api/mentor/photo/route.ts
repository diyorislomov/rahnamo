import { NextResponse } from 'next/server';
import { resolveMentorFromRequest } from '@/lib/mentorSession';
import { allowRequest } from '@/lib/rateLimit';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { isSameOrigin } from '@/lib/serverSecurity';

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
  const mentor = await resolveMentorFromRequest(request);
  if (!mentor) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  if (!(await allowRequest(`mentor-photo:${mentor.authId}`, 10, 60 * 60_000))) {
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_form' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size < 1 || file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'invalid_file' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  const valid =
    (file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (file.type === 'image/png' && bytes.slice(0, 8).every((value, index) => value === pngSignature[index])) ||
    (file.type === 'image/webp' &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
  if (!valid) return NextResponse.json({ success: false, error: 'invalid_file_signature' }, { status: 400 });

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `mentors/${mentor.authId}/${crypto.randomUUID()}.${extension}`;
  const supabase = getServiceRoleClient();
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ success: false, error: 'upload_failed' }, { status: 500 });
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return NextResponse.json({ success: true, url: data.publicUrl });
}
