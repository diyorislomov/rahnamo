'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import { CamelIcon } from '@/components/Icons';
import { Calendar, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';

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
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let localBookings: SavedBooking[] = [];
      try {
        const saved = localStorage.getItem('rahnamo_bookings');
        if (saved) {
          localBookings = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load local bookings:', e);
      }

      // Display local bookings immediately
      setBookings(localBookings);
      setLoading(false);

      // Attempt non-blocking Supabase fetch with 1.5s timeout
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
        try {
          const deviceId = getDeviceId();
          const queryPromise = supabase
            .from('bookings')
            .select('*')
            .eq('device_id', deviceId)
            .order('created_at', { ascending: false });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), 1500)
          );

          const res: any = await Promise.race([queryPromise, timeoutPromise]);
          if (res && res.data && res.data.length > 0) {
            const remoteIds = new Set(res.data.map((item: any) => item.id));
            const uniqueLocal = localBookings.filter((b) => !remoteIds.has(b.id));
            setBookings([...res.data, ...uniqueLocal]);
          }
        } catch (err) {
          console.warn('Supabase fetch bypassed or timed out:', err);
        }
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-amber-950">Mening qabullarim</h1>
            <p className="text-xs text-stone-600 mt-1">Siz band qilgan barcha konsultatsiya va yo'l-yo'riq sessiyalari</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Bosh sahifa
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-stone-500 font-medium">Qabullar yuklanmoqda...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white/90 rounded-3xl p-12 border border-amber-900/10 text-center shadow-xs">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-900">
              <CamelIcon className="w-8 h-8 fill-amber-900" />
            </div>
            <h3 className="font-serif text-xl font-bold text-amber-950 mt-4">Hozircha faol qabullar yo'q</h3>
            <p className="text-xs text-stone-600 mt-2 max-w-sm mx-auto">
              O'z sohangizdagi tajribali rahnamoni tanlang va birinchi 1-ga-1 sessiyangizni band qiling.
            </p>
            <Link
              href="/"
              className="inline-block mt-6 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-xs"
            >
              Rahnamolarni ko'rish
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const name = b.counselorName || b.counselor_name || 'Rahnamo';
              const headline = b.counselorHeadline || b.counselor_headline || '';
              const avatar = b.counselorAvatar || b.counselor_avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400';

              return (
                <div
                  key={b.id}
                  className="bg-white/95 rounded-3xl p-6 border border-amber-900/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={avatar}
                      alt={name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200 shadow-xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md uppercase">
                          {b.id}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> To'langan & Tasdiqlangan
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-lg text-amber-950 mt-1">{name}</h3>
                      <p className="text-xs text-stone-500">{headline}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-medium text-amber-950">
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

                  <div className="border-t md:border-t-0 md:border-l border-amber-900/10 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                    <span className="text-[11px] text-stone-500">Bog'lanish: {b.telegram}</span>
                    <a
                      href={b.meetLink || (b as any).meet_link || 'https://meet.google.com'}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center justify-center gap-1.5 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs"
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

      <Footer />
    </div>
  );
}