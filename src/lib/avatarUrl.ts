import 'server-only';
export function isAllowedAvatarUrl(value: string): boolean {
  if (/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(value)) return true;
  try {
    const avatar = new URL(value);
    return avatar.protocol === 'https:' && avatar.hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}
