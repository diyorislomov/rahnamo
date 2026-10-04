import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import StaleBuildWatcher from "@/components/StaleBuildWatcher";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://myrahnamo.com'),
  title: "Rahnamo - Silk Road Career Mentors",
  description: "Yo'lingizni o'z sohasining yetuk ustozlari bilan toping",
  openGraph: {
    title: 'Rahnamo - Silk Road Career Mentors',
    description: "Yo'lingizni o'z sohasining yetuk ustozlari bilan toping",
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            {children}
            <StaleBuildWatcher />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
