import type { Metadata } from 'next';

// Deliberately generic and un-branded -- this is what shows up as the link
// preview card when the /survey URL is shared on Telegram or elsewhere,
// independent of whatever shortener wraps it. No mention of "Rahnamo" or
// the platform name, and no OG image: since neither this layout nor the
// root layout defines one, the card renders as plain text with no logo.
export const metadata: Metadata = {
  title: 'Career Interest Survey — 2 daqiqa',
  description: 'A short 2-minute survey about interest in 1-on-1 career mentorship and consultation.',
  openGraph: {
    title: 'Career Interest Survey — 2 daqiqa',
    description: 'A short 2-minute survey about interest in 1-on-1 career mentorship and consultation.',
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'Career Interest Survey — 2 daqiqa',
    description: 'A short 2-minute survey about interest in 1-on-1 career mentorship and consultation.',
  },
};

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
