'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  KeyRound,
  Mail,
  Lock,
  Loader2,
  LogOut,
  CheckCircle2,
  Camera,
  CalendarPlus,
  Trash2,
} from 'lucide-react';
import { formatSlot, normalizeSlots } from '@/lib/slots';
import MentorServicesEditor from '@/components/MentorServicesEditor';

interface MentorRow {
  id: string;
  full_name: string;
  headline: string;
  avatar_url: string;
  specialties: string[];
  bio: string;
  standard_price: number;
  premium_price: number;
  available_slots: string[];
  why_work_with_me: string | null;
  price_per_question: number | null;
  soft_cap: number | null;
}

export default function MentorDashboardPage() {
  const t = useTranslations('mentorAuth');
  const td = useTranslations('mentorDashboard');
  const locale = useLocale();

  const [checkingSession, setCheckingSession] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [counselor, setCounselor] = useState<MentorRow | null>(null);
  const [loadError, setLoadError] = useState('');

  // Editable fields
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [whyWorkWithMe, setWhyWorkWithMe] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [standardPrice, setStandardPrice] = useState('');
  const [premiumPrice, setPremiumPrice] = useState('');
  const [pricePerQuestion, setPricePerQuestion] = useState('');
  const [softCap, setSoftCap] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotDraft, setSlotDraft] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadCounselor = async (token: string) => {
    const response = await fetch('/api/mentor/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      console.error('[MENTOR_DASHBOARD_LOAD_FAILED]', result.error);
      setLoadError(td('loadFailed'));
      return;
    }

    const row = result.counselor as MentorRow;
    setCounselor(row);
    setHeadline(row.headline || '');
    setBio(row.bio || '');
    setWhyWorkWithMe(row.why_work_with_me || '');
    setSpecialties((row.specialties || []).join(', '));
    setStandardPrice(String(row.standard_price ?? ''));
    setPremiumPrice(String(row.premium_price ?? ''));
    setPricePerQuestion(
      row.price_per_question != null ? String(row.price_per_question) : ''
    );
    setSoftCap(row.soft_cap != null ? String(row.soft_cap) : '');
    setAvailableSlots(normalizeSlots(row.available_slots || []));
    setAvatarUrl(row.avatar_url || '');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id || null;
      setUserId(uid);
      setCheckingSession(false);
      if (uid && data.session?.access_token) loadCounselor(data.session.access_token);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        loadCounselor(session.access_token);
      }
      if (event === 'SIGNED_OUT') {
        setUserId(null);
        setCounselor(null);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoggingIn(false);
    if (error) {
      console.error('[MENTOR_LOGIN_FAILED]', error);
      setLoginError(t('login.failed'));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingPhoto(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setUploadingPhoto(false);
      setSaveError(td('photoUploadFailed'));
      return;
    }
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/mentor/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'upload_failed');
      setAvatarUrl(result.url);
    } catch (error) {
      console.error('[MENTOR_PHOTO_UPLOAD_FAILED]', error);
      setSaveError(td('photoUploadFailed'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setSaveError('');
    setSaved(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setSaving(false);
      setSaveError(td('saveFailed'));
      return;
    }
    const response = await fetch('/api/mentor/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        headline,
        bio,
        why_work_with_me: whyWorkWithMe || null,
        specialties: specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        standard_price: Number(standardPrice) || 0,
        premium_price: Number(premiumPrice) || 0,
        price_per_question: pricePerQuestion ? Number(pricePerQuestion) : null,
        soft_cap: softCap ? Number(softCap) : null,
        available_slots: normalizeSlots(availableSlots),
        avatar_url: avatarUrl,
      }),
    });
    const result = await response.json();

    setSaving(false);

    if (!response.ok || !result.success) {
      console.error('[MENTOR_DASHBOARD_SAVE_FAILED]', result.error);
      setSaveError(td('saveFailed'));
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addAvailableSlot = () => {
    if (!slotDraft) return;
    const date = new Date(slotDraft);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      setSaveError(td('slotFutureError'));
      return;
    }
    setAvailableSlots((current) => normalizeSlots([...current, date.toISOString()]));
    setSlotDraft('');
    setSaveError('');
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-[#FBF9F5]" />;
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased flex flex-col justify-between">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 w-full">
          <div className="surface-card p-8 text-center space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#0F1E36] text-white flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0F1E36] bg-[#0F1E36]/[0.08] px-3 py-1 rounded-full">
                {t('login.badge')}
              </span>
              <h1 className="font-display font-bold text-2xl text-[#0F1E36] mt-3">
                {t('login.title')}
              </h1>
              <p className="text-xs text-[#475569] mt-1">{t('login.subtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-[#0F1E36] block mb-1.5">
                  {t('login.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#475569] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F5] border border-[#0F1E36]/15 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0F1E36]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#0F1E36] block mb-1.5">
                  {t('login.passwordLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#475569] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F5] border border-[#0F1E36]/15 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0F1E36]"
                  />
                </div>
                {loginError && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1.5">
                    {loginError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className="btn-primary-teal w-full py-3 font-semibold text-xs sm:text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" />
                ) : (
                  <Lock className="w-4 h-4 text-[#F59E0B]" />
                )}
                <span>{t('login.submit')}</span>
              </button>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F1E36] font-sans antialiased pb-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#0F1E36]/10">
          <h1 className="font-display font-bold text-2xl text-[#0F1E36]">{td('title')}</h1>
          <button
            onClick={handleSignOut}
            className="btn-secondary-surface flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#475569]" />
            <span>{td('signOut')}</span>
          </button>
        </div>

        {/* Mentor Revenue & Session Telemetry Strip (Master Plan Section 8) */}
        <section className="mb-6 rounded-3xl bg-[#0F1E36] text-white p-5 sm:p-6 border border-[#F59E0B]/30 shadow-lg neo-silk-tessellation-dark">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
                RAHNAMO MENTOR OPERATING SYSTEM
              </span>
              <h2 className="font-display font-bold text-lg text-white mt-0.5">
                85% Direct Mentor Payout • Instant Click Escrow Settlement
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="rounded-xl bg-white/[0.08] border border-white/10 px-3 py-2">
                <div className="text-[10px] text-slate-300">ACTIVE SLOTS</div>
                <div className="font-bold text-[#F59E0B]">{availableSlots.length} Open</div>
              </div>
              <div className="rounded-xl bg-white/[0.08] border border-white/10 px-3 py-2">
                <div className="text-[10px] text-slate-300">PAYOUT SHARE</div>
                <div className="font-bold text-emerald-300">85% Net</div>
              </div>
            </div>
          </div>
        </section>

        {loadError && <p className="text-sm text-red-600 font-semibold">{loadError}</p>}

        {counselor && (
          <>
            <form
              onSubmit={handleSave}
              className="surface-card p-6 md:p-8 space-y-5"
            >
              <div className="flex items-center gap-4 pb-4 border-b border-zinc-900/[0.08]">
                <Image
                  src={
                    avatarUrl ||
                    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop'
                  }
                  alt=""
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-xl object-cover border border-zinc-900/10"
                />
                <label className="btn-secondary-surface flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl cursor-pointer">
                  {uploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F4C5C]" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-[#0F4C5C]" />
                  )}
                  <span>{td('changePhoto')}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  {td('headlineLabel')}
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  {td('bioLabel')}
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  {td('whyWorkWithMeLabel')}
                </label>
                <textarea
                  rows={3}
                  value={whyWorkWithMe}
                  onChange={(e) => setWhyWorkWithMe(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  {td('specialtiesLabel')}
                </label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                    {td('standardPriceLabel')}
                  </label>
                  <input
                    type="number"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                    {td('premiumPriceLabel')}
                  </label>
                  <input
                    type="number"
                    value={premiumPrice}
                    onChange={(e) => setPremiumPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                    {td('pricePerQuestionLabel')}
                  </label>
                  <input
                    type="number"
                    value={pricePerQuestion}
                    onChange={(e) => setPricePerQuestion(e.target.value)}
                    placeholder={td('optionalPlaceholder')}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                    {td('softCapLabel')}
                  </label>
                  <input
                    type="number"
                    value={softCap}
                    onChange={(e) => setSoftCap(e.target.value)}
                    placeholder={td('optionalPlaceholder')}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  {td('availableSlotsLabel')}
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">{td('availableSlotsHint')}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="datetime-local"
                    value={slotDraft}
                    onChange={(e) => setSlotDraft(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-[#FFF8E7]/40 border border-zinc-900/15 rounded-xl outline-none focus:bg-white focus:border-[#0F4C5C]"
                  />
                  <button
                    type="button"
                    onClick={addAvailableSlot}
                    className="btn-secondary-surface inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4 text-[#0F4C5C]" />
                    <span>{td('addSlot')}</span>
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {availableSlots.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 bg-[#FFF8E7]/50 border border-zinc-900/10 rounded-xl p-3">
                      {td('noSlots')}
                    </p>
                  ) : (
                    availableSlots.map((slot) => (
                      <div
                        key={slot}
                        className="flex items-center justify-between gap-3 bg-[#F5EFE0]/70 border border-zinc-900/10 rounded-xl px-3.5 py-2"
                      >
                        <span className="text-xs font-semibold text-zinc-800">
                          {formatSlot(slot, locale)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAvailableSlots((current) =>
                              current.filter((value) => value !== slot)
                            )
                          }
                          aria-label={td('removeSlot')}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {saveError && (
                <p className="text-[11px] text-red-600 font-semibold">{saveError}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="btn-primary-teal w-full py-3.5 font-semibold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4A84B]" />
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                ) : null}
                <span>{saved ? td('saved') : td('save')}</span>
              </button>
            </form>
            <MentorServicesEditor />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
