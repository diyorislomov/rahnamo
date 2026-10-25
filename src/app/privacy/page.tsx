'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft, ShieldCheck, Mail, Building, MapPin, CheckCircle2 } from 'lucide-react';

interface PrivacySection {
  title: string;
  content: string;
}

export default function PrivacyPolicyPage() {
  const t = useTranslations('privacy');
  const tCommon = useTranslations('common');

  // Retrieve sections array from messages
  const sections = t.raw('sections') as PrivacySection[];

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-[#18181B] bg-white px-3.5 py-2 rounded-xl border border-zinc-900/10 mb-8 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {tCommon('backToHome')}
          </Link>

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t('lastUpdated')}</span>
            </div>
            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#0F1E36] tracking-tight">
              {t('title')}
            </h1>
            <p className="text-sm text-zinc-600 mt-3 max-w-xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </div>

          {/* Placeholders Card */}
          <div className="surface-card rounded-2xl p-5 mb-8 border border-amber-900/10 bg-amber-50/40 text-xs space-y-2 text-stone-700">
            <div className="font-bold text-stone-900 flex items-center gap-1.5 mb-2">
              <Building className="w-4 h-4 text-amber-700" /> Rasmiy Rekvizitlar va Aloqa:
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {t('placeholders.company')}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-700" /> {t('placeholders.address')}
              </span>
              <span className="flex items-center gap-1.5 font-medium font-mono">
                <Mail className="w-3.5 h-3.5 text-blue-600" /> {t('placeholders.email')}
              </span>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-6">
            {Array.isArray(sections) &&
              sections.map((section, idx) => (
                <div
                  key={idx}
                  className="surface-card rounded-2xl p-6 sm:p-7 border border-zinc-900/8 space-y-2.5 bg-white shadow-2xs"
                >
                  <h2 className="font-serif font-bold text-base sm:text-lg text-[#0F1E36]">
                    {section.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
