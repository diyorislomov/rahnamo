import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import StaleBuildWatcher from "@/components/StaleBuildWatcher";
import AuthProvider from "@/components/AuthProvider";
import { NetworkProvider } from '@/components/network/NetworkProvider';
import "./globals.css";
import './network.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://myrahnamo.com'),
  title: "Rahnamo — Hamjamiyat va mentorlik",
  description: "Tajribangizni ulashing. O‘z sohangizdagi odamlar va mentorlar bilan tanishing.",
  openGraph: {
    title: 'Rahnamo — Hamjamiyat va mentorlik',
    description: "Tajribangizni ulashing. O‘z sohangizdagi odamlar va mentorlar bilan tanishing.",
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${jakartaSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <NetworkProvider>
            {children}
            <StaleBuildWatcher />
            </NetworkProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
