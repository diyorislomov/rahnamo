import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

function supabaseImageHostname(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co').hostname;
  } catch {
    return 'example.supabase.co';
  }
}

function contentSecurityPolicy(): string {
  const projectOrigin = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co').origin;
    } catch {
      return 'https://example.supabase.co';
    }
  })();
  const websocketOrigin = projectOrigin.replace(/^http/, 'ws');
  const scriptSources = process.env.NODE_ENV === 'production'
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://images.unsplash.com ${projectOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${projectOrigin} ${websocketOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: supabaseImageHostname(), pathname: '/storage/v1/object/public/avatars/**' },
    ],
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
