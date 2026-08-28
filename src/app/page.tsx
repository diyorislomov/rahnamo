'use client';

import { useState } from 'react';
import Link from 'next/link';
import { INITIAL_COUNSELORS } from '@/lib/mockData';
import Navbar from '@/components/Navbar';
import { Star, ShieldCheck, Search } from 'lucide-react';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tags = [
    'All',
    'Medicine & Healthcare',
    'Architecture & Design',
    'Law & Legal Practice',
    'Study Abroad',
    'Agriculture & Trade',
    'Engineering & Tech',
  ];

  const filteredCounselors = INITIAL_COUNSELORS.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.headline.toLowerCase().includes(search.toLowerCase()) ||
      c.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesTag = !selectedTag || selectedTag === 'All' || c.specialties.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2C241E] font-sans antialiased selection:bg-amber-200 selection:text-amber-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-6 text-center bg-gradient-to-b from-[#F3EAD8] via-[#FAF6EE] to-[#FAF6EE] border-b border-amber-900/5">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-900/5 border border-amber-900/10 text-amber-900 text-xs font-semibold mb-6">
            <span>✨</span>
            <span>Yo'lingizni o'z sohasining yetuk ustozlari bilan toping</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-amber-950 leading-[1.15]">
            Kasb ummonida adashmang. <br />
            <span className="bg-gradient-to-r from-amber-800 via-orange-800 to-amber-900 bg-clip-text text-transparent">
              Rahnamoyingizni tanlang.
            </span>
          </h1>

          <p className="mt-5 text-stone-700 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Tibbiyot, Huquq, Muhandislik, San'at, Biznes yoki Xorijda Ta'lim — tajribali mutaxassislar bilan 1-ga-1 yo'naltiruvchi maslahat sessiyalari.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative shadow-sm rounded-2xl">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-amber-800/60" />
              <input
                type="text"
                placeholder="Qidiruv: shifokor, arxitektor, huquqshunos, stipendiyalar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-900/15 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-700 text-sm text-amber-950 placeholder:text-stone-400 transition-all"
              />
            </div>

            {/* Field Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    (selectedTag === tag || (!selectedTag && tag === 'All'))
                      ? 'bg-amber-900 text-amber-50 shadow-sm font-medium'
                      : 'bg-white/80 text-stone-700 border border-amber-900/10 hover:bg-amber-100/60'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative Caravan Silhouette Graphic */}
        <div className="mt-10 flex items-center justify-center gap-4 text-amber-900/40 text-2xl select-none opacity-80">
          <span>🏜️</span>
          <span>🐪</span>
          <span>🐪</span>
          <span>🐪</span>
          <span>✨</span>
          <span>🕌</span>
        </div>
      </section>

      {/* Counselors Grid */}
      <main className="max-w-6xl mx-auto px-6 py-12 pb-16">
        <div className="flex items-center justify-between mb-8 border-b border-amber-900/10 pb-4">
          <div>
            <h2 className="font-serif font-bold text-2xl text-amber-950">Tajribali Rahnamolar</h2>
            <p className="text-xs text-stone-600 mt-0.5">O'z sohangizdagi yo'l ko'rsatuvchi ustozni tanlang</p>
          </div>
          <span className="text-xs font-semibold text-amber-900 bg-amber-100 px-3 py-1 rounded-lg border border-amber-300/60">
            {filteredCounselors.length} ta mutaxassis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCounselors.map((c) => (
            <div
              key={c.id}
              className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border border-amber-900/10 shadow-sm hover:shadow-md hover:border-amber-700/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-4">
                  <img
                    src={c.avatarUrl}
                    alt={c.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-200/80 shadow-xs"
                  />
                  <div>
                    <h3 className="font-serif font-bold text-base text-amber-950 flex items-center gap-1.5">
                      {c.fullName}
                      <ShieldCheck className="w-4 h-4 text-amber-700 fill-amber-100" />
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-1">{c.headline}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-800">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{c.rating}</span>
                      <span className="text-stone-400 font-normal">({c.reviewsCount} ta baho)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {c.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="bg-amber-50 text-amber-900 border border-amber-200/60 text-[11px] font-medium px-2.5 py-0.5 rounded-lg"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <p className="text-stone-600 text-xs mt-3 line-clamp-3 leading-relaxed">
                  {c.bio}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-amber-900/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800/70 tracking-wider">Sessiya narxi</span>
                  <p className="text-sm font-black text-amber-950 font-serif">
                    {c.standardPrice.toLocaleString()} <span className="text-xs font-normal text-stone-500 font-sans">so'm</span>
                  </p>
                </div>
                <Link
                  href={`/counselors/${c.id}`}
                  className="bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-amber-50 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-amber-950/10"
                >
                  Suhbatga yozilish
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-[#F3EAD8]/70 border-t border-amber-900/10 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif font-bold text-3xl text-amber-950">Qanday ishlaydi?</h2>
          <p className="text-xs text-stone-600 mt-2">Karvon yo'lida 3 ta oddiy qadam</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div className="bg-white/80 p-6 rounded-3xl border border-amber-900/10 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold font-serif">
                1
              </div>
              <h3 className="font-serif font-bold text-base text-amber-950 mt-4">Rahnamoni tanlang</h3>
              <p className="text-xs text-stone-600 mt-2">
                O'zingiz qiziqqan kasb, soha yoki chet elda o'qish bo'yicha mutaxassis profilini ko'ring.
              </p>
            </div>

            <div className="bg-white/80 p-6 rounded-3xl border border-amber-900/10 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold font-serif">
                2
              </div>
              <h3 className="font-serif font-bold text-base text-amber-950 mt-4">Vaqtni belgilang</h3>
              <p className="text-xs text-stone-600 mt-2">
                O'zingizga ma'qul bo'lgan vaqtni tanlang va rahnamoga asosiy savollaringizni yozing.
              </p>
            </div>

            <div className="bg-white/80 p-6 rounded-3xl border border-amber-900/10 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold font-serif">
                3
              </div>
              <h3 className="font-serif font-bold text-base text-amber-950 mt-4">1-ga-1 Suhbat</h3>
              <p className="text-xs text-stone-600 mt-2">
                Google Meet orqali jonli muloqot qilib, aniq yo'l xaritasiga ega bo'ling.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}