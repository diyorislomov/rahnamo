'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  User,
  Mail,
  Globe,
  Camera,
  CheckCircle2,
  CalendarCheck,
  LogOut,
  ArrowLeft,
  Loader2,
  Trash2,
  AlertTriangle,
  GraduationCap,
  MapPin,
  Send,
  ShieldCheck,
  Lock,
} from 'lucide-react';

const UZ_REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon viloyati',
  'Buxoro viloyati',
  'Farg‘ona viloyati',
  'Jizzax viloyati',
  'Xorazm viloyati',
  'Namangan viloyati',
  'Navoiy viloyati',
  'Qashqadaryo viloyati',
  'Qoraqalpog‘iston Respublikasi',
  'Samarqand viloyati',
  'Sirdaryo viloyati',
  'Surxondaryo viloyati',
  'Xorijda (Chet elda)',
];

export default function MenteeProfilePage() {
  const router = useRouter();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const { data: session, status: authStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState('');
  const [preferredLocale, setPreferredLocale] = useState(locale);

  // Data Minimization & Privacy fields
  const [educationStage, setEducationStage] = useState<string>('');
  const [isUnder18, setIsUnder18] = useState<boolean>(false);
  const [parentalConsent, setParentalConsent] = useState<boolean>(false);
  const [region, setRegion] = useState<string>('');
  const [telegram, setTelegram] = useState<string>('');
  const [goal, setGoal] = useState<string>('');
  const [privacyConsent, setPrivacyConsent] = useState<boolean>(true);

  // State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
      return;
    }
    if (authStatus === 'authenticated') {
      fetch('/api/profile')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user) {
            setName(data.user.name || '');
            setEmail(data.user.email || '');
            setImage(data.user.image || '');
            if (data.user.locale) setPreferredLocale(data.user.locale);
            if (data.user.education_stage) setEducationStage(data.user.education_stage);
            setIsUnder18(Boolean(data.user.is_under_18));
            setParentalConsent(Boolean(data.user.parental_consent));
            if (data.user.region) setRegion(data.user.region);
            if (data.user.telegram) setTelegram(data.user.telegram);
            if (data.user.goal) setGoal(data.user.goal);
            setPrivacyConsent(Boolean(data.user.privacy_consent ?? true));
          }
          setLoading(false);
        })
        .catch(() => {
          setName(session?.user?.name || '');
          setEmail(session?.user?.email || '');
          setImage(session?.user?.image || '');
          setLoading(false);
        });
    }
  }, [authStatus, router, session]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError('');

    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/applications/photo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'upload_failed');
      setImage(json.url);
    } catch {
      setError(
        preferredLocale === 'ru'
          ? 'Не удалось загрузить фото'
          : preferredLocale === 'en'
          ? 'Failed to upload photo'
          : 'Suratni yuklab bo‘lmadi'
      );
    }
    setUploadingPhoto(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError(
        preferredLocale === 'ru'
          ? 'Введите корректное имя'
          : preferredLocale === 'en'
          ? 'Please enter a valid name'
          : 'Iltimos, ismingizni kiriting'
      );
      return;
    }

    if (isUnder18 && !parentalConsent) {
      setError(
        preferredLocale === 'ru'
          ? 'Для несовершеннолетних пользователей требуется согласие родителей'
          : preferredLocale === 'en'
          ? 'Parental consent is required for users under 18'
          : '18 yoshga to‘lmaganlar uchun ota-ona ruxsati talab qilinadi'
      );
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          image: image.trim() || null,
          locale: preferredLocale,
          education_stage: educationStage || null,
          is_under_18: isUnder18,
          parental_consent: isUnder18 ? parentalConsent : false,
          region: region || null,
          telegram: telegram.trim() || null,
          goal: goal.trim() || null,
          privacy_consent: privacyConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);

      if (preferredLocale !== locale) {
        window.location.reload();
      }
    } catch {
      setError(
        preferredLocale === 'ru'
          ? 'Ошибка при сохранении профиля'
          : preferredLocale === 'en'
          ? 'Error saving profile'
          : 'Profilni saqlashda xatolik yuz berdi'
      );
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/profile', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'delete_failed');
      }

      await signOut({ callbackUrl: '/' });
    } catch (err) {
      console.error(err);
      setError(
        preferredLocale === 'ru'
          ? 'Ошибка при удалении аккаунта. Пожалуйста, повторите позже.'
          : preferredLocale === 'en'
          ? 'Error deleting account. Please try again later.'
          : 'Hisobni o‘chirishda xatolik yuz berdi. Iltimos qaytadan urinib ko‘ring.'
      );
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0F4C5C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-[#18181B] bg-white px-3.5 py-2 rounded-xl border border-zinc-900/10 mb-6 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {tCommon('backToHome')}
          </Link>

          <div className="surface-card p-6 sm:p-8 rounded-3xl border border-zinc-900/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900/8 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-serif font-bold text-xl text-[#18181B]">
                    {preferredLocale === 'ru'
                      ? 'Профиль пользователя'
                      : preferredLocale === 'en'
                      ? 'User Profile'
                      : 'Foydalanuvchi Profili'}
                  </h1>
                  <p className="text-xs text-zinc-500">
                    {preferredLocale === 'ru'
                      ? 'Управление данными и настройками конфиденциальности'
                      : preferredLocale === 'en'
                      ? 'Manage your details and privacy preferences'
                      : 'Shaxsiy ma’lumotlar va maxfiylik sozlamalari'}
                  </p>
                </div>
              </div>

              <Link
                href="/my-bookings"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/8 hover:bg-[#0F4C5C]/15 px-3 py-1.5 rounded-xl border border-[#0F4C5C]/15 transition-colors"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>{tCommon('myBookings')}</span>
              </Link>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Profile Photo */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-2">
                  {preferredLocale === 'ru' ? 'Фото профиля' : preferredLocale === 'en' ? 'Profile Photo' : 'Profil surati'}
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#FFF8E7] border border-zinc-900/12 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-zinc-400" />
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-[#0F4C5C] bg-[#0F4C5C]/8 hover:bg-[#0F4C5C]/15 px-3.5 py-2 rounded-xl border border-[#0F4C5C]/15 transition-colors">
                    {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>
                      {uploadingPhoto
                        ? 'Yuklanmoqda...'
                        : image
                        ? preferredLocale === 'ru'
                          ? 'Изменить фото'
                          : preferredLocale === 'en'
                          ? 'Change photo'
                          : 'Suratni o‘zgartirish'
                        : preferredLocale === 'ru'
                        ? 'Загрузить фото'
                        : preferredLocale === 'en'
                        ? 'Upload photo'
                        : 'Surat yuklash'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  {preferredLocale === 'ru' ? 'Имя и фамилия *' : preferredLocale === 'en' ? 'Full Name *' : 'Ism va Familiya *'}
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
              </div>

              {/* Email (Read only) */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  {preferredLocale === 'ru' ? 'Электронная почта' : preferredLocale === 'en' ? 'Email Address' : 'Elektron pochta'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-xl cursor-not-allowed outline-none"
                  />
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {preferredLocale === 'ru'
                    ? 'Привязана к учетной записи. Менторы видят только ваше имя.'
                    : preferredLocale === 'en'
                    ? 'Linked to your login account. Mentors only see your name.'
                    : 'Kirish hisobingizga bog‘langan. Rahnamolarga emailingiz ko‘rsatilmaydi.'}
                </p>
              </div>

              {/* Telegram Handle */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  <Send className="w-3.5 h-3.5 inline mr-1 text-[#0F4C5C]" />
                  {preferredLocale === 'ru'
                    ? 'Telegram имя пользователя (username)'
                    : preferredLocale === 'en'
                    ? 'Telegram Username'
                    : 'Telegram foydalanuvchi nomi (@username)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-400 text-sm">@</span>
                  <input
                    type="text"
                    placeholder="foydalanuvchi"
                    maxLength={50}
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value.replace(/^@/, ''))}
                    className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {preferredLocale === 'ru'
                    ? 'Передается наставнику только после подтверждения и оплаты сессии'
                    : preferredLocale === 'en'
                    ? 'Shared with mentor only after a session is booked and confirmed'
                    : 'Faqatgina qabul tasdiqlangach Rahnamo bilan bog‘lanish uchun ochiladi'}
                </p>
              </div>

              {/* Education Stage & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                    <GraduationCap className="w-3.5 h-3.5 inline mr-1 text-[#0F4C5C]" />
                    {preferredLocale === 'ru' ? 'Стадия обучения' : preferredLocale === 'en' ? 'Education Stage' : 'Ta’lim bosqichi'}
                  </label>
                  <select
                    value={educationStage}
                    onChange={(e) => setEducationStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C] cursor-pointer"
                  >
                    <option value="">{preferredLocale === 'ru' ? 'Выберите стадию' : preferredLocale === 'en' ? 'Select stage' : 'Bosqichni tanlang'}</option>
                    <option value="school">{preferredLocale === 'ru' ? 'Школа / Лицей / Колледж' : preferredLocale === 'en' ? 'School / College' : 'Maktab / Litsey / Kollej'}</option>
                    <option value="university">{preferredLocale === 'ru' ? 'Университет / Институт' : preferredLocale === 'en' ? 'University / Bachelor / Master' : 'Universitet / Institut'}</option>
                    <option value="working">{preferredLocale === 'ru' ? 'Работаю / Специалист' : preferredLocale === 'en' ? 'Working Professional' : 'Ishlayapman / Mutaxassis'}</option>
                    <option value="other">{preferredLocale === 'ru' ? 'Другое' : preferredLocale === 'en' ? 'Other' : 'Boshqa'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                    <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#0F4C5C]" />
                    {preferredLocale === 'ru' ? 'Регион (по желанию)' : preferredLocale === 'en' ? 'Region (optional)' : 'Hudud (ixtiyoriy)'}
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C] cursor-pointer"
                  >
                    <option value="">{preferredLocale === 'ru' ? 'Регион не указан' : preferredLocale === 'en' ? 'Not specified' : 'Ko‘rsatilmagan'}</option>
                    {UZ_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Goal / Track of Interest */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  {preferredLocale === 'ru'
                    ? 'Ваша главная цель или сфера интереса'
                    : preferredLocale === 'en'
                    ? 'Primary Goal or Area of Interest'
                    : 'Asosiy maqsadingiz yoki qiziqqan yo‘nalishingiz'}
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={
                    preferredLocale === 'ru'
                      ? 'Например: Хочу поступить на магистратуру в Европу или перейти в Product Management'
                      : preferredLocale === 'en'
                      ? 'E.g., Looking for scholarship advice in Europe or transitioning into Software Engineering'
                      : 'Masalan: Chet elda grant yutish yoki IT sohasiga birinchi qadamni qo‘yish'
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C] resize-none"
                />
              </div>

              {/* Preferred Language */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  <Globe className="w-3.5 h-3.5 inline mr-1 text-[#0F4C5C]" />
                  {preferredLocale === 'ru'
                    ? 'Предпочитаемый язык интерфейса'
                    : preferredLocale === 'en'
                    ? 'Preferred Interface Language'
                    : 'Afzal ko‘rgan interfeys tili'}
                </label>
                <select
                  value={preferredLocale}
                  onChange={(e) => setPreferredLocale(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C] cursor-pointer"
                >
                  <option value="uz">🇺🇿 O‘zbekcha</option>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>

              {/* Minor Protection (Under 18) Section */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="under18Toggle"
                    checked={isUnder18}
                    onChange={(e) => setIsUnder18(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#0F4C5C] rounded border-zinc-300 focus:ring-[#0F4C5C] cursor-pointer"
                  />
                  <label htmlFor="under18Toggle" className="text-xs font-medium text-amber-950 cursor-pointer">
                    {preferredLocale === 'ru'
                      ? 'Мне меньше 18 лет'
                      : preferredLocale === 'en'
                      ? 'I am under 18 years old'
                      : 'Men 18 yoshga to‘lmaganman'}
                  </label>
                </div>

                {isUnder18 && (
                  <div className="pt-2 pl-7 space-y-2.5 border-t border-amber-200/60">
                    <div className="flex items-start gap-2 text-xs text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        {preferredLocale === 'ru'
                          ? 'В соответствии с политикой защиты несовершеннолетних Rahnamo, для индивидуальных консультаций 1-на-1 требуется согласие родителей или законного опекуна.'
                          : preferredLocale === 'en'
                          ? 'Per Rahnamo child safety policy, 1-on-1 sessions for minors require parental or legal guardian consent.'
                          : 'Rahnamo xavfsizlik qoidalariga muvofiq, 18 yoshdan kichiklar uchun 1-ga-1 sessiyalarda ota-ona yoki qonuniy vasiy roziligi talab qilinadi.'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="parentalConsentCheck"
                        checked={parentalConsent}
                        onChange={(e) => setParentalConsent(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-[#0F4C5C] rounded border-zinc-300 focus:ring-[#0F4C5C] cursor-pointer"
                      />
                      <label htmlFor="parentalConsentCheck" className="text-xs font-bold text-amber-950 cursor-pointer">
                        {preferredLocale === 'ru'
                          ? 'Подтверждаю, что получил(а) согласие родителей или опекунов *'
                          : preferredLocale === 'en'
                          ? 'I confirm that I have obtained parental or guardian consent *'
                          : 'Ota-onam yoki qonuniy vasiyim rozilik berganini tasdiqlayman *'}
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Consent Checkbox */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="privacyConsentProfile"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-[#0F4C5C] rounded border-zinc-300 focus:ring-[#0F4C5C] cursor-pointer"
                />
                <label htmlFor="privacyConsentProfile" className="text-xs text-slate-700 cursor-pointer">
                  {preferredLocale === 'ru' ? (
                    <>
                      Я даю согласие на обработку моих персональных данных в соответствии с{' '}
                      <Link href="/privacy" target="_blank" className="text-[#0F4C5C] font-semibold underline">
                        Политикой конфиденциальности
                      </Link>
                    </>
                  ) : preferredLocale === 'en' ? (
                    <>
                      I consent to the processing of my personal data under the{' '}
                      <Link href="/privacy" target="_blank" className="text-[#0F4C5C] font-semibold underline">
                        Privacy Policy
                      </Link>
                    </>
                  ) : (
                    <>
                      Shaxsiy ma’lumotlarimni qayta ishlashga roziman ({' '}
                      <Link href="/privacy" target="_blank" className="text-[#0F4C5C] font-semibold underline">
                        Maxfiylik siyosati
                      </Link>
                      )
                    </>
                  )}
                </label>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  {error}
                </p>
              )}

              {saved && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {preferredLocale === 'ru'
                      ? 'Профиль успешно сохранен!'
                      : preferredLocale === 'en'
                      ? 'Profile saved successfully!'
                      : 'Profilingiz muvaffaqiyatli saqlandi!'}
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-900/8 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{tCommon('signOut')}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#0F4C5C] hover:bg-[#09323D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </span>
                  ) : (
                    <span>
                      {preferredLocale === 'ru'
                        ? 'Сохранить изменения'
                        : preferredLocale === 'en'
                        ? 'Save Changes'
                        : 'O‘zgarishlarni saqlash'}
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Account Deletion Danger Zone */}
            <div className="mt-8 pt-6 border-t border-red-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-red-50/60 border border-red-200">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-red-600" />
                    <span>
                      {preferredLocale === 'ru'
                        ? 'Удаление учетной записи'
                        : preferredLocale === 'en'
                        ? 'Delete Account'
                        : 'Hisobni butunlay o‘chirish'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-red-700 leading-relaxed max-w-md">
                    {preferredLocale === 'ru'
                      ? 'Полностью удалит ваш профиль и персональные данные, а история записей будет обезличена.'
                      : preferredLocale === 'en'
                      ? 'Permanently deletes your profile and personal data, and anonymizes your booking history.'
                      : 'Profilingiz va shaxsiy ma’lumotlaringiz to‘liq o‘chiriladi, avvalgi qabullar tarixi esa anonimlashtiriladi.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-300 transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>
                    {preferredLocale === 'ru'
                      ? 'Удалить аккаунт'
                      : preferredLocale === 'en'
                      ? 'Delete Account'
                      : 'Hisobni o‘chirish'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal for Account Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-base font-bold text-zinc-900">
                {preferredLocale === 'ru'
                  ? 'Вы уверены, что хотите удалить аккаунт?'
                  : preferredLocale === 'en'
                  ? 'Are you sure you want to delete your account?'
                  : 'Hisobingizni o‘chirishni aniq xohlaysizmi?'}
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                {preferredLocale === 'ru'
                  ? 'Это действие необратимо. Ваше имя, почта, фото и профиль будут удалены навсегда. Ваши отзывы и прошедшие встречи будут обезличены.'
                  : preferredLocale === 'en'
                  ? 'This action cannot be undone. Your name, email, photo, and profile will be permanently deleted. Your reviews and past bookings will be anonymized.'
                  : 'Bu amalni ortga qaytarib bo‘lmaydi. Ismingiz, emailingiz va profilingiz butunlay o‘chiriladi. Avvalgi qabullar va fikrlar anonimlashtiriladi.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                {preferredLocale === 'ru' ? 'Отмена' : preferredLocale === 'en' ? 'Cancel' : 'Bekor qilish'}
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>O‘chirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {preferredLocale === 'ru'
                        ? 'Да, удалить навсегда'
                        : preferredLocale === 'en'
                        ? 'Yes, delete permanently'
                        : 'Ha, butunlay o‘chirilsin'}
                    </span>
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
