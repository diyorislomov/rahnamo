'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { isRunningStaleBuild } from '@/lib/buildVersion';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Mounted once, site-wide, in the root layout. A tab that's been open since
 * before a deploy keeps running its old JS forever -- ordinary navigation
 * and interaction never reload it, only a genuine fresh page load does.
 * This is what catches that case for a real visitor who never opens
 * DevTools: periodic polling plus a check on tab-focus, independent of the
 * stricter pre-action checks on booking/payment-confirm.
 */
export default function StaleBuildWatcher() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      isRunningStaleBuild().then((isStale) => {
        if (!cancelled && isStale) setStale(true);
      });
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    const onAnnounce = () => setStale(true);
    window.addEventListener('rahnamo:stale-build', onAnnounce);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('rahnamo:stale-build', onAnnounce);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-amber-900 text-amber-50 text-xs font-semibold px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-[90vw]">
      <span>Sayt yangilandi. Davom etish uchun sahifani yangilang.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 bg-amber-50 text-amber-950 px-3 py-1.5 rounded-xl font-bold cursor-pointer flex-shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Yangilash</span>
      </button>
    </div>
  );
}
