'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { BookingTicketData } from '@/types';
import { ShieldCheck, UserCheck, Calendar, Video, Mail, Phone, ExternalLink, CheckCircle, XCircle, Clock, Search, Filter, RefreshCw, ArrowLeft, Lock, LogOut, KeyRound } from 'lucide-react';
import { CamelIcon } from '@/components/Icons';

interface CounselorApp {
  id?: string;
  full_name: string;
  headline: string;
  category: string;
  bio: string;
  company: string;
  email: string;
  phone: string;
  telegram: string;
  linkedin: string;
  expected_standard_price: number;
  expected_premium_price: number;
  status?: 'pending' | 'approved' | 'rejected';
}

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'bookings' | 'applications'>('bookings');
  const [bookings, setBookings] = useState<BookingTicketData[]>([]);
  const [applications, setApplications] = useState<CounselorApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial mock applications fallback
  const INITIAL_APPS: CounselorApp[] = [
    {
      id: 'APP-101',
      full_name: 'Jasurbek Alimov',
      headline: 'Senior Backend Engineer @ EPAM Systems',
      category: 'Engineering & Tech',
      company: 'EPAM Systems',
      email: 'jasur.alimov@epam.com',
      phone: '+998 90 345 67 89',
      telegram: '@jasuralimov',
      linkedin: 'https://linkedin.com/in/jasur-alimov',
      bio: '8+ years designing Java & Spring Cloud microservices. Mentored 30+ junior developers.',
      expected_standard_price: 60000,
      expected_premium_price: 150000,
      status: 'pending',
    },
    {
      id: 'APP-102',
      full_name: 'Dildora Niyazova',
      headline: 'Fulbright Scholar & Education Consultant',
      category: 'Study Abroad',
      company: 'Fulbright Association',
      email: 'dildora.niyazova@gmail.com',
      phone: '+998 93 111 22 33',
      telegram: '@dildoraniiazova',
      linkedin: 'https://linkedin.com/in/dildora-niyazova',
      bio: 'Assisting students with US University admissions and full scholarship applications.',
      expected_standard_price: 50000,
      expected_premium_price: 130000,
      status: 'pending',
    },
  ];

  const fetchAdminData = async () => {
    setLoading(true);
    
    // 1. Fetch Bookings from LocalStorage + Supabase
    let localBookings: BookingTicketData[] = [];
    try {
      localBookings = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
    } catch (e) {
      console.error(e);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      try {
        const { data: supaBookings } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
        if (supaBookings && supaBookings.length > 0) {
          const mapped: BookingTicketData[] = supaBookings.map((b) => ({
            id: b.id,
            counselorId: b.counselor_id,
            counselorName: b.counselor_name,
            counselorHeadline: b.counselor_headline || '',
            counselorAvatar: b.counselor_avatar || '',
            tier: b.tier,
            price: b.price,
            paymentMethod: b.payment_method,
            slot: b.slot,
            studentName: b.student_name,
            email: b.email,
            phone: b.phone,
            telegram: b.telegram,
            education: b.education,
            question: b.question,
            meetLink: b.meet_link,
            paymentStatus: b.payment_status || 'pending',
            paymentReceipt: b.payment_receipt || '',
            createdAt: b.created_at,
          }));

          const ids = new Set(localBookings.map((x) => x.id));
          const combined = [...localBookings, ...mapped.filter((m) => !ids.has(m.id))];
          setBookings(combined);
        } else {
          setBookings(localBookings);
        }

        // 2. Fetch Applications from Supabase
        const { data: supaApps } = await supabase.from('counselor_applications').select('*');
        if (supaApps && supaApps.length > 0) {
          setApplications(supaApps);
        } else {
          const localApps = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
          setApplications(localApps.length > 0 ? localApps : INITIAL_APPS);
        }
      } catch (err) {
        console.warn('Supabase fetch error:', err);
        setBookings(localBookings);
        setApplications(INITIAL_APPS);
      }
    } else {
      setBookings(localBookings);
      const localApps = JSON.parse(localStorage.getItem('rahnamo_applications') || '[]');
      setApplications(localApps.length > 0 ? localApps : INITIAL_APPS);
    }

    setLoading(false);
  };

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? sessionStorage.getItem('rahnamo_admin_token') : null;
    const envKey = process.env.NEXT_PUBLIC_ADMIN_KEY;
    const validKey = envKey || 'Goldenprof7!';

    if (savedToken && savedToken === validKey) {
      setIsAuthenticated(true);
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envKey = process.env.NEXT_PUBLIC_ADMIN_KEY;
    const validKey = envKey || 'Goldenprof7!';

    const entered = adminPassword.trim();
    if (entered === validKey) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('rahnamo_admin_token', entered);
      }
      setLoginError('');
      fetchAdminData();
    } else {
      setLoginError("Administrator paroli noto'g'ri. Parolni qaytadan kiriting.");
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('rahnamo_admin_token');
    }
  };

  const handleApprovePayment = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paymentStatus: 'confirmed' } : b))
    );

    try {
      const existing: BookingTicketData[] = JSON.parse(localStorage.getItem('rahnamo_bookings') || '[]');
      const updated = existing.map((b) => (b.id === id ? { ...b, paymentStatus: 'confirmed' } : b));
      localStorage.setItem('rahnamo_bookings', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      Promise.resolve(supabase.from('bookings').update({ payment_status: 'confirmed' }).eq('id', id))
        .catch((err) => console.warn('Supabase update error:', err));
    }
  };

  const handleApproveApplication = (id?: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id || app.email === id ? { ...app, status: 'approved' } : app))
    );
  };

  const handleRejectApplication = (id?: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id || app.email === id ? { ...app, status: 'rejected' } : app))
    );
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.counselorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If NOT Authenticated: Render Secure Login Gate
  if (!isAuthenticated) {
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
                Maxfiy Administrator Kirishi
              </span>
              <h1 className="font-serif font-extrabold text-2xl text-amber-950 mt-3">
                Rahnamo Admin Gate
              </h1>
              <p className="text-xs text-stone-600 mt-1">
                Talaba va mentorlarning shaxsiy ma'lumotlarini himoya qilish uchun administrator parolini kiriting.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Administrator Paroli
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
                {loginError && <p className="text-[11px] text-red-600 font-semibold mt-1.5">{loginError}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-serif font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Panelga Kirish</span>
              </button>
            </form>

            <p className="text-[10px] text-stone-400 pt-2 border-t border-amber-900/10">
              O'zbekiston Respublikasining "Shaxsga doir ma'lumotlar to'g'risida"gi qonuniga muvofiq himoyalangan.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Title & Logout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-900/15 text-amber-950 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
              <span>Rahnamo Admin Management</span>
            </div>
            <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-950">
              Platforma Boshqaruv Paneli
            </h1>
            <p className="text-xs text-stone-600 mt-1">
              Band qilingan konsultatsiyalar va kelib tushgan Rahnamolik arizalarini boshqarish
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="inline-flex items-center gap-2 bg-amber-900 text-amber-50 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-800 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </button>

            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-3 mb-6 border-b border-amber-900/15 pb-3">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Konsultatsiya Qabullari ({bookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'bg-amber-900 text-amber-50 shadow-sm'
                : 'bg-amber-50/70 text-stone-700 hover:bg-amber-100/60 border border-amber-900/10'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Rahnamolik Arizalari ({applications.length})</span>
          </button>
        </div>

        {/* Tab 1: Bookings Management */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Search Filter */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Talaba ismi, Rahnamo yoki Chipta ID bo'yicha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-amber-900/15 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>

            {filteredBookings.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <Calendar className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">Hali hech qanday bandlovlar mavjud emas</h4>
                <p className="text-xs text-stone-500 mt-1">Platformada yangi bandlov to'lovi amalga oshirilganda shu yerda ko'rinadi.</p>
              </div>
            ) : (
              <div className="bg-white/95 rounded-3xl border border-amber-900/15 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50/80 border-b border-amber-900/10 text-amber-950 font-serif font-bold">
                        <th className="p-4">Chipta ID</th>
                        <th className="p-4">Talaba / Buyurtmachi</th>
                        <th className="p-4">Rahnamo</th>
                        <th className="p-4">Vaqt & Paket</th>
                        <th className="p-4">To'lov Status</th>
                        <th className="p-4">Google Meet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/10">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-amber-900">{b.id}</td>
                          <td className="p-4">
                            <div className="font-bold text-stone-900">{b.studentName}</div>
                            <div className="text-[11px] text-stone-500">{b.email} • {b.phone}</div>
                            <div className="text-[10px] text-amber-800 font-semibold">{b.telegram}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-amber-950">{b.counselorName}</div>
                            <div className="text-[10px] text-stone-500 line-clamp-1">{b.counselorHeadline}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-stone-900">{b.slot}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300/50">
                              {b.tier.toUpperCase()} ({b.price.toLocaleString()} UZS)
                            </span>
                          </td>
                          <td className="p-4">
                            {b.paymentStatus === 'confirmed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle className="w-3 h-3 text-emerald-700" />
                                <span>TASDIQLANGAN ({b.paymentMethod})</span>
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                                  <span>TEKSHIRILMOQDA</span>
                                </span>
                                {b.paymentReceipt && (
                                  <div className="text-[10px] font-mono text-stone-600">
                                    Chek ID: <span className="font-bold text-amber-950">{b.paymentReceipt}</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(b.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-emerald-50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer block"
                                >
                                  To'lovni Tasdiqlash ✓
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <a
                              href={b.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Xonaga kirish</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Counselor Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            {applications.length === 0 ? (
              <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 shadow-xs">
                <UserCheck className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-amber-950">Arizalar mavjud emas</h4>
                <p className="text-xs text-stone-500 mt-1">Nomi ko'rsatilgan mutaxassislar ariza topshirganda bu yerda ko'rinadi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {applications.map((app, idx) => (
                  <div key={app.id || idx} className="bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-amber-900/10 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{app.category}</span>
                        <h3 className="font-serif font-bold text-base text-amber-950">{app.full_name}</h3>
                        <p className="text-xs text-stone-600">{app.headline} ({app.company})</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        app.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-900 border border-red-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {app.status ? app.status.toUpperCase() : 'PENDING'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-900/10">
                      "{app.bio}"
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 font-mono">
                      <div>📧 {app.email}</div>
                      <div>📞 {app.phone}</div>
                      <div>💬 {app.telegram}</div>
                      <div>
                        <a href={app.linkedin} target="_blank" rel="noreferrer" className="text-amber-800 underline">
                          LinkedIn profil
                        </a>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-900/10 flex items-center justify-between">
                      <div className="text-xs font-serif">
                        <span className="text-stone-400 block text-[10px]">Kutilayotgan sessiya narxi</span>
                        <span className="font-bold text-amber-950">{app.expected_standard_price?.toLocaleString()} UZS</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectApplication(app.id || app.email)}
                          className="px-3.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          Rad etish
                        </button>
                        <button
                          onClick={() => handleApproveApplication(app.id || app.email)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-900 text-amber-50 text-xs font-bold hover:bg-amber-800 transition-colors cursor-pointer shadow-xs"
                        >
                          Tasdiqlash (Katalogga qo'shish)
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
