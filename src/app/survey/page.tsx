'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/counselors';
import { ArrowLeft, ClipboardList, CheckCircle2, Sparkles } from 'lucide-react';

const AGE_RANGES = ["18 dan kichik", '18-24', '25-34', '35-44', "45 va undan katta"];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'student', label: 'Talaba' },
  { value: 'graduate', label: "Bitirgan (universitetni tugatgan)" },
  { value: 'working', label: 'Ishlayapman' },
  { value: 'other', label: 'Boshqa' },
];

const INTEREST_AREA_OPTIONS: { value: string; label: string }[] = [
  { value: 'Medicine', label: 'Tibbiyot' },
  { value: 'Law', label: 'Huquq' },
  { value: 'Architecture', label: 'Arxitektura' },
  { value: 'IT/Programming', label: "IT / Dasturlash" },
  { value: 'Grants & Scholarships', label: "Xalqaro Grantlar va Stipendiyalar" },
  { value: 'Agriculture', label: "Qishloq xo'jaligi" },
  { value: 'Business', label: 'Biznes' },
  { value: 'Other', label: 'Boshqa' },
];

const ADVICE_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Friends', label: "Do'stlar" },
  { value: 'Family', label: 'Oila' },
  { value: 'Internet forums', label: 'Internet forumlar' },
  { value: 'No one', label: 'Hech kim' },
  { value: 'Other', label: 'Boshqa' },
];

const INTEREST_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'Yes definitely', label: 'Ha, albatta' },
  { value: 'Maybe', label: 'Balki' },
  { value: 'Not interested', label: 'Qiziqmayman' },
];

const PRICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Under 10,000', label: "10,000 so'mdan kam" },
  { value: '10,000-30,000', label: "10,000 - 30,000 so'm" },
  { value: '30,000-50,000', label: "30,000 - 50,000 so'm" },
  { value: '50,000-100,000', label: "50,000 - 100,000 so'm" },
  { value: '100,000+', label: "100,000 so'mdan ko'p" },
];

const FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Text chat', label: 'Matnli chat' },
  { value: 'Video call', label: "Video qo'ng'iroq" },
];

const inputClass =
  'w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700';
const labelClass = 'text-xs font-semibold text-stone-700 block';

export default function SurveyPage() {
  const [ageRange, setAgeRange] = useState('');
  const [status, setStatus] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [interestArea, setInterestArea] = useState('');
  const [interestAreaOther, setInterestAreaOther] = useState('');
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [priorAdviceSource, setPriorAdviceSource] = useState('');
  const [priorAdviceSourceOther, setPriorAdviceSourceOther] = useState('');
  const [interestedInService, setInterestedInService] = useState('');
  const [priceWillingness, setPriceWillingness] = useState('');
  const [preferredFormat, setPreferredFormat] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [willingToRefer, setWillingToRefer] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!interestedInService) {
      newErrors.interestedInService = 'Iltimos, javob tanlang.';
    }
    if (!contactInfo.trim()) {
      newErrors.contactInfo = "Telegram username yoki emailingizni kiriting.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError('');

    // No localStorage fallback here on purpose -- unlike the booking and
    // application forms (which predate a reliable Supabase connection and
    // carry a local-cache fallback for that reason), this is a brand-new
    // form with no such history. A real error is shown on failure instead
    // of a fallback that could quietly mask one.
    if (!isSupabaseConfigured()) {
      setIsSubmitting(false);
      setSubmitError("So'rovnoma hozircha ishlamayapti. Birozdan so'ng qayta urinib ko'ring.");
      return;
    }

    const { error } = await supabase.from('survey_responses').insert({
      age_range: ageRange || null,
      status: status || null,
      field_of_study: fieldOfStudy.trim() || null,
      interest_area: interestArea === 'Other' ? interestAreaOther.trim() || 'Other' : interestArea || null,
      biggest_challenge: biggestChallenge.trim() || null,
      prior_advice_source:
        priorAdviceSource === 'Other' ? priorAdviceSourceOther.trim() || 'Other' : priorAdviceSource || null,
      interested_in_service: interestedInService,
      price_willingness: priceWillingness || null,
      preferred_format: preferredFormat || null,
      contact_info: contactInfo.trim(),
      willing_to_refer: willingToRefer,
    });

    if (error) {
      console.error('[SURVEY_INSERT_FAILED]', error);
      setIsSubmitting(false);
      setSubmitError(
        "So'rovnomani yuborishda xatolik yuz berdi. Internet aloqangizni tekshirib qayta urinib ko'ring."
      );
      return;
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-3xl mx-auto px-6 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60 mb-6 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Bosh sahifa
          </Link>

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>2 daqiqalik so&apos;rovnoma</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-amber-950 leading-tight">
              Fikringiz biz uchun muhim
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm mt-3 max-w-xl mx-auto">
              Rahnamo platformasini yaxshilash uchun quyidagi qisqa so&apos;rovnomani to&apos;ldiring. Barcha javoblar
              maxfiy saqlanadi.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white/95 rounded-3xl p-8 border-2 border-emerald-500/30 text-center shadow-md animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-amber-950">Rahmat!</h3>
              <p className="text-stone-600 text-xs sm:text-sm mt-2 max-w-md mx-auto">
                Javoblaringiz muvaffaqiyatli qabul qilindi. Fikringiz Rahnamo platformasini yaxshilashda bizga
                yordam beradi.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/"
                  className="bg-amber-900 hover:bg-amber-800 text-amber-50 font-semibold text-xs px-6 py-3 rounded-xl transition-all"
                >
                  Bosh sahifaga qaytish
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/95 p-6 sm:p-8 rounded-3xl border border-amber-900/15 shadow-sm space-y-5">
              <h2 className="font-serif font-bold text-xl text-amber-950 flex items-center gap-2 border-b border-amber-900/10 pb-3">
                <ClipboardList className="w-5 h-5 text-amber-800" /> So&apos;rovnoma
              </h2>

              <div>
                <label className={labelClass}>Yosh oralig&apos;ingiz</label>
                <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">-- Tanlang --</option>
                  {AGE_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Siz kimsiz?</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">-- Tanlang --</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Mutaxassisligingiz / o&apos;qish sohangiz (ixtiyoriy)</label>
                <input
                  type="text"
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  placeholder="Masalan: Tibbiyot instituti, 3-kurs"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Qaysi sohaga qiziqasiz?</label>
                <select
                  value={interestArea}
                  onChange={(e) => setInterestArea(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">-- Tanlang --</option>
                  {INTEREST_AREA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {interestArea === 'Other' && (
                  <input
                    type="text"
                    value={interestAreaOther}
                    onChange={(e) => setInterestAreaOther(e.target.value)}
                    placeholder="Qaysi soha? Yozing..."
                    className={`${inputClass} mt-2`}
                  />
                )}
              </div>

              <div>
                <label className={labelClass}>Karyerangizdagi eng katta qiyinchilik nima? (ixtiyoriy)</label>
                <textarea
                  rows={3}
                  value={biggestChallenge}
                  onChange={(e) => setBiggestChallenge(e.target.value)}
                  placeholder="Fikringizni yozing..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Hozirgacha kimdan maslahat olgansiz?</label>
                <select
                  value={priorAdviceSource}
                  onChange={(e) => setPriorAdviceSource(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">-- Tanlang --</option>
                  {ADVICE_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {priorAdviceSource === 'Other' && (
                  <input
                    type="text"
                    value={priorAdviceSourceOther}
                    onChange={(e) => setPriorAdviceSourceOther(e.target.value)}
                    placeholder="Kimdan? Yozing..."
                    className={`${inputClass} mt-2`}
                  />
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Rahnamo kabi 1-ga-1 konsultatsiya xizmatidan foydalanishga qiziqasizmi? *
                </label>
                <select
                  value={interestedInService}
                  onChange={(e) => {
                    setInterestedInService(e.target.value);
                    if (errors.interestedInService) setErrors((prev) => ({ ...prev, interestedInService: '' }));
                  }}
                  className={`${inputClass} cursor-pointer ${errors.interestedInService ? 'border-red-500 bg-red-50/20' : ''}`}
                >
                  <option value="">-- Tanlang --</option>
                  {INTEREST_LEVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {errors.interestedInService && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.interestedInService}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Bir konsultatsiya uchun qancha to&apos;lashga tayyorsiz?</label>
                <select
                  value={priceWillingness}
                  onChange={(e) => setPriceWillingness(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">-- Tanlang --</option>
                  {PRICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Qaysi formatni afzal ko&apos;rasiz?</label>
                <select
                  value={preferredFormat}
                  onChange={(e) => setPreferredFormat(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">-- Tanlang --</option>
                  {FORMAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-amber-900/10">
                <label className={labelClass}>Telegram username yoki emailingiz *</label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => {
                    setContactInfo(e.target.value);
                    if (errors.contactInfo) setErrors((prev) => ({ ...prev, contactInfo: '' }));
                  }}
                  placeholder="@username yoki ism@domain.com"
                  className={`${inputClass} ${errors.contactInfo ? 'border-red-500 bg-red-50/20' : ''}`}
                />
                {errors.contactInfo && <p className="text-[11px] text-red-600 mt-1">{errors.contactInfo}</p>}
                <p className="text-[10px] text-stone-400 mt-1">
                  Xizmat ishga tushganda birinchilardan bo&apos;lib xabardor bo&apos;lish uchun.
                </p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={willingToRefer}
                  onChange={(e) => setWillingToRefer(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-800 cursor-pointer"
                />
                <span className="text-xs text-stone-700">
                  Agar xizmatni foydali deb topsam, do&apos;stlarimga tavsiya qilishga tayyorman.
                </span>
              </label>

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
                {isSubmitting ? 'Yuborilmoqda...' : "So'rovnomani yuborish"}
              </button>
            </form>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
