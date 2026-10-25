import { readImage, uploadNamePattern } from '@/lib/localUploads';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!uploadNamePattern.test(name)) return new Response('Not found', { status: 404 });
  try {
    const data = await readImage(name);
    const type = name.endsWith('.png')
      ? 'image/png'
      : name.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
