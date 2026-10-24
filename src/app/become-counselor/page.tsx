'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft, CheckCircle2, UserCheck, Shield, Sparkles, Calendar, Globe, Award, TrendingUp, Camera, Loader2 } from 'lucide-react';
import { SPECIALTY_CONFIG } from '@/lib/specialties';

const CATEGORY_KEYS = Object.keys(SPECIALTY_CONFIG).filter((k) => k !== 'All');

export default function BecomeCounselorPage() {
  const t = useTranslations('becomeCounselor');
  const tCommon = useTranslations('common');
  const tSpecialties = useTranslations('specialties');
  // Earnings Calculator State
  const [sessionsPerWeek, setSessionsPerWeek] = useState(5);
  const [sessionPrice, setSessionPrice] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [category, setCategory] = useState(CATEGORY_KEYS[0]);
  const [specialties, setSpecialties] = useState('');
  const [bio, setBio] = useState('');
  const [telegram, setTelegram] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [standardPrice, setStandardPrice] = useState('45000');
  const [premiumPrice, setPremiumPrice] = useState('130000');
  const [pricePerQuestion, setPricePerQuestion] = useState('');
  const [softCap, setSoftCap] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Monthly Earnings Calculation
  const EXAMPLE_SESSION_PRICE = 50000;
  const PLATFORM_COMMISSION_RATE = 0.15;
  const parsedSessionPrice = parseInt(sessionPrice, 10);
  const isRealPrice = Number.isFinite(parsedSessionPrice) && parsedSessionPrice > 0;
  const effectiveSessionPrice = isRealPrice ? parsedSessionPrice : EXAMPLE_SESSION_PRICE;
  const estimatedMonthlyEarnings = Math.round(
    effectiveSessionPrice * sessionsPerWeek * 4 * (1 - PLATFORM_COMMISSION_RATE)
  );

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    setUploadingPhoto(true);

    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/applications/photo', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok || !result?.url) throw new Error(result.error || 'upload_failed');
      setPhotoUrl(result.url);
    } catch (error) {
      console.error('[APPLICATION_PHOTO_UPLOAD_FAILED]', error);
      setUploadingPhoto(false);
      setPhotoError(t('form.photoUploadFailed'));
      return;
    }
    setUploadingPhoto(false);
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
      expected_price_per_question: pricePerQuestion.trim() ? parseInt(pricePerQuestion, 10) || null : null,
      expected_soft_cap: softCap.trim() ? parseInt(softCap, 10) || null : null,
      photo_url: photoUrl || null,
    };

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'submit_failed');
    } catch (error) {
      console.error('[APPLICATION_SUBMIT_FAILED]', error);
      setIsSubmitting(false);
      setSubmitError(t('submitError'));
      return;
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased flex flex-col justify-between overflow-x-hidden">
      <div>
        <Navbar />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-[#18181B] bg-white px-3.5 py-2 rounded-xl border border-zinc-900/10 mb-8 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {tCommon('backToHome')}
          </Link>

          {/* Hero Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-900/10 text-[#0F4C5C] text-[11px] font-mono uppercase tracking-[0.14em] font-semibold mb-4 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A84B]" />
              <span>{t('badge')}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#18181B] tracking-tight leading-tight">
              {t('heroTitle')}
            </h1>
            <p className="text-zinc-600 text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
              {t('heroSubtitle')}
            </p>
          </div>

          {/* Calculator & Perks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            {/* Left Col: Earnings Calculator */}
            <div className="md:col-span-1 bg-[#0F4C5C] text-white p-6 sm:p-7 rounded-2xl border border-[#D4A84B]/30 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#D4A84B] text-[11px] font-mono font-semibold uppercase tracking-[0.14em]">
                  <TrendingUp className="w-4 h-4" /> {t('calculator.badge')}
                </div>
                <h3 className="font-serif font-bold text-xl text-white mt-2">
                  {t('calculator.heading')}
                </h3>
                <p className="text-xs text-zinc-200/80 mt-1 leading-relaxed">
                  {t('calculator.subheading')}
                </p>

                {/* Session price input */}
                <div className="mt-5 space-y-1.5">
                  <label className="text-xs font-medium text-zinc-200 block">{t('calculator.priceLabel')}</label>
                  <input
                    type="number"
                    min={20000}
                    step={5000}
                    value={sessionPrice}
                    onChange={(e) => setSessionPrice(e.target.value)}
                    placeholder={t('calculator.pricePlaceholder')}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-white/10 border border-white/20 rounded-xl outline-none focus:border-[#D4A84B] placeholder:text-white/40 placeholder:font-sans placeholder:font-normal text-white"
                  />
                </div>

                {/* Slider */}
                <div className="my-6 space-y-3">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-200">{t('calculator.weeklyLabel')}</span>
                    <span className="text-[#D4A84B] font-mono font-bold text-sm">{t('calculator.sessionsCount', { count: sessionsPerWeek })}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={sessionsPerWeek}
                    onChange={(e) => setSessionsPerWeek(parseInt(e.target.value, 10))}
                    className="w-full accent-[#D4A84B] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-300/70">
                    <span>{t('calculator.sliderMin')}</span>
                    <span>{t('calculator.sliderMax')}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Result Card */}
              <div className="bg-[#09323D] border border-white/12 p-4 rounded-xl text-center">
                <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-semibold block">{t('calculator.monthlyLabel')}</span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#D4A84B] mt-1">
                  ~{estimatedMonthlyEarnings.toLocaleString()} <span className="text-xs text-white font-sans font-normal">{t('calculator.perMonth')}</span>
                </div>
                {!isRealPrice && (
                  <span className="text-[10px] text-zinc-300/70 block mt-1">
                    {t('calculator.exampleNote', { price: EXAMPLE_SESSION_PRICE.toLocaleString() })}
                  </span>
                )}
                <span className="text-[10px] text-zinc-300/70 block mt-1">
                  {t('calculator.commissionNote')}
                </span>
              </div>
            </div>

            {/* Right Col: 4 Perks Cards */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.flexibleTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {t('perks.flexibleBody')}
                </p>
              </div>

              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.remoteTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {t('perks.remoteBody')}
                </p>
              </div>

              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.brandTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {t('perks.brandBody')}
                </p>
              </div>

              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.guaranteedTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {t('perks.guaranteedBody')}
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          {submitted ? (
            <div className="surface-card rounded-2xl p-8 border-2 border-emerald-500/30 text-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-[#18181B]">{t('success.title')}</h3>
              <p className="text-zinc-600 text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed">
                {t.rich('success.body', {
                  name: fullName,
                  telegram: telegram,
                  b: (chunks) => <span className="font-bold text-[#18181B]">{chunks}</span>,
                })}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/"
                  className="bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-xs px-6 py-3 rounded-xl transition-colors"
                >
                  {tCommon('returnHome')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="surface-card p-6 sm:p-8 rounded-2xl space-y-5">
              <h2 className="font-serif font-bold text-xl text-[#18181B] flex items-center gap-2.5 border-b border-zinc-900/8 pb-4">
                <UserCheck className="w-5 h-5 text-[#0F4C5C]" /> {t('form.heading')}
              </h2>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.fullNameLabel')}</label>
                <input
                  type="text"
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('form.fullNamePlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
                {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.photoLabel')}</label>
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF8E7] border border-zinc-900/12 flex items-center justify-center overflow-hidden shrink-0">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/8 hover:bg-[#0F4C5C]/15 px-4 py-2.5 rounded-xl border border-[#0F4C5C]/15 transition-colors">
                    {uploadingPhoto && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{uploadingPhoto ? t('form.photoUploading') : photoUrl ? t('form.photoChange') : t('form.photoLabel')}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
                  </label>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">{t('form.photoHint')}</p>
                {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.headlineLabel')}</label>
                <input
                  type="text"
                  maxLength={200}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder={t('form.headlinePlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
                {errors.headline && <p className="text-xs text-red-600 mt-1">{errors.headline}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.categoryLabel')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C] cursor-pointer"
                >
                  {CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {SPECIALTY_CONFIG[key].icon} {tSpecialties(key)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {t('form.categoryHint')}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.specialtiesLabel')}</label>
                <input
                  type="text"
                  maxLength={500}
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder={t('form.specialtiesPlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
                {errors.specialties && <p className="text-xs text-red-600 mt-1">{errors.specialties}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.bioLabel')}</label>
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('form.bioPlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
                {errors.bio && <p className="text-xs text-red-600 mt-1">{errors.bio}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-900/8">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.telegramLabel')}</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder={t('form.telegramPlaceholder')}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                  {errors.telegram && <p className="text-xs text-red-600 mt-1">{errors.telegram}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.phoneLabel')}</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('form.phonePlaceholder')}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.emailLabel')}</label>
                <input
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('form.emailPlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900/8">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.standardPriceLabel')}</label>
                  <input
                    type="number"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.premiumPriceLabel')}</label>
                  <input
                    type="number"
                    value={premiumPrice}
                    onChange={(e) => setPremiumPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.pricePerQuestionLabel')}</label>
                  <input
                    type="number"
                    min={0}
                    value={pricePerQuestion}
                    onChange={(e) => setPricePerQuestion(e.target.value)}
                    placeholder={t('form.pricePerQuestionPlaceholder')}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('form.softCapLabel')}</label>
                  <input
                    type="number"
                    min={1}
                    value={softCap}
                    onChange={(e) => setSoftCap(e.target.value)}
                    placeholder={t('form.softCapPlaceholder')}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 -mt-2">
                {t('form.pricePerQuestionHint')}
              </p>

              {submitError && (
                <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-70 mt-4"
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
