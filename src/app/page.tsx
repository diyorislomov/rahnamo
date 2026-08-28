'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DesertCaravan from '@/components/DesertCaravan';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { Counselor } from '@/types';
import { Star, ShieldCheck, ArrowRight, Search, Clock, Award, CheckCircle2, ChevronDown, Sparkles, UserCheck, MessageSquare, Zap } from 'lucide-react';

const SPECIALTIES = [
  'All',
  'Medicine & Healthcare',
  'Architecture & Design',
  'Law & Legal Practice',
  'Study Abroad',
  'Agriculture & Trade',
  'Engineering & Tech',
];

type SortOption = 'rating' | 'popular' | 'price-low' | 'price-high';

export default function Home() {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Filter & Search logic
  const filteredCounselors = INITIAL_COUNSELORS.filter((counselor) => {
    const matchesTag =
      selectedTag === 'All' || counselor.specialties.includes(selectedTag);

    const matchesSearch =
      searchQuery.trim() === '' ||
      counselor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      counselor.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTag && matchesSearch;
  });

  // Sort logic
  const sortedCounselors = [...filteredCounselors].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'popular') return b.reviewsCount - a.reviewsCount;
    if (sortBy === 'price-low') return a.standardPrice - b.standardPrice;
    if (sortBy === 'price-high') return b.standardPrice - a.standardPrice;
    return 0;
  });

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Silk Road Desert Hero Section */}
        <DesertCaravan />

        {/* MentorCruise Search & Multi-Filter Bar */}
        <section className="bg-white/95 p-6 rounded-3xl border border-amber-900/15 shadow-sm my-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rahnamolar ismi, soha yoki kalit so'z bo'yicha qidirish (masalan: Ordinatura, Fulbright, Legal)..."
                className="w-full pl-11 pr-4 py-3 bg-amber-50/40 border border-amber-900/15 rounded-2xl text-xs sm:text-sm text-stone-800 outline-none focus:ring-2 focus:ring-amber-700 transition-all placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 text-xs text-stone-400 hover:text-stone-600 font-bold cursor-pointer"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 self-end md:self-auto text-xs font-semibold">
              <span className="text-stone-500 whitespace-nowrap">Saralash:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-amber-50/80 border border-amber-900/15 text-amber-950 font-bold py-3 px-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-amber-700 cursor-pointer"
              >
                <option value="rating">Eng yuqori baholangan</option>
                <option value="popular">Eng ko'p sessiya o'tkazgan</option>
                <option value="price-low">Narx: Arzonroq</option>
                <option value="price-high">Narx: Qimmatroq</option>
              </select>
            </div>
          </div>

          {/* Specialty Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-900/10">
            {SPECIALTIES.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-amber-900 text-amber-50 shadow-xs border border-amber-950 scale-102'
                    : 'bg-amber-50/60 text-stone-700 border border-amber-900/10 hover:bg-amber-100/60'
                }`}
              >
                {tag === 'All' ? 'Barcha sohalar' : tag}
              </button>
            ))}
          </div>
        </section>

        {/* Mentor Cards Grid (MentorCruise Style) */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-amber-950">
                Saralangan Rahnamolar ({sortedCounselors.length})
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Markaziy Osiyoning yetakchi mutaxassislaridan 1-ga-1 konsultatsiya qabullari
              </p>
            </div>
          </div>

          {sortedCounselors.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 my-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-3">
                <Search className="w-8 h-8 text-amber-800" />
              </div>
              <h4 className="font-serif font-bold text-lg text-amber-950">Hech qanday Rahnamo topilmadi</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Qidiruv so'zini o'zgartiring yoki boshqa sohani tanlab ko'ring.
              </p>
              <button
                onClick={() => {
                  setSelectedTag('All');
                  setSearchQuery('');
                }}
                className="mt-4 bg-amber-900 text-amber-50 font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-amber-800 transition-all cursor-pointer"
              >
                Barcha Rahnamolarni ko'rsatish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCounselors.map((counselor) => (
                <div
                  key={counselor.id}
                  className="bg-white/95 rounded-3xl border border-amber-900/15 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div>
                    {/* Top Row: Verified Badge & Response Time */}
                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-amber-900/10">
                      <div className="flex items-center gap-1.5 bg-amber-100/70 text-amber-950 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-amber-300/50">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700 fill-amber-100" />
                        <span>Tasdiqlangan Rahnamo</span>
                      </div>

                      {counselor.responseTime && (
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                          <span>Javob: {counselor.responseTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Avatar & Name Header */}
                    <div className="flex items-start gap-4">
                      <img
                        src={counselor.avatarUrl}
                        alt={counselor.fullName}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-200 shadow-xs group-hover:border-amber-400 transition-all flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold text-base text-amber-950 group-hover:text-amber-800 transition-colors truncate">
                          {counselor.fullName}
                        </h3>
                        <p className="text-xs text-stone-600 mt-0.5 line-clamp-2 leading-relaxed">
                          {counselor.headline}
                        </p>
                        
                        {/* Rating & Total Sessions */}
                        <div className="flex items-center gap-2 mt-2 text-xs font-bold text-amber-900">
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{counselor.rating}</span>
                            <span className="text-stone-400 font-normal">({counselor.reviewsCount})</span>
                          </div>
                          {counselor.totalSessions && (
                            <span className="text-[10px] text-stone-500 font-normal truncate">
                              • {counselor.totalSessions} ta qabul
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    <p className="text-xs text-stone-600 mt-4 line-clamp-3 leading-relaxed border-t border-amber-900/10 pt-3">
                      {counselor.bio}
                    </p>

                    {/* Outcome Badges */}
                    {counselor.outcomes && counselor.outcomes.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {counselor.outcomes.map((outcome) => (
                          <div key={outcome} className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/50">
                            <CheckCircle2 className="w-3 h-3 text-amber-700 flex-shrink-0" />
                            <span className="truncate">{outcome}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Specialty Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {counselor.specialties.map((s) => (
                        <span
                          key={s}
                          className="bg-amber-100/60 text-amber-950 text-[10px] font-medium px-2.5 py-0.5 rounded-md border border-amber-300/40"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action Card */}
                  <div className="mt-6 pt-4 border-t border-amber-900/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Sessiya narxi</span>
                      <div className="text-sm font-serif font-extrabold text-amber-950">
                        {counselor.standardPrice.toLocaleString()} <span className="text-[10px] font-normal text-stone-500">UZS / 30m</span>
                      </div>
                    </div>

                    <Link
                      href={`/counselors/${counselor.id}`}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all group-hover:gap-2"
                    >
                      <span>Vaqt tanlash</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How Rahnamo Works Section (Desert Oasis Theme) */}
        <section id="how-it-works" className="bg-gradient-to-b from-[#1E1B4B] via-[#2A265F] to-[#1E1B4B] text-amber-50 rounded-3xl p-8 sm:p-12 my-16 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

          <div className="text-center max-w-2xl mx-auto mb-12 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>3 ta oddiy qadam</span>
            </div>
            <h2 className="font-serif font-bold text-2xl sm:text-4xl text-amber-100">
              Rahnamo platformasi qanday ishlaydi?
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/70 mt-2">
              Markaziy Osiyoning eng yaxshi ekspertlaridan 1-ga-1 konsultatsiya olish tartibi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="bg-white/5 border border-amber-300/15 p-6 rounded-2xl backdrop-blur-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 font-serif font-bold text-xl flex items-center justify-center mb-4 border border-amber-400/30">
                1
              </div>
              <h3 className="font-serif font-bold text-lg text-amber-100">Rahnamoni va vaqtni tanlang</h3>
              <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                Katalogdan o'zingizga ma'qul bo'lgan mutaxassisni tanlang, Standart yoki Premium paketni ko'rsatib, mos keladigan vaqtni belgilang.
              </p>
            </div>

            <div className="bg-white/5 border border-amber-300/15 p-6 rounded-2xl backdrop-blur-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 font-serif font-bold text-xl flex items-center justify-center mb-4 border border-amber-400/30">
                2
              </div>
              <h3 className="font-serif font-bold text-lg text-amber-100">To'lov va ma'lumotlarni to'ldirish</h3>
              <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                Payme, Click yoki Uzum Bank orqali xavfsiz to'lovni amalga oshiring. Rahnamoga beriladigan asosiy savolingizni yozing.
              </p>
            </div>

            <div className="bg-white/5 border border-amber-300/15 p-6 rounded-2xl backdrop-blur-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 font-serif font-bold text-xl flex items-center justify-center mb-4 border border-amber-400/30">
                3
              </div>
              <h3 className="font-serif font-bold text-lg text-amber-100">1-ga-1 Video muloqot</h3>
              <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
                Chipta va Google Meet havolasi darhol elektron pochtangizga va Telegram hisobingizga yuborildi. Belgilangan vaqtda suhbatni boshlang.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="max-w-3xl mx-auto my-16">
          <h2 className="font-serif font-bold text-2xl text-center text-amber-950 mb-6">
            Tez-tez beriladigan savollar
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Konsultatsiya bekor qilinsa yoki vaqt ko'chirilsa nima bo'ladi?",
                a: "Suhbat boshlanishidan 12 soat oldin administratorimizga murojaat qilsangiz, to'lov 100% qaytariladi yoki uchrashuv vaqti sizga qulay boshqa vaqtga ko'chiriladi.",
              },
              {
                q: "Suhbat qaysi dastur orqali o'tkaziladi?",
                a: "Barcha 1-ga-1 konsultatsiyalar Google Meet video havolasi orqali o'tkaziladi. Sizga xonaga ulanish havolasi elektron pochta va Telegram orqali yuboriladi.",
              },
              {
                q: "Rahnamolar ro'yxatiga qanday qo'shilish mumkin?",
                a: "Agar siz ham o'z sohangizda tajribali bo'lsangiz, menyudagi 'Rahnamo bo'lish' tugmasini bosib anketani to'ldirishingiz mumkin. 24 soat ichida profilingiz tasdiqlanadi.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white/95 rounded-2xl border border-amber-900/15 overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left font-serif font-bold text-sm text-amber-950 flex items-center justify-between cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180 text-amber-800' : 'text-stone-400'}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-stone-600 leading-relaxed border-t border-amber-900/10 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}