import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }];
  },
  allowedDevOrigins: [
    "192.168.100.221",
    "192.168.100.221:3000",
    "localhost:3000",
    "127.0.0.1:3000"
  ],
  // Vercel sets this automatically on every deploy -- no manual bumping.
  // Bakes into the client bundle at build time, so a tab's own copy is
  // frozen at whatever commit was live when that tab last actually loaded
  // its JS, letting it be compared against /api/build-version's always-
  // current answer to detect a stale tab.
  env: {
    NEXT_PUBLIC_BUILD_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

export default withNextIntl(nextConfig);
