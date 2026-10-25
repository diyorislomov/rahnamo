import { NextResponse } from 'next/server';
import { allowRequest, requestIp } from '@/lib/rateLimit';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const ip = requestIp(request);
  const isDev = process.env.NODE_ENV !== 'production';
  const limit = isDev ? 100 : 30;
  if (!(await allowRequest(`application-photo:${ip}`, limit, 60 * 60_000))) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', { reason: 'rate_limited', ip });
    return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', { reason: 'invalid_form', err });
    return NextResponse.json({ success: false, error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', { reason: 'no_file' });
    return NextResponse.json({ success: false, error: 'invalid_file' }, { status: 400 });
  }

  if (!TYPES.has(file.type)) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', { reason: 'invalid_type', type: file.type });
    return NextResponse.json({ success: false, error: 'invalid_file_type' }, { status: 400 });
  }

  if (file.size < 1 || file.size > MAX_BYTES) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', { reason: 'invalid_size', size: file.size });
    return NextResponse.json(
      { success: false, error: file.size > MAX_BYTES ? 'file_too_large' : 'invalid_file' },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  const isPng = bytes.slice(0, 8).every((value, index) => value === pngSignature[index]);
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';

  if (
    (file.type === 'image/jpeg' && !isJpeg) ||
    (file.type === 'image/png' && !isPng) ||
    (file.type === 'image/webp' && !isWebp)
  ) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', {
      reason: 'invalid_file_signature',
      type: file.type,
      bytes: Array.from(bytes),
    });
    return NextResponse.json({ success: false, error: 'invalid_file_signature' }, { status: 400 });
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `applications/${crypto.randomUUID()}/photo.${extension}`;

  let supabase;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', { reason: 'server_misconfigured', err });
    return NextResponse.json({ success: false, error: 'server_misconfigured' }, { status: 500 });
  }

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', { reason: 'upload_failed', error });
    return NextResponse.json({ success: false, error: 'upload_failed', details: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return NextResponse.json({ success: true, url: data.publicUrl });
}
