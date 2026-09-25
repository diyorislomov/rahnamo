import { redirect } from 'next/navigation';

// The site is public. Keep old bookmarks safe without accepting redirect URLs.
export default function SiteGatePage() {
  redirect('/');
}
