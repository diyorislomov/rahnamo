'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { CamelIcon } from '@/components/Icons';
import { ArrowLeft, CheckCircle2, UserCheck, Send, Mail, Phone, Shield, Sparkles, DollarSign, Calendar, Globe, Award, TrendingUp } from 'lucide-react';
import { SPECIALTY_CONFIG } from '@/lib/specialties';

const CATEGORY_KEYS = Object.keys(SPECIALTY_CONFIG).filter((k) => k !== 'All');

export default function BecomeCounselorPage() {
  const t = useTranslations('becomeCounselor');
  const tCommon = useTranslations('common');
  const tSpecialties = useTranslations('specialties');
  // Earnings Calculator State
  const [sessionsPerWeek, setSessionsPerWeek] = useState(5);
  const [avgPrice, setAvgPrice] = useState(120000);

  // Form State
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  // The homepage's filter pills compare a counselor's specialties array
  // against these exact English SPECIALTY_CONFIG keys -- previously this
  // page only collected free-text Uzbek specialties, so an approved
  // counselor could never match any category pill except "All". `category`
  // stores the real key; `specialties` stays free-text for the finer,
  // display-only sub-specialties shown on the counselor's card/profile.
  const [category, setCategory] = useState(CATEGORY_KEYS[0]);
  const [specialties, setSpecialties] = useState('');
  const [bio, setBio] = useState('');
  const [telegram, setTelegram] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [standardPrice, setStandardPrice] = useState('45000');
  const [premiumPrice, setPremiumPrice] = useState('130000');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Monthly Earnings Calculation
  const estimatedMonthlyEarnings = sessionsPerWeek * avgPrice * 4;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = t('validation.fullName');
    }

    if (!headline.trim() || headline.trim().length < 5) {
      newErrors.headline = t('validation.headline');
    }

    if (!specialties.trim()) {
      newErrors.specialties = t('validation.specialties');
    }

    if (!bio.trim() || bio.trim().length < 20) {
      newErrors.bio = t('validation.bio');
    }

    if (!telegram.trim()) {
      newErrors.telegram = t('validation.telegram');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = t('validation.email');
    }

    if (phone.replace(/\D/g, '').length < 9) {
      newErrors.phone = t('validation.phone');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError('');

    let cleanedTelegram = telegram.trim().replace(/^https?:\/\/t\.me\//, '');
    if (!cleanedTelegram.startsWith('@')) {
      cleanedTelegram = '@' + cleanedTelegram;
    }

    // `category` (a real SPECIALTY_CONFIG key) leads the comma list so it
    // survives admin's approve-time split into the counselor's specialties
    // array and actually matches the homepage's filter pills.
    const combinedSpecialties = [category, ...specialties.split(',').map((s) => s.trim()).filter(Boolean)].join(
      ', '
    );

    const applicationData = {
      full_name: fullName,
      headline,
      specialties: combinedSpecialties,
      bio,
      telegram: cleanedTelegram,
      email,
      phone,
      expected_standard_price: parseInt(standardPrice, 10) || 45000,
      expected_premium_price: parseInt(premiumPrice, 10) || 130000,
    };

    // Save locally (fallback store, independent of the outcome below)
    try {
      const existing = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
      localStorage.setItem('rahnamo_applications', JSON.stringify([applicationData, ...existing]));
    } catch (err) {
      console.error(err);
    }

    // The application write itself -- awaited on purpose. A rejected or lost
    // application with no visible error is a real trust cost (the applicant
    // walks away believing they applied when admin never saw it), so the
    // success screen must not appear unless this actually persisted.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const { data, error } = await supabase
        .from('counselor_applications')
        .insert(applicationData)
        .select('id')
        .single();

      if (error) {
        console.error('[APPLICATION_INSERT_FAILED]', error);
        try {
          const existing = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
          localStorage.setItem(
            'rahnamo_applications',
            JSON.stringify(existing.filter((a: { email: string }) => a.email !== applicationData.email))
          );
        } catch (err) {
          console.error(err);
        }
        setIsSubmitting(false);
        setSubmitError(t('submitError'));
        return;
      }

      // Captures the real DB-generated id and patches it into the just-saved
      // localStorage copy, so admin's reject/approve/delete actions (which
      // target a row by id) have a real one to match against even when
      // reading from the localStorage fallback rather than a live fetch.
      if (data?.id) {
        try {
          const existing = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
          if (existing[0] && !existing[0].id && existing[0].email === applicationData.email) {
            existing[0].id = data.id;
            localStorage.setItem('rahnamo_applications', JSON.stringify(existing));
          }
        } catch (err) {
          console.error(err);
        }
      }
    }

    // Telegram alert to admin -- secondary channel, doesn't block the
    // application itself, but a resolved-false (not just a thrown error) is
    // now logged distinctly so a silent failure doesn't go unnoticed.
    sendTelegramNotification({
      id: `APP-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: `${applicationData.full_name} (MENTOR ARIZASI)`,
      counselorName: applicationData.specialties || 'Yangi Mentor',
      tier: 'standard',
      price: applicationData.expected_standard_price,
      slot: 'Arizachi profilini ko\'rib chiqish',
      paymentMethod: 'ARIZA',
      phone: phone,
      telegram: telegram,
      email: email,
      education: applicationData.headline,
      question: `Bio: ${bio.slice(0, 120)}...`,
      meetLink: 'https://rahnamo-one.vercel.app/admin',
    })
      .then((ok) => {
        if (!ok) console.error('[TELEGRAM_NOTIFY_FAILED] application submitted, admin alert did not send');
      })
      .catch((err) => console.error('[TELEGRAM_NOTIFY_FAILED] application submitted, threw:', err));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-5xl mx-auto px-6 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60 mb-6 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> {tCommon('backToHome')}
          </Link>

          {/* Hero Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>{t('badge')}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-amber-950 leading-tight">
              {t('heroTitle')}
            </h1>
            <p className="text-stone-600 text-xs sm:text-base mt-3 max-w-2xl mx-auto">
              {t('heroSubtitle')}
            </p>
          </div>

          {/* MentorCruise Style Calculator & Perks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Left Col: Earnings Calculator */}
            <div className="md:col-span-1 bg-gradient-to-b from-[#1E1B4B] to-[#2A265F] text-amber-50 p-6 sm:p-8 rounded-3xl border border-amber-400/20 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4" /> {t('calculator.badge')}
                </div>
                <h3 className="font-serif font-bold text-xl text-amber-100 mt-2">
                  {t('calculator.heading')}
                </h3>
                <p className="text-xs text-amber-200/70 mt-1">
                  {t('calculator.subheading')}
                </p>

                {/* Slider */}
                <div className="my-6 space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{t('calculator.weeklyLabel')}</span>
                    <span className="text-amber-300 font-bold text-sm">{t('calculator.sessionsCount', { count: sessionsPerWeek })}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={sessionsPerWeek}
                    onChange={(e) => setSessionsPerWeek(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-amber-300/60">
                    <span>{t('calculator.sliderMin')}</span>
                    <span>{t('calculator.sliderMax')}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Result Card */}
              <div className="bg-white/10 border border-amber-300/20 p-4 rounded-2xl text-center">
                <span className="text-[11px] text-amber-200/80 uppercase font-semibold block">{t('calculator.monthlyLabel')}</span>
                <div className="text-2xl sm:text-3xl font-serif font-extrabold text-amber-300 mt-1">
                  ~{estimatedMonthlyEarnings.toLocaleString()} <span className="text-xs text-amber-100 font-normal">{t('calculator.perMonth')}</span>
                </div>
                <span className="text-[10px] text-amber-300/60 block mt-1">
                  {t('calculator.commissionNote')}
                </span>
              </div>
            </div>

            {/* Right Col: 4 Perks Cards */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">{t('perks.flexibleTitle')}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t('perks.flexibleBody')}
                </p>
              </div>

              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">{t('perks.remoteTitle')}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t('perks.remoteBody')}
                </p>
              </div>

              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">{t('perks.brandTitle')}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t('perks.brandBody')}
                </p>
              </div>

              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">{t('perks.guaranteedTitle')}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t('perks.guaranteedBody')}
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          {submitted ? (
            <div className="bg-white/95 rounded-3xl p-8 border-2 border-emerald-500/30 text-center shadow-md animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-amber-950">{t('success.title')}</h3>
              <p className="text-stone-600 text-xs sm:text-sm mt-2 max-w-md mx-auto">
                {t.rich('success.body', {
                  name: fullName,
                  telegram: telegram,
                  b: (chunks) => <span className="font-bold">{chunks}</span>,
                })}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/"
                  className="bg-amber-900 hover:bg-amber-800 text-amber-50 font-semibold text-xs px-6 py-3 rounded-xl transition-all"
                >
                  {tCommon('returnHome')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/95 p-6 sm:p-8 rounded-3xl border border-amber-900/15 shadow-sm space-y-5">
              <h2 className="font-serif font-bold text-xl text-amber-950 flex items-center gap-2 border-b border-amber-900/10 pb-3">
                <UserCheck className="w-5 h-5 text-amber-800" /> {t('form.heading')}
              </h2>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">{t('form.fullNameLabel')}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('form.fullNamePlaceholder')}
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">{t('form.headlineLabel')}</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder={t('form.headlinePlaceholder')}
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.headline && <p className="text-[11px] text-red-600 mt-1">{errors.headline}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">{t('form.categoryLabel')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700 cursor-pointer"
                >
                  {CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {SPECIALTY_CONFIG[key].icon} {tSpecialties(key)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-400 mt-1">
                  {t('form.categoryHint')}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">{t('form.specialtiesLabel')}</label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder={t('form.specialtiesPlaceholder')}
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.specialties && <p className="text-[11px] text-red-600 mt-1">{errors.specialties}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">{t('form.bioLabel')}</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('form.bioPlaceholder')}
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.bio && <p className="text-[11px] text-red-600 mt-1">{errors.bio}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-900/10">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block">{t('form.telegramLabel')}</label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder={t('form.telegramPlaceholder')}
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                  {errors.telegram && <p className="text-[11px] text-red-600 mt-1">{errors.telegram}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block">{t('form.phoneLabel')}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('form.phonePlaceholder')}
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">{t('form.emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('form.emailPlaceholder')}
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-900/10">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block">{t('form.standardPriceLabel')}</label>
                  <input
                    type="number"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block">{t('form.premiumPriceLabel')}</label>
                  <input
                    type="number"
                    value={premiumPrice}
                    onChange={(e) => setPremiumPrice(e.target.value)}
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-xl px-3.5 py-2.5">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-70 mt-4"
              >
                {isSubmitting ? t('form.submitting') : t('form.submit')}
              </button>
            </form>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
