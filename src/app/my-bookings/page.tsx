'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CamelIcon } from '@/components/Icons';
import { Calendar, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';

interface SavedBooking {
  id: string;
  counselorName: string;
  counselorHeadline: string;
  counselorAvatar: string;
  tier: string;
  price: number;
  paymentMethod?: string;
  slot: string;
  studentName: string;
  email: string;
  telegram: string;
  createdAt: string;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<SavedBooking[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rahnamo_bookings');
    if (saved) {
      try {
        setBookings(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-amber-950">Mening qabullarim</h1>
              <p className="text-xs text-stone-600 mt-1">Siz band qilgan barcha konsultatsiya va yo'l-yo'riq sessiyalari</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-300/60"
            >
              <ArrowLeft className="w-4 h-4" /> Bosh sahifa
            </Link>
          </div>

          {bookings.length === 0 ? (
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
                className="inline-block mt-6 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold px-6 py-3 rounded-xl transition-all"
              >
                Rahnamolarni ko'rish
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white/95 rounded-3xl p-6 border border-amber-900/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={b.counselorAvatar}
                      alt={b.counselorName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200"
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
                      <h3 className="font-serif font-bold text-lg text-amber-950 mt-1">{b.counselorName}</h3>
                      <p className="text-xs text-stone-500">{b.counselorHeadline}</p>
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
                      href="https://meet.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center justify-center gap-1.5 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs"
                    >
                      Google Meet <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}