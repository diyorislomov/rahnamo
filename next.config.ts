import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { execFileSync } from "node:child_process";

const withNextIntl = createNextIntlPlugin();

function currentBuildVersion(): string {
  if (process.env.VERCEL && process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() || 'dev';
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
  }
}

const buildVersion = currentBuildVersion();

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
  // Vercel supplies its commit SHA. Self-hosted builds read the checked-out
  // Git HEAD so a stale VERCEL_GIT_COMMIT_SHA cannot leak across deploys.
  // This is baked into the client bundle at build time, so a tab's own copy is
  // frozen at whatever commit was live when that tab last actually loaded
  // its JS, letting it be compared against /api/build-version's always-
  // current answer to detect a stale tab.
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
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
