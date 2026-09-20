import { NextResponse } from 'next/server';

// Always reflects the commit actually running THIS serverless function right
// now -- unlike a client's own NEXT_PUBLIC_BUILD_VERSION, which is frozen at
// whatever was live when that tab last loaded its JS.
export async function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA || 'dev' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
