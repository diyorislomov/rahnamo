import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import PostgresAdapter from '@auth/pg-adapter';
import { postgres } from '@/lib/postgres';

type TelegramProfile = {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
};

const Telegram = {
  id: 'telegram',
  name: 'Telegram',
  type: 'oidc' as const,
  issuer: 'https://oauth.telegram.org',
  clientId: process.env.AUTH_TELEGRAM_ID as string,
  clientSecret: process.env.AUTH_TELEGRAM_SECRET as string,
  authorization: { params: { scope: 'openid profile' } },
  profile(profile: TelegramProfile) {
    return {
      id: profile.sub,
      name: profile.name || profile.preferred_username || `Telegram ${profile.sub}`,
      email: null,
      image: profile.picture || null,
    };
  },
};

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const telegramConfigured = Boolean(process.env.AUTH_TELEGRAM_ID && process.env.AUTH_TELEGRAM_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(postgres),
  session: { strategy: 'database' },
  trustHost: true,
  providers: [
    ...(googleConfigured ? [Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    })] : []),
    ...(telegramConfigured ? [Telegram] : []),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = String(user.id);
      return session;
    },
  },
});
