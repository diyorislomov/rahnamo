'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DesertCaravan from '@/components/DesertCaravan';
import CounselorCard from '@/components/CounselorCard';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import { Search, ChevronDown, Sparkles } from 'lucide-react';

const SPECIALTY_CONFIG: { [key: string]: { label: string; activeClass: string; inactiveClass: string; icon: string } } = {
  All: {
    label: 'Barcha sohalar',
    activeClass: 'bg-amber-900 text-amber-50 border-amber-950 shadow-md ring-2 ring-amber-900/30 scale-105',
    inactiveClass: 'bg-amber-100/90 text-amber-950 border-amber-300 hover:bg-amber-200/80',
    icon: '✨',
  },
  'Medicine & Healthcare': {
    label: 'Tibbiyot & Salomatlik',
    activeClass: 'bg-emerald-700 text-emerald-50 border-emerald-800 shadow-md ring-2 ring-emerald-600/30 scale-105',
    inactiveClass: 'bg-emerald-100/90 text-emerald-950 border-emerald-300/80 hover:bg-emerald-200/80',
    icon: '🩺',
  },
  'Architecture & Design': {
    label: 'Arxitektura & Dizayn',
    activeClass: 'bg-rose-700 text-rose-50 border-rose-800 shadow-md ring-2 ring-rose-600/30 scale-105',
    inactiveClass: 'bg-rose-100/90 text-rose-950 border-rose-300/80 hover:bg-rose-200/80',
    icon: '🏛️',
  },
  'Law & Legal Practice': {
    label: 'Huquq & Korporativ',
    activeClass: 'bg-indigo-800 text-indigo-50 border-indigo-900 shadow-md ring-2 ring-indigo-600/30 scale-105',
    inactiveClass: 'bg-indigo-100/90 text-indigo-950 border-indigo-300/80 hover:bg-indigo-200/80',
    icon: '⚖️',
  },
  'Study Abroad': {
    label: 'Xalqaro Grantlar',
    activeClass: 'bg-purple-800 text-purple-50 border-purple-900 shadow-md ring-2 ring-purple-600/30 scale-105',
    inactiveClass: 'bg-purple-100/90 text-purple-950 border-purple-300/80 hover:bg-purple-200/80',
    icon: '🎓',
  },
  'Agriculture & Trade': {
    label: 'Qishloq xo\'jaligi & Eksport',
    activeClass: 'bg-amber-800 text-amber-50 border-amber-900 shadow-md ring-2 ring-amber-600/30 scale-105',
    inactiveClass: 'bg-amber-100/90 text-amber-950 border-amber-300/80 hover:bg-amber-200/80',
    icon: '🌾',
  },
  'Engineering & Tech': {
    label: 'Dasturlash & IT',
    activeClass: 'bg-sky-700 text-sky-50 border-sky-800 shadow-md ring-2 ring-sky-600/30 scale-105',
    inactiveClass: 'bg-sky-100/90 text-sky-950 border-sky-300/80 hover:bg-sky-200/80',
    icon: '💻',
  },
};

type SortOption = 'rating' | 'popular' | 'price-low' | 'price-high';

export default function Home() {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
        {/* Rahnamo Starry Night Hero Caravan */}
        <DesertCaravan />

        {/* MentorCruise Search & Distinct Multi-Colored Rounded-Full Category Filter Bar */}
        <section className="bg-white/95 p-6 sm:p-8 rounded-3xl border border-amber-900/15 shadow-sm my-8 space-y-5">
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

          {/* Category Filter Pills (Distinct Accent Colors & Rounded-Full Pills) */}
          <div className="flex flex-wrap gap-2.5 pt-3 border-t border-amber-900/10">
            {Object.keys(SPECIALTY_CONFIG).map((key) => {
              const cfg = SPECIALTY_CONFIG[key];
              const isSelected = selectedTag === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedTag(key)}
                  className={`px-4.5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 border flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isSelected ? cfg.activeClass : cfg.inactiveClass
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mentor Cards Grid (Lively Micro-Interactions & Hover Glow) */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-amber-950 flex items-center gap-2">
                <span>Saralangan Rahnamolar</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono">
                  {sortedCounselors.length}
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Markaziy Osiyoning yetakchi mutaxassislaridan 1-ga-1 konsultatsiya qabullari
              </p>
            </div>
          </div>

          {sortedCounselors.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-amber-900/15 my-6 shadow-xs">
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
                <CounselorCard key={counselor.id} counselor={counselor} />
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

        {/* FAQ Accordion Section (Interactive Expand/Collapse Accordion) */}
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
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen ? 'bg-amber-50/90 border-amber-800 shadow-sm ring-1 ring-amber-800/20' : 'bg-white/95 border-amber-900/15 hover:border-amber-900/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left font-serif font-bold text-sm text-amber-950 flex items-center justify-between cursor-pointer gap-4"
                  >
                    <span>{faq.q}</span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-amber-900 text-amber-50 rotate-180' : 'bg-amber-100 text-amber-900'}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-stone-700 leading-relaxed border-t border-amber-900/10 pt-3.5 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}