import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://myrahnamo.com';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/mentor/dashboard', '/mentor/set-password', '/my-bookings'],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
