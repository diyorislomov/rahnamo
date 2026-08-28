'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { Tier } from '@/types';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CamelIcon } from '@/components/Icons';
import { Star, ShieldCheck, ArrowLeft, Clock, CheckCircle2, AlertCircle, Copy, Mail, Phone, CreditCard, Lock, Loader2, X } from 'lucide-react';
import Link from 'next/link';

import { generateMeetLink } from '@/lib/meeting';
import { sendTelegramNotification } from '@/lib/telegram';

type PaymentMethod = 'payme' | 'click' | 'uzum';

interface BookingTicketData {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorHeadline: string;
  counselorAvatar: string;
  tier: Tier;
  price: number;
  paymentMethod: PaymentMethod;
  slot: string;
  studentName: string;
  email: string;
  phone: string;
  telegram: string;
  education: string;
  question: string;
  meetLink?: string;
  createdAt: string;
}

export default function CounselorPage() {
  const params = useParams();
  const router = useRouter();
  
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const counselor = INITIAL_COUNSELORS.find((c) => c.id === rawId);

  const [selectedTier, setSelectedTier] = useState<Tier>('standard');
  const [selectedSlot, setSelectedSlot] = useState<string>(counselor?.availableSlots?.[0] || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payme');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [telegram, setTelegram] = useState('');
  const [education, setEducation] = useState('');
  const [question, setQuestion] = useState('');

  // Errors & Ticket state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [bookingTicket, setBookingTicket] = useState<BookingTicketData | null>(null);
  const [copied, setCopied] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cardNumber, setCardNumber] = useState('');

  if (!counselor) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] p-12 text-center text-amber-950 font-serif">
        <p className="text-xl font-bold">Rahnamo topilmadi.</p>
        <Link href="/" className="text-amber-800 underline text-sm mt-3 inline-block">
          Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedSlot) {
      newErrors.slot = "Iltimos, uchrashuv vaqtini tanlang.";
    }

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = "Ism va familiyangizni to'liq kiriting (kamida 3 ta belgi).";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = "To'g'ri elektron pochta manzilini kiriting (masalan: ism@domain.com).";
    }

    let cleanedTelegram = telegram.trim().replace(/^https?:\/\/t\.me\//, '');
    if (!cleanedTelegram) {
      newErrors.telegram = "Telegram foydalanuvchi nomingizni kiriting.";
    } else {
      if (!cleanedTelegram.startsWith('@')) {
        cleanedTelegram = '@' + cleanedTelegram;
      }
      if (cleanedTelegram.length < 3) {
        newErrors.telegram = "Telegram username to'g'ri kiritilishi kerak (masalan: @username).";
      }
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 9) {
      newErrors.phone = "O'zbekiston telefon raqamini to'liq kiriting (+998 90 123 45 67).";
    }

    if (!education.trim()) {
      newErrors.education = "Hozirgi kasbingiz yoki ta'lim bosqichingizni kiriting.";
    }

    if (!question.trim() || question.trim().length < 5) {
      newErrors.question = "Savolingizni biroz batafsilroq yozing.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('+998') && val.length > 0) {
      val = '+998 ' + val.replace(/\D/g, '');
    }
    setPhone(val);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    setIsProcessingPayment(true);

    let cleanedTelegram = telegram.trim().replace(/^https?:\/\/t\.me\//, '');
    if (!cleanedTelegram.startsWith('@')) {
      cleanedTelegram = '@' + cleanedTelegram;
    }

    const bookingId = `RNM-${Math.floor(1000 + Math.random() * 9000)}`;
    const price = selectedTier === 'standard' ? counselor.standardPrice : counselor.premiumPrice;
    const meetLink = generateMeetLink(bookingId);

    const newBooking: BookingTicketData = {
      id: bookingId,
      counselorId: counselor.id,
      counselorName: counselor.fullName,
      counselorHeadline: counselor.headline,
      counselorAvatar: counselor.avatarUrl,
      tier: selectedTier,
      price: price,
      paymentMethod: paymentMethod,
      slot: selectedSlot,
      studentName: fullName,
      email: email,
      phone: phone,
      telegram: cleanedTelegram,
      education: education,
      question: question,
      meetLink: meetLink,
      createdAt: new Date().toISOString(),
    };

    // Save to LocalStorage immediately
    try {
      const existing = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
      localStorage.setItem('rahnamo_bookings', JSON.stringify([newBooking, ...existing]));
    } catch (err) {
      console.error('LocalStorage save error:', err);
    }

    // Send Telegram Notification (non-blocking)
    sendTelegramNotification({
      id: newBooking.id,
      studentName: newBooking.studentName,
      counselorName: newBooking.counselorName,
      tier: newBooking.tier,
      price: newBooking.price,
      slot: newBooking.slot,
      paymentMethod: newBooking.paymentMethod,
      phone: newBooking.phone,
      telegram: newBooking.telegram,
      email: newBooking.email,
      education: newBooking.education,
      question: newBooking.question,
      meetLink: newBooking.meetLink || meetLink,
    }).catch((err) => console.warn('Telegram notify error:', err));

    // Non-blocking sync to Supabase (if configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      Promise.resolve(
        supabase.from('bookings').insert({
          id: newBooking.id,
          device_id: getDeviceId(),
          counselor_id: newBooking.counselorId,
          counselor_name: newBooking.counselorName,
          counselor_headline: newBooking.counselorHeadline,
          counselor_avatar: newBooking.counselorAvatar,
          tier: newBooking.tier,
          price: newBooking.price,
          slot: newBooking.slot,
          student_name: newBooking.studentName,
          email: newBooking.email,
          phone: newBooking.phone,
          telegram: newBooking.telegram,
          education: newBooking.education,
          question: newBooking.question,
          meet_link: newBooking.meetLink,
        })
      )
        .then((res: any) => {
          if (res?.error) console.warn('Supabase sync warning:', res.error);
        })
        .catch((err: any) => console.warn('Supabase sync error:', err));
    }

    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      setBookingTicket(newBooking);
    }, 1000);
  };

  const copyBookingId = () => {
    if (bookingTicket) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(bookingTicket.id);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = bookingTicket.id;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  const getProviderName = () => {
    switch (paymentMethod) {
      case 'payme':
        return 'Payme';
      case 'click':
        return 'Click';
      case 'uzum':
        return 'Uzum Bank';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans pb-16 selection:bg-amber-200">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 hover:text-amber-700 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Barcha Rahnamolar ro'yxatiga qaytish
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Left Column: Counselor Profile Card */}
        <div className="md:col-span-1 bg-white/95 p-6 rounded-3xl border border-amber-900/10 shadow-sm h-fit">
          <img
            src={counselor.avatarUrl}
            alt={counselor.fullName}
            className="w-24 h-24 rounded-2xl object-cover mx-auto border-2 border-amber-200 shadow-xs"
          />
          <div className="text-center mt-4">
            <h2 className="font-serif font-bold text-lg text-amber-950 flex items-center justify-center gap-1.5">
              {counselor.fullName}
              <ShieldCheck className="w-4 h-4 text-amber-700 fill-amber-100" />
            </h2>
            <p className="text-xs text-stone-600 mt-1">{counselor.headline}</p>
            <div className="flex items-center justify-center gap-1 mt-2 text-xs font-semibold text-amber-800">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{counselor.rating}</span>
              <span className="text-stone-400 font-normal">({counselor.reviewsCount} ta baho)</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-amber-900/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">Rahnamo haqida</h4>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">{counselor.bio}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-amber-900/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">Yo'nalishlar</h4>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {counselor.specialties.map((s) => (
                <span key={s} className="bg-amber-50 border border-amber-200/70 text-amber-900 text-[10px] font-medium px-2 py-0.5 rounded-md">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Form or Digital Ticket */}
        <div className="md:col-span-2">
          {bookingTicket ? (
            /* Digital Rahnamo Ticket */
            <div className="bg-white/95 rounded-3xl border-2 border-amber-900/20 p-6 md:p-8 shadow-md">
              <div className="flex items-center justify-between border-b border-dashed border-amber-900/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-900 flex items-center justify-center text-amber-100">
                    <CamelIcon className="w-5 h-5 fill-amber-100" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-amber-950">Qabul Tasdiqlandi!</h3>
                    <p className="text-[11px] text-stone-500">Rahnamo rasmiy qabul chiptasi</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyBookingId}
                  className="flex items-center gap-1 text-xs font-mono font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 transition-all cursor-pointer"
                >
                  <span>{bookingTicket.id}</span>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {copied && <p className="text-[11px] text-emerald-600 font-semibold text-right mt-1">Chipta kodi nusxalandi!</p>}

              <div className="grid grid-cols-2 gap-4 my-6 text-xs bg-amber-50/60 p-4 rounded-2xl border border-amber-900/10">
                <div>
                  <span className="text-stone-500 block">Talaba:</span>
                  <span className="font-bold text-amber-950 text-sm">{bookingTicket.studentName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Rahnamo:</span>
                  <span className="font-bold text-amber-950 text-sm">{bookingTicket.counselorName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Belgilangan vaqt:</span>
                  <span className="font-bold text-amber-900">{bookingTicket.slot}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Sessiya & To'lov:</span>
                  <span className="font-bold text-amber-900 uppercase">
                    {bookingTicket.tier} ({bookingTicket.price.toLocaleString()} UZS via {bookingTicket.paymentMethod.toUpperCase()})
                  </span>
                </div>
              </div>

              <div className="space-y-2 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Keyingi qadamlar:
                </div>
                <p>
                  1. To'lov tasdig'i <span className="font-bold">{bookingTicket.email}</span> va Telegram <span className="font-bold">{bookingTicket.telegram}</span> hisobingizga yuborildi.
                </p>
                <p>
                  2. Google Meet video havolasi suhbat boshlanishidan 1 soat oldin yetkaziladi.
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/my-bookings"
                  className="flex-1 text-center bg-amber-900 hover:bg-amber-800 text-amber-50 font-semibold text-xs py-3 rounded-xl transition-all shadow-xs"
                >
                  Mening qabullarim bo'limida ko'rish
                </Link>
                <Link
                  href="/"
                  className="flex-1 text-center bg-white border border-amber-900/20 text-stone-800 hover:bg-amber-50 font-semibold text-xs py-3 rounded-xl transition-all"
                >
                  Bosh sahifaga qaytish
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInitiatePayment} className="bg-white/95 p-6 md:p-8 rounded-3xl border border-amber-900/10 shadow-sm space-y-6">
              {/* 1. Tier Selection */}
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-950">1. Qabul turini tanlang</h3>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <label
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                      selectedTier === 'standard'
                        ? 'border-amber-800 bg-amber-50/70 ring-2 ring-amber-800/20'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="standard"
                      checked={selectedTier === 'standard'}
                      onChange={() => setSelectedTier('standard')}
                      className="mt-1 accent-amber-800 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">Standart</span>
                      <div className="text-lg font-serif font-extrabold text-amber-950 mt-0.5">{counselor.standardPrice.toLocaleString()} UZS</div>
                      <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" /> 20-30 daqiqa yo'l-yo'riq
                      </p>
                    </div>
                  </label>

                  <label
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                      selectedTier === 'premium'
                        ? 'border-amber-800 bg-amber-50/70 ring-2 ring-amber-800/20'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="premium"
                      checked={selectedTier === 'premium'}
                      onChange={() => setSelectedTier('premium')}
                      className="mt-1 accent-amber-800 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Premium</span>
                      <div className="text-lg font-serif font-extrabold text-amber-950 mt-0.5">{counselor.premiumPrice.toLocaleString()} UZS</div>
                      <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" /> 45-60 daqiqa chuqur tahlil
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Slot Selection */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-amber-950">2. O'zingizga qulay vaqtni tanlang</h3>
                  {errors.slot && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.slot}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {counselor.availableSlots.map((slot) => (
                    <label
                      key={slot}
                      className={`cursor-pointer p-3 rounded-xl text-xs font-medium border transition-all flex items-center gap-2.5 ${
                        selectedSlot === slot
                          ? 'bg-amber-900 text-amber-50 border-amber-900 shadow-xs'
                          : 'bg-white text-stone-700 border-amber-900/15 hover:bg-amber-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="slot"
                        value={slot}
                        checked={selectedSlot === slot}
                        onChange={() => {
                          setSelectedSlot(slot);
                          if (errors.slot) setErrors((prev) => ({ ...prev, slot: '' }));
                        }}
                        className="accent-amber-500 cursor-pointer"
                      />
                      <span>{slot}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Validated Intake Questions */}
              <div className="space-y-4 pt-4 border-t border-amber-900/10">
                <h3 className="font-serif text-lg font-bold text-amber-950">3. Ma'lumotlaringizni to'ldiring</h3>

                {/* Name */}
                <div>
                  <label htmlFor="student-fullname" className="text-xs font-semibold text-stone-700 block">
                    Ism va Familiyangiz *
                  </label>
                  <input
                    id="student-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder="Masalan: Sardor Alimov"
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.fullName ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="student-email" className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-stone-500" /> Elektron pochta (Email) *
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="ism@domain.com"
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.email ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="student-phone" className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-stone-500" /> Telefon raqam *
                  </label>
                  <input
                    id="student-phone"
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+998 90 123 45 67"
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.phone ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>

                {/* Telegram */}
                <div>
                  <label htmlFor="student-telegram" className="text-xs font-semibold text-stone-700 block">
                    Telegram foydalanuvchi nomi (@username) *
                  </label>
                  <input
                    id="student-telegram"
                    type="text"
                    value={telegram}
                    onChange={(e) => {
                      setTelegram(e.target.value);
                      if (errors.telegram) setErrors((prev) => ({ ...prev, telegram: '' }));
                    }}
                    placeholder="@username"
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.telegram ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.telegram && <p className="text-[11px] text-red-600 mt-1">{errors.telegram}</p>}
                </div>

                {/* Current Status */}
                <div>
                  <label htmlFor="student-education" className="text-xs font-semibold text-stone-700 block">
                    Hozirgi mashg'ulotingiz / Ta'lim bosqichingiz *
                  </label>
                  <input
                    id="student-education"
                    type="text"
                    value={education}
                    onChange={(e) => {
                      setEducation(e.target.value);
                      if (errors.education) setErrors((prev) => ({ ...prev, education: '' }));
                    }}
                    placeholder="Masalan: Tibbiyot instituti 4-kurs talabasi"
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.education ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.education && <p className="text-[11px] text-red-600 mt-1">{errors.education}</p>}
                </div>

                {/* Question */}
                <div>
                  <label htmlFor="student-question" className="text-xs font-semibold text-stone-700 block">
                    Rahnamoga asosiy savolingiz yoki maqsadingiz nima? *
                  </label>
                  <textarea
                    id="student-question"
                    rows={3}
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      if (errors.question) setErrors((prev) => ({ ...prev, question: '' }));
                    }}
                    placeholder="Masalan: Germaniyada ordinaturaga topshirish tartibi va klinik tajriba bo'yicha maslahat olmoqchiman."
                    className={`w-full mt-1 p-3 text-xs bg-amber-50/40 border rounded-xl outline-none transition-all ${
                      errors.question ? 'border-red-500 bg-red-50/20' : 'border-amber-900/15 focus:ring-2 focus:ring-amber-700 text-stone-800'
                    }`}
                  />
                  {errors.question && <p className="text-[11px] text-red-600 mt-1">{errors.question}</p>}
                </div>
              </div>

              {/* 4. Payment Gateway Selection Step */}
              <div className="space-y-3 pt-4 border-t border-amber-900/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-amber-950">4. To'lov usulini tanlang</h3>
                  <span className="text-[11px] text-stone-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-700" /> Xavfsiz to'lov
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      paymentMethod === 'payme'
                        ? 'border-amber-800 bg-amber-50/80 ring-2 ring-amber-800/20 shadow-xs'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="payme"
                      checked={paymentMethod === 'payme'}
                      onChange={() => setPaymentMethod('payme')}
                      className="sr-only"
                    />
                    <span className="font-bold text-xs text-amber-950 block">Payme</span>
                    <span className="text-[10px] text-stone-500">Uzcard / Humo</span>
                  </label>

                  <label
                    className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      paymentMethod === 'click'
                        ? 'border-amber-800 bg-amber-50/80 ring-2 ring-amber-800/20 shadow-xs'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="click"
                      checked={paymentMethod === 'click'}
                      onChange={() => setPaymentMethod('click')}
                      className="sr-only"
                    />
                    <span className="font-bold text-xs text-amber-950 block">Click</span>
                    <span className="text-[10px] text-stone-500">Click Up / Karta</span>
                  </label>

                  <label
                    className={`cursor-pointer p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      paymentMethod === 'uzum'
                        ? 'border-amber-800 bg-amber-50/80 ring-2 ring-amber-800/20 shadow-xs'
                        : 'border-amber-900/10 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="uzum"
                      checked={paymentMethod === 'uzum'}
                      onChange={() => setPaymentMethod('uzum')}
                      className="sr-only"
                    />
                    <span className="font-bold text-xs text-amber-950 block">Uzum Bank</span>
                    <span className="text-[10px] text-stone-500">Uzum kartasi</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
              >
                To'lovni amalga oshirish ({selectedTier === 'standard' ? counselor.standardPrice.toLocaleString() : counselor.premiumPrice.toLocaleString()} UZS)
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Simulated Interactive Payment Processing Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-900/10 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessingPayment}
              className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-amber-900/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm font-serif">
                {getProviderName()[0]}
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-amber-950">{getProviderName()} to'lov tizimi</h3>
                <p className="text-xs text-stone-500">Xavfsiz to'lov shlyuziga ulanish</p>
              </div>
            </div>

            <div className="my-5 p-4 bg-amber-50/70 rounded-2xl border border-amber-900/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Xizmat:</span>
                <span className="font-semibold text-stone-900">{counselor.fullName} (1-ga-1 sessiya)</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Vaqt:</span>
                <span className="font-semibold text-stone-900">{selectedSlot}</span>
              </div>
              <div className="flex justify-between text-amber-950 font-bold text-sm pt-2 border-t border-amber-900/10">
                <span>Jami to'lov:</span>
                <span>{(selectedTier === 'standard' ? counselor.standardPrice : counselor.premiumPrice).toLocaleString()} UZS</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Karta raqami (Uzcard / Humo / Visa)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="8600 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                    <span>To'lov amalga oshirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>To'lovni tasdiqlash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}