'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getDeviceId } from '@/lib/deviceId';
import { supabase } from '@/lib/supabase';
import { Calendar, ArrowLeft, CheckCircle, ExternalLink, ShieldCheck, Clock, Sparkles, Filter } from 'lucide-react';

interface SavedBooking {
  id: string;
  counselorName?: string;
  counselor_name?: string;
  counselorHeadline?: string;
  counselor_headline?: string;
  counselorAvatar?: string;
  counselor_avatar?: string;
  tier: string;
  price: number;
  paymentMethod?: string;
  slot: string;
  studentName?: string;
  student_name?: string;
  email?: string;
  telegram: string;
  createdAt?: string;
  created_at?: string;
  meetLink?: string;
  meet_link?: string;
  status?: string;
}

type TabFilter = 'all' | 'upcoming' | 'completed';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  useEffect(() => {
    async function loadBookings() {
      let localBookings: SavedBooking[] = [];
      try {
        const item = localStorage.getItem('rahnamo_bookings');
        if (item) {
          localBookings = JSON.parse(item);
        }
      } catch (err) {
        console.error('LocalStorage parse error:', err);
      }

      const deviceId = getDeviceId();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase fetch timeout')), 1500)
          );

          const fetchPromise = supabase
            .from('bookings')
            .select('*')
            .eq('device_id', deviceId)
            .order('created_at', { ascending: false });

          const res: any = await Promise.race([fetchPromise, timeoutPromise]);

          if (res?.data && res.data.length > 0) {
            const mergedMap = new Map<string, SavedBooking>();
            res.data.forEach((b: SavedBooking) => mergedMap.set(b.id, b));
            localBookings.forEach((b: SavedBooking) => mergedMap.set(b.id, b));

            const combined = Array.from(mergedMap.values()).sort((a, b) => {
              const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
              const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
              return timeB - timeA;
            });
            setBookings(combined);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Supabase bookings fetch error or timeout, fallback to local:', err);
        }
      }

      setBookings(localBookings);
      setLoading(false);
    }

    loadBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') return b.status !== 'completed';
    if (activeTab === 'completed') return b.status === 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Barcha Rahnamolar ro'yxatiga qaytish
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/10 text-amber-900 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Mening Boshqaruv Panelim</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-amber-950">
                Mening qabullarim va sessiyalarim
              </h1>
            </div>

            {/* Filter Tabs (MentorCruise Style) */}
            <div className="flex items-center bg-amber-100/70 p-1 rounded-2xl border border-amber-900/15 text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-amber-900 text-amber-50 shadow-xs'
                    : 'text-stone-700 hover:text-amber-950'
                }`}
              >
                Barcha ({bookings.length})
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-amber-900 text-amber-50 shadow-xs'
                    : 'text-stone-700 hover:text-amber-950'
                }`}
              >
                Kutilmoqda
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'completed'
                    ? 'bg-amber-900 text-amber-50 shadow-xs'
                    : 'text-stone-700 hover:text-amber-950'
                }`}
              >
                Yakunlangan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-stone-500 font-serif">
              Qabullar yuklanmoqda...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 my-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-amber-800" />
              </div>
              <h3 className="font-serif font-bold text-xl text-amber-950">
                Sizda hali qabullar yo'q
              </h3>
              <p className="text-xs text-stone-500 mt-2 max-w-sm mx-auto">
                Katalogdan o'zingizga ma'qul bo'lgan Rahnamoni tanlang va 1-ga-1 konsultatsiya uchun vaqt belgilang.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block bg-gradient-to-r from-amber-800 to-amber-900 text-amber-50 font-bold text-xs px-6 py-3 rounded-xl shadow-xs hover:from-amber-700 hover:to-amber-800 transition-all"
              >
                Rahnamolarni ko'rish
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const name = b.counselorName || b.counselor_name || 'Rahnamo';
                const headline = b.counselorHeadline || b.counselor_headline || '';
                const avatar = b.counselorAvatar || b.counselor_avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400';
                const meetUrl = b.meetLink || (b as any).meet_link || 'https://meet.google.com';

                return (
                  <div
                    key={b.id}
                    className="bg-white/95 rounded-3xl p-6 border border-amber-900/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={avatar}
                        alt={name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-md uppercase font-mono">
                            {b.id}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> To'langan & Tasdiqlangan
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-lg text-amber-950 mt-1">{name}</h3>
                        <p className="text-xs text-stone-500">{headline}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium text-amber-950">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-800" /> {b.slot}
                          </span>
                          <span>•</span>
                          <span className="capitalize font-bold text-amber-900">
                            {b.tier} ({b.price.toLocaleString()} UZS {b.paymentMethod ? `via ${b.paymentMethod.toUpperCase()}` : ''})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-amber-900/10 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center min-w-[180px]">
                      <span className="text-[11px] text-stone-500">Bog'lanish: {b.telegram}</span>
                      <a
                        href={meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
                      >
                        Google Meet <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}