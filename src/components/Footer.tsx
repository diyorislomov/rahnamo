import Link from 'next/link';
import { CamelIcon, GuidingStarIcon } from '@/components/Icons';
import { Send, Shield, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-amber-900/10 bg-[#F3EAD8] text-stone-700 text-xs">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-900 flex items-center justify-center text-amber-100">
                <CamelIcon className="w-4 h-4 fill-amber-100" />
              </div>
              <span className="font-serif font-black text-xl tracking-wide text-amber-950">
                rahnamo
              </span>
            </Link>
            <p className="text-stone-600 max-w-sm text-xs leading-relaxed">
              O'zbekiston va Markaziy Osiyo yoshlari uchun o'z sohasining yetuk mutaxassislari bilan 1-ga-1 yo'naltiruvchi maslahat platformasi.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-900 font-semibold pt-1">
              <GuidingStarIcon className="w-3.5 h-3.5 text-amber-700" />
              <span>Har bir yo'lovchiga o'z Rahnamosi.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="font-serif font-bold text-amber-950 text-sm">Platforma</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-amber-900 transition-colors">
                  Rahnamolar katalogi
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-amber-900 transition-colors">
                  Qanday ishlaydi?
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-amber-900 transition-colors">
                  Mening qabullarim
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-2.5">
            <h4 className="font-serif font-bold text-amber-950 text-sm">Aloqa & Hamkorlik</h4>
            <p className="text-stone-600 text-xs">
              Savollar yoki ekspert sifatida qo'shilish uchun:
            </p>
            <a
              href="https://t.me/rahnamo_admin"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-amber-900 hover:text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300/60"
            >
              <Send className="w-3.5 h-3.5" />
              @rahnamo_admin
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-amber-900/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
          <p>© {currentYear} Rahnamo. Barcha huquqlar himoyalangan.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-800" /> Xavfsiz to'lov va kafolatlangan sessiyalar
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}