'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { KeyRound, Mail, Lock, Loader2, LogOut, CheckCircle2, Camera } from 'lucide-react';

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

  const [checkingSession, setCheckingSession] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Login gate state (mirrors the admin page's own login-gate pattern --
  // one page, no separate /mentor/login route)
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
  const [availableSlots, setAvailableSlots] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadCounselor = async (authId: string) => {
    const { data, error } = await supabase
      .from('counselors')
      .select(
        'id, full_name, headline, avatar_url, specialties, bio, standard_price, premium_price, available_slots, why_work_with_me, price_per_question, soft_cap'
      )
      .eq('auth_id', authId)
      .maybeSingle();

    if (error || !data) {
      console.error('[MENTOR_DASHBOARD_LOAD_FAILED]', error);
      setLoadError(td('loadFailed'));
      return;
    }

    const row = data as MentorRow;
    setCounselor(row);
    setHeadline(row.headline || '');
    setBio(row.bio || '');
    setWhyWorkWithMe(row.why_work_with_me || '');
    setSpecialties((row.specialties || []).join(', '));
    setStandardPrice(String(row.standard_price ?? ''));
    setPremiumPrice(String(row.premium_price ?? ''));
    setPricePerQuestion(row.price_per_question != null ? String(row.price_per_question) : '');
    setSoftCap(row.soft_cap != null ? String(row.soft_cap) : '');
    setAvailableSlots((row.available_slots || []).join('\n'));
    setAvatarUrl(row.avatar_url || '');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id || null;
      setUserId(uid);
      setCheckingSession(false);
      if (uid) loadCounselor(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        loadCounselor(session.user.id);
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
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
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
    const path = `mentors/${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    setUploadingPhoto(false);

    if (error) {
      console.error('[MENTOR_PHOTO_UPLOAD_FAILED]', error);
      setSaveError(td('photoUploadFailed'));
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setSaveError('');
    setSaved(false);

    // Only ever touches the columns the Stage 0 GRANT actually allows a
    // mentor to update -- id/auth_id/rating/reviews_count/etc. are never
    // in this payload, so even a modified client can't widen this.
    const { error } = await supabase
      .from('counselors')
      .update({
        headline,
        bio,
        why_work_with_me: whyWorkWithMe || null,
        specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
        standard_price: Number(standardPrice) || 0,
        premium_price: Number(premiumPrice) || 0,
        price_per_question: pricePerQuestion ? Number(pricePerQuestion) : null,
        soft_cap: softCap ? Number(softCap) : null,
        available_slots: availableSlots.split('\n').map((s) => s.trim()).filter(Boolean),
        avatar_url: avatarUrl,
      })
      .eq('auth_id', userId)
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      console.error('[MENTOR_DASHBOARD_SAVE_FAILED]', error);
      setSaveError(td('saveFailed'));
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-[#FAF6EE]" />;
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased flex flex-col justify-between">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-16 w-full">
          <div className="bg-white rounded-3xl border border-amber-900/15 p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                {t('login.badge')}
              </span>
              <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-3">{t('login.title')}</h1>
              <p className="text-xs text-stone-600 mt-1">{t('login.subtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{t('login.emailLabel')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{t('login.passwordLabel')}</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
                {loginError && <p className="text-[11px] text-red-600 font-semibold mt-1.5">{loginError}</p>}
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loggingIn ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <Lock className="w-4 h-4 text-amber-300" />}
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
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased pb-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif font-extrabold text-2xl text-amber-950">{td('title')}</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-amber-900 bg-white px-3.5 py-2 rounded-xl border border-amber-900/15"
          >
            <LogOut className="w-3.5 h-3.5" /> {td('signOut')}
          </button>
        </div>

        {loadError && <p className="text-sm text-red-600 font-semibold">{loadError}</p>}

        {counselor && (
          <form onSubmit={handleSave} className="bg-white/95 p-6 md:p-8 rounded-3xl border border-amber-900/10 shadow-sm space-y-5">
            <div className="flex items-center gap-4">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop'}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-200"
              />
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-xl border border-amber-300 cursor-pointer">
                {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{td('changePhoto')}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">{td('headlineLabel')}</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">{td('bioLabel')}</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">{td('whyWorkWithMeLabel')}</label>
              <textarea
                rows={3}
                value={whyWorkWithMe}
                onChange={(e) => setWhyWorkWithMe(e.target.value)}
                className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">{td('specialtiesLabel')}</label>
              <input
                type="text"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{td('standardPriceLabel')}</label>
                <input
                  type="number"
                  value={standardPrice}
                  onChange={(e) => setStandardPrice(e.target.value)}
                  className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{td('premiumPriceLabel')}</label>
                <input
                  type="number"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                  className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{td('pricePerQuestionLabel')}</label>
                <input
                  type="number"
                  value={pricePerQuestion}
                  onChange={(e) => setPricePerQuestion(e.target.value)}
                  placeholder={td('optionalPlaceholder')}
                  className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">{td('softCapLabel')}</label>
                <input
                  type="number"
                  value={softCap}
                  onChange={(e) => setSoftCap(e.target.value)}
                  placeholder={td('optionalPlaceholder')}
                  className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">{td('availableSlotsLabel')}</label>
              <textarea
                rows={4}
                value={availableSlots}
                onChange={(e) => setAvailableSlots(e.target.value)}
                placeholder={td('availableSlotsPlaceholder')}
                className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl outline-none focus:ring-2 focus:ring-amber-700 font-mono"
              />
            </div>

            {saveError && <p className="text-[11px] text-red-600 font-semibold">{saveError}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : null}
              <span>{saved ? td('saved') : td('save')}</span>
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
