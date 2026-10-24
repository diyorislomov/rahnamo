import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
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
  title: "MyRahnamo — Central Asia Career Growth Platform",
  description: "Maqsadingizdan boshlang: mos Rahnamo, aniq keyingi qadamlar va karyera imkoniyatlarini toping.",
  openGraph: {
    title: 'MyRahnamo — Central Asia Career Growth Platform',
    description: "Maqsadingizdan boshlang: mos Rahnamo, aniq keyingi qadamlar va karyera imkoniyatlarini toping.",
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
            {children}
            <StaleBuildWatcher />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
