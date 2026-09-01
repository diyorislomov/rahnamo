'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { CamelIcon } from '@/components/Icons';
import { ArrowLeft, CheckCircle2, UserCheck, Send, Mail, Phone, Shield, Sparkles, DollarSign, Calendar, Globe, Award, TrendingUp } from 'lucide-react';

export default function BecomeCounselorPage() {
  // Earnings Calculator State
  const [sessionsPerWeek, setSessionsPerWeek] = useState(5);
  const [avgPrice, setAvgPrice] = useState(120000);

  // Form State
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
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

  // Monthly Earnings Calculation
  const estimatedMonthlyEarnings = sessionsPerWeek * avgPrice * 4;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = "Ism va familiyangizni kiriting.";
    }

    if (!headline.trim() || headline.trim().length < 5) {
      newErrors.headline = "Lavozim va sohangizni yozing (masalan: Senior Architect | Ex-Ankara).";
    }

    if (!specialties.trim()) {
      newErrors.specialties = "Yo'nalishlaringizni vergul bilan kiriting.";
    }

    if (!bio.trim() || bio.trim().length < 20) {
      newErrors.bio = "Tajribangiz haqida biroz batafsil yozing (kamida 20 ta belgi).";
    }

    if (!telegram.trim()) {
      newErrors.telegram = "Telegram username-ingizni kiriting.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = "To'g'ri email kiriting.";
    }

    if (phone.replace(/\D/g, '').length < 9) {
      newErrors.phone = "Telefon raqamingizni to'liq kiriting.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    let cleanedTelegram = telegram.trim().replace(/^https?:\/\/t\.me\//, '');
    if (!cleanedTelegram.startsWith('@')) {
      cleanedTelegram = '@' + cleanedTelegram;
    }

    const applicationData = {
      full_name: fullName,
      headline,
      specialties,
      bio,
      telegram: cleanedTelegram,
      email,
      phone,
      expected_standard_price: parseInt(standardPrice, 10) || 45000,
      expected_premium_price: parseInt(premiumPrice, 10) || 130000,
    };

    // Save locally
    try {
      const existing = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
      localStorage.setItem('rahnamo_applications', JSON.stringify([applicationData, ...existing]));
    } catch (err) {
      console.error(err);
    }

    // Save to Supabase (if configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      Promise.resolve(supabase.from('counselor_applications').insert(applicationData))
        .catch((err) => console.warn('Supabase app insert:', err));
    }

    // Send Telegram Notification to Admin
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
    }).catch((err) => console.warn('Telegram notify error:', err));

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
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
            <ArrowLeft className="w-4 h-4" /> Bosh sahifa
          </Link>

          {/* Hero Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>MentorCruise darajasidagi platforma</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-amber-950 leading-tight">
              Rahnamo bo'lib o'zingiz xohlagan grafikda daromad oling
            </h1>
            <p className="text-stone-600 text-xs sm:text-base mt-3 max-w-2xl mx-auto">
              Markaziy Osiyoning iqtidorli yoshlariga 1-ga-1 yo'l-yo'riq ko'rsating, shaxsiy brendingizni rivojlantiring va bo'sh vaqtingizda daromadga ega bo'ling.
            </p>
          </div>

          {/* MentorCruise Style Calculator & Perks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Left Col: Earnings Calculator */}
            <div className="md:col-span-1 bg-gradient-to-b from-[#1E1B4B] to-[#2A265F] text-amber-50 p-6 sm:p-8 rounded-3xl border border-amber-400/20 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4" /> Daromad kalkulyatori
                </div>
                <h3 className="font-serif font-bold text-xl text-amber-100 mt-2">
                  Qancha daromad olishingiz mumkin?
                </h3>
                <p className="text-xs text-amber-200/70 mt-1">
                  Haftasiga necha soat konsultatsiya bera olasiz?
                </p>

                {/* Slider */}
                <div className="my-6 space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Haftalik qabullar:</span>
                    <span className="text-amber-300 font-bold text-sm">{sessionsPerWeek} ta sessiya</span>
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
                    <span>1 sessiya</span>
                    <span>20 sessiya</span>
                  </div>
                </div>
              </div>

              {/* Monthly Result Card */}
              <div className="bg-white/10 border border-amber-300/20 p-4 rounded-2xl text-center">
                <span className="text-[11px] text-amber-200/80 uppercase font-semibold block">Taxminiy oylik daromad</span>
                <div className="text-2xl sm:text-3xl font-serif font-extrabold text-amber-300 mt-1">
                  ~{estimatedMonthlyEarnings.toLocaleString()} <span className="text-xs text-amber-100 font-normal">UZS / oy</span>
                </div>
                <span className="text-[10px] text-amber-300/60 block mt-1">
                  *Platforma komissiyasi ayirilgan
                </span>
              </div>
            </div>

            {/* Right Col: 4 Perks Cards */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">100% Moslashuvchan Grafik</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Qachon va qaysi soatlarda konsultatsiya berishni o'zingiz hal qilasiz. Dam olish kunlari yoki kechki payt 30 minut ajratish kifoya.
                </p>
              </div>

              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">Masofaviy Muloqot</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Dunyoning qaysi nuqtasida bo'lishingizdan qat'i nazar, Google Meet video havolasi orqali 1-ga-1 suhbat o'tkazing.
                </p>
              </div>

              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">Shaxsiy Brend & Maqom</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  O'z sohangizda taniling va Markaziy Osiyo yoshlari uchun rasmiy mentor maqomiga ega bo'ling.
                </p>
              </div>

              <div className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5 text-amber-800" />
                </div>
                <h4 className="font-serif font-bold text-base text-amber-950">Kafolatlangan To'lov</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Talabalar to'lovni oldindan amalga oshiradilar. Har bir yakunlangan sessiya uchun to'lov kartangizga o'tkazib beriladi.
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
              <h3 className="font-serif font-bold text-2xl text-amber-950">Arizangiz qabul qilindi!</h3>
              <p className="text-stone-600 text-xs sm:text-sm mt-2 max-w-md mx-auto">
                Rahmat, <span className="font-bold">{fullName}</span>! Platforma administratorimiz 24 soat ichida Telegram <span className="font-bold">{telegram}</span> orqali siz bilan bog'lanadi va profilingizni tasdiqlaydi.
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
                <UserCheck className="w-5 h-5 text-amber-800" /> Rahnamo bo'lib qo'shilish anketasi
              </h2>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">Ism va Familiyangiz *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masalan: Dr. Jasur Mansurov"
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">Qisqa sarlovha (Headline) *</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Masalan: Lead Architect & Studio Founder | Ex-Ankara"
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.headline && <p className="text-[11px] text-red-600 mt-1">{errors.headline}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">Asosiy yo'nalishlaringiz (vergul bilan) *</label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder="Tibbiyot, Germaniyada ordinatura, Klinik tajriba"
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.specialties && <p className="text-[11px] text-red-600 mt-1">{errors.specialties}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">O'zingiz va tajribangiz haqida *</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Qaysi sohada qancha vaqt ishlagansiz, yoshlarga qanday savollar bo'yicha yordam bera olasiz?"
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.bio && <p className="text-[11px] text-red-600 mt-1">{errors.bio}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-900/10">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block">Telegram username *</label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@username"
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                  {errors.telegram && <p className="text-[11px] text-red-600 mt-1">{errors.telegram}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block">Telefon raqam *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">Elektron pochta (Email) *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ism@domain.com"
                  className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
                {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-900/10">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block">Standart sessiya narxi (UZS)</label>
                  <input
                    type="number"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block">Premium sessiya narxi (UZS)</label>
                  <input
                    type="number"
                    value={premiumPrice}
                    onChange={(e) => setPremiumPrice(e.target.value)}
                    className="w-full mt-1 p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-70 mt-4"
              >
                {isSubmitting ? "Ariba topshirilmoqda..." : "Rahnamo sifatida topshirish"}
              </button>
            </form>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
