import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://myrahnamo.com';
  return ['/', '/become-counselor', '/forum', '/login', '/signup', '/survey'].map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: path === '/' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
