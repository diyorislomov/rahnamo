'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  Shield,
  Sparkles,
  Calendar,
  Globe,
  Award,
  Camera,
  Loader2,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { TRACKS, getTrackLabel } from '@/lib/specialties';

async function compressImage(file: File): Promise<File> {
  if (file.size <= 1024 * 1024) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function BecomeCounselorPage() {
  const t = useTranslations('becomeCounselor');
  const tCommon = useTranslations('common');
  const tSpecialties = useTranslations('specialties');

  // Earnings Calculator State
  const [sessionsPerWeek, setSessionsPerWeek] = useState(5);
  const [availableTracks, setAvailableTracks] = useState<{ slug: string; name_uz: string; icon: string }[]>(() =>
    TRACKS.map((t) => ({ slug: t.slug, name_uz: t.uz, icon: t.icon }))
  );

  useEffect(() => {
    fetch('/api/tracks')
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.tracks) && res.tracks.length > 0) {
          setAvailableTracks(res.tracks);
        }
      })
      .catch((err) => console.warn('[FETCH_TRACKS_FALLBACK]', err));
  }, []);
  const [sessionPrice, setSessionPrice] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [primaryTrack, setPrimaryTrack] = useState('');
  const [secondaryTracks, setSecondaryTracks] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState('');
  const [bio, setBio] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [consentPublished, setConsentPublished] = useState(false);
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

  const toggleSecondaryTrack = (slug: string) => {
    setSecondaryTracks((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), slug];
      }
      return [...prev, slug];
    });
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!photoUrl) {
      newErrors.photo = t('form.photoRequired');
    }

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = t('validation.fullName');
    }

    if (!headline.trim() || headline.trim().length < 5) {
      newErrors.headline = t('validation.headline');
    }

    if (!primaryTrack) {
      newErrors.primaryTrack = t('validation.primaryTrack');
    }

    if (!bio.trim() || bio.trim().length < 100) {
      newErrors.bio = t('validation.bio');
    }

    if (!proofLink.trim() || !/^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/.test(proofLink.trim())) {
      newErrors.proofLink = t('validation.proofLink');
    }

    if (!consentPublished) {
      newErrors.consent = t('validation.consent');
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
    // Let the same photo trigger another upload after a failed attempt.
    e.target.value = '';

    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setPhotoError(t('form.photoInvalidType'));
      return;
    }

    setPhotoError('');
    setUploadingPhoto(true);

    try {
      // Client-side compression to < 1 MB
      const compressed = await compressImage(file);
      if (compressed.size > 5 * 1024 * 1024) {
        throw new Error('file_too_large');
      }

      const form = new FormData();
      form.set('file', compressed);
      const response = await fetch('/api/applications/photo', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok || !result?.url) {
        throw new Error(result?.error || 'upload_failed');
      }
      setPhotoUrl(result.url);
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.photo;
        return copy;
      });
        } catch (error: unknown) {
      console.warn('[APPLICATION_PHOTO_UPLOAD_FAILED]', error);
      setUploadingPhoto(false);
      const errCode = error instanceof Error ? error.message : 'upload_failed';
      if (errCode === 'rate_limited') {
        setPhotoError("Juda ko'p rasm yuklash so'rovi yuborildi. Iltimos, biroz kutib qayta urinib ko'ring.");
      } else if (errCode === 'invalid_file_type' || errCode === 'invalid_file_signature') {
        setPhotoError("Faqat JPG, PNG yoki WebP formatidagi suratlarni yuklash mumkin.");
      } else if (errCode === 'file_too_large') {
        setPhotoError("Surat hajmi 5 MB dan oshmasligi kerak.");
      } else {
        setPhotoError("Suratni yuklab bo'lmadi. Qayta urinib ko'ring yoki boshqa rasm tanlang.");
      }
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

    // Combine primary track (first), secondary tracks, and sub-specialties
    const combinedSpecialtiesList = [
      primaryTrack,
      ...secondaryTracks.filter((s) => s !== primaryTrack),
      ...specialties.split(',').map((s) => s.trim()).filter(Boolean),
    ];
    const combinedSpecialties = combinedSpecialtiesList.join(', ');

    let cleanProofLink = proofLink.trim();
    if (!cleanProofLink.startsWith('http://') && !cleanProofLink.startsWith('https://')) {
      cleanProofLink = 'https://' + cleanProofLink;
    }

    const applicationData = {
      full_name: fullName,
      headline,
      specialties: combinedSpecialties,
      bio,
      telegram: cleanedTelegram,
      email,
      phone,
      proof_link: cleanProofLink,
      consent_published: new Date().toISOString(),
      expected_standard_price: parseInt(standardPrice, 10) || 45000,
      expected_premium_price: parseInt(premiumPrice, 10) || 130000,
      expected_price_per_question: pricePerQuestion.trim() ? parseInt(pricePerQuestion, 10) || null : null,
      expected_soft_cap: softCap.trim() ? parseInt(softCap, 10) || null : null,
      photo_url: photoUrl,
    };

        try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      });
      const result = await response.json().catch(() => null);

      console.log('[APPLICATION_SUBMIT_RESULT]', {
        status: response.status,
        statusText: response.statusText,
        result,
      });

      if (!response.ok || !result?.success) {
        console.error('[APPLICATION_SUBMIT_REAL_ERROR]', {
          status: response.status,
          error: result?.error,
          failedFields: result?.failedFields,
          details: result?.details,
        });
        setIsSubmitting(false);

        if (response.status === 429 || result?.error === 'rate_limited') {
          setSubmitError("Juda ko'p so'rov yuborildi. Iltimos, bir oz kuting va qaytadan urinib ko'ring.");
        } else if (result?.failedFields?.length) {
          const fieldMap: Record<string, string> = {
            full_name: 'Ism',
            headline: 'Kasb / Mansab',
            specialties: 'Yo\u2018nalish',
            bio: 'O\u2018zingiz haqingizda (bio)',
            telegram: 'Telegram',
            email: 'Email',
            phone: 'Telefon',
            photo_url: 'Surat',
            proof_link: 'Tajriba havolasi',
          };
          const translated = result.failedFields.map((f: string) => fieldMap[f] || f).join(', ');
          setSubmitError(`Quyidagi maydonlarda xatolik bor: ${translated}. Iltimos, tekshirib qayta yuboring.`);
        } else if (result?.details) {
          setSubmitError(`Xatolik: ${result.details}`);
        } else if (result?.error) {
          setSubmitError(`Xatolik: ${result.error}`);
        } else {
          setSubmitError("Arizani yuborishda xatolik yuz berdi. Iltimos, ma'lumotlarni tekshirib qayta yuboring.");
        }
        return;
      }
    } catch (error: unknown) {
      console.error('[APPLICATION_SUBMIT_NETWORK_ERROR]', error);
      setIsSubmitting(false);
      setSubmitError(`Aloqa xatosi: ${error instanceof Error ? error.message : "Internet aloqasini tekshiring"}`);
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
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#18181B] max-w-2xl mx-auto leading-[1.15]">
              {t('heroTitle')}
            </h1>
            <p className="mt-3.5 text-sm sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed">
              {t('heroSubtitle')}
            </p>
          </div>

          {/* Calculator Section */}
          <div className="surface-card p-6 sm:p-8 rounded-2xl mb-12 border border-zinc-900/10">
            <div className="text-center mb-6">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#0F4C5C] bg-[#0F4C5C]/8 px-2.5 py-1 rounded-full border border-[#0F4C5C]/15 font-semibold">
                {t('calculator.badge')}
              </span>
              <h2 className="font-serif font-bold text-2xl text-[#18181B] mt-2">
                {t('calculator.heading')}
              </h2>
              <p className="text-xs text-zinc-600 mt-1">{t('calculator.subheading')}</p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                  {t('calculator.priceLabel')}
                </label>
                <input
                  type="number"
                  step="5000"
                  min="20000"
                  value={sessionPrice}
                  onChange={(e) => setSessionPrice(e.target.value)}
                  placeholder={t('calculator.pricePlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-zinc-700">{t('calculator.weeklyLabel')}</span>
                  <span className="text-sm font-bold text-[#0F4C5C] font-mono">
                    {t('calculator.sessionsCount', { count: sessionsPerWeek })}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={sessionsPerWeek}
                  onChange={(e) => setSessionsPerWeek(parseInt(e.target.value, 10))}
                  className="w-full accent-[#0F4C5C] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-zinc-600 mt-1 font-mono">
                  <span>{t('calculator.sliderMin')}</span>
                  <span>{t('calculator.sliderMax')}</span>
                </div>
              </div>

              <div className="bg-[#0F4C5C]/5 border border-[#0F4C5C]/15 rounded-2xl p-5 text-center">
                <span className="text-xs font-medium text-zinc-600 block mb-1">
                  {t('calculator.monthlyLabel')}
                </span>
                <div className="text-3xl sm:text-4xl font-bold font-mono text-[#0F4C5C]">
                  {estimatedMonthlyEarnings.toLocaleString()}{' '}
                  <span className="text-xs sm:text-sm font-sans font-semibold text-zinc-500">
                    {t('calculator.perMonth')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-2">
                  {t('calculator.exampleNote', { price: effectiveSessionPrice.toLocaleString() })}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                  {t('calculator.commissionNote')}
                </p>
              </div>
            </div>
          </div>

          {/* Perks Grid */}
          <div className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.flexibleTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">{t('perks.flexibleBody')}</p>
              </div>

              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.remoteTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">{t('perks.remoteBody')}</p>
              </div>

              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.brandTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">{t('perks.brandBody')}</p>
              </div>

              <div className="surface-card p-6 rounded-2xl space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/8 text-[#0F4C5C] border border-[#0F4C5C]/15 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#18181B]">{t('perks.guaranteedTitle')}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">{t('perks.guaranteedBody')}</p>
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

              {/* Profile Photo (Optional, Non-blocking) */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1.5">
                  {t('form.photoLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-[#FFF8E7] border border-zinc-900/12 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/8 hover:bg-[#0F4C5C]/15 px-4 py-2.5 rounded-xl border border-[#0F4C5C]/15 transition-colors">
                    {uploadingPhoto && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {uploadingPhoto
                        ? t('form.photoUploading')
                        : photoUrl
                        ? t('form.photoChange')
                        : t('form.photoLabel')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">{t('form.photoHint')}</p>
                {photoError && <p className="text-xs text-red-600 mt-1 font-medium">{photoError}</p>}
                {errors.photo && <p className="text-xs text-red-600 mt-1 font-medium">{errors.photo}</p>}
              </div>

              {/* Full Name */}
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

              {/* Headline */}
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

              {/* Primary Track (Phase 3: Required, no default) */}
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                  {t('form.primaryTrackLabel')}
                </label>
                <select
                  value={primaryTrack}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setPrimaryTrack(chosen);
                    setSecondaryTracks((prev) => prev.filter((s) => s !== chosen));
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C] cursor-pointer"
                >
                  <option value="">-- {t('form.primaryTrackPlaceholder')} --</option>
                  {availableTracks.map((tItem) => (
                    <option key={tItem.slug} value={tItem.slug}>
                      {tItem.icon} {tSpecialties(tItem.slug) || tItem.name_uz}
                    </option>
                  ))}
                </select>
                {errors.primaryTrack && <p className="text-xs text-red-600 mt-1">{errors.primaryTrack}</p>}
              </div>

              {/* Secondary Tracks (Phase 3: Optional, up to 2) */}
              {primaryTrack && (
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                    {t('form.secondaryTracksLabel')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTracks.filter((tItem) => tItem.slug !== primaryTrack).map((tItem) => {
                      const isSelected = secondaryTracks.includes(tItem.slug);
                      return (
                        <button
                          key={tItem.slug}
                          type="button"
                          onClick={() => toggleSecondaryTrack(tItem.slug)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#0F4C5C] text-white border-[#0F4C5C]'
                              : 'bg-white text-zinc-700 border-zinc-900/12 hover:bg-[#F5EFE0]'
                          }`}
                        >
                          <span>{tItem.icon}</span>
                          <span>{tSpecialties(tItem.slug)}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Specialties */}
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
              </div>

              {/* Bio (Min 100 characters) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-zinc-700">{t('form.bioLabel')}</label>
                  <span
                    className={`text-[11px] font-mono ${
                      bio.trim().length >= 100 ? 'text-emerald-700 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    {bio.trim().length}/100 ta belgi
                  </span>
                </div>
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

              {/* Proof Link (Phase 2: Required, Admin-only visibility) */}
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1.5">
                  {t('form.proofLinkLabel')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={500}
                    value={proofLink}
                    onChange={(e) => setProofLink(e.target.value)}
                    placeholder={t('form.proofLinkPlaceholder')}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                  <LinkIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">{t('form.proofLinkHint')}</p>
                {errors.proofLink && <p className="text-xs text-red-600 mt-1">{errors.proofLink}</p>}
              </div>

              {/* Contact Information */}
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

              {/* Pricing */}
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

              {/* Consent Checkbox (Phase 2: Required) */}
              <div className="pt-3 border-t border-zinc-900/8">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentPublished}
                    onChange={(e) => setConsentPublished(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-[#0F4C5C] focus:ring-[#0F4C5C] accent-[#0F4C5C] cursor-pointer"
                  />
                  <span className="text-xs text-zinc-700 leading-relaxed">
                    {t('form.consentLabel')}
                  </span>
                </label>
                {errors.consent && <p className="text-xs text-red-600 mt-1">{errors.consent}</p>}
              </div>

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
