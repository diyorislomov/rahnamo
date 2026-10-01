import 'server-only';

export function isAllowedAvatarUrl(value: string): boolean {
  try {
    const avatar = new URL(value);
    if (avatar.protocol === 'https:' && avatar.hostname === 'images.unsplash.com') return true;
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!projectUrl || projectUrl.includes('placeholder')) return false;
    const project = new URL(projectUrl);
    return (
      avatar.protocol === 'https:' &&
      avatar.origin === project.origin &&
      avatar.pathname.startsWith('/storage/v1/object/public/avatars/')
    );
  } catch {
    return false;
  }
}
