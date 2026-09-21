import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SITE_SESSION_COOKIE, verifySiteSession } from '@/lib/siteSession';

// Every exemption is its own independently-readable condition -- not
// folded into one regex -- so each is easy to verify in isolation. This
// is the single source of truth for what's exempt from the site-wide
// gate; the matcher below only excludes things that would break the gate
// page itself if blocked (Next's own static/image internals).
function isExempt(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true; // all API routes: survey inserts, admin's own gate, everything
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true; // admin has its own separate gate -- never double-gate it
  if (pathname === '/survey' || pathname.startsWith('/survey/')) return true; // the public survey page + its own sub-paths
  if (pathname === '/site-gate') return true; // the gate screen itself -- must never gate itself
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isExempt(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SITE_SESSION_COOKIE)?.value;
  if (verifySiteSession(token)) {
    return NextResponse.next();
  }

  const gateUrl = new URL('/site-gate', request.url);
  gateUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  // Only excludes Next.js internals and any request for a literal static
  // file (anything with a dot in it -- images, favicon, etc.), so the
  // gate page's own JS/CSS/logo can always load. All exemption logic
  // that actually matters (api/admin/survey/site-gate) lives in
  // isExempt() above, in one place, not split across this pattern too.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
