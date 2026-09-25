'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('discovery.stale');

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
    <div role="status" className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-32px)] max-w-xl -translate-x-1/2 flex-wrap items-center gap-3 rounded-2xl border border-[#bca78d] bg-[#fff8eb] p-4 text-sm text-[#57371e] shadow-lg">
      <span className="min-w-0 flex-1 basis-56">{t('message')}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="ui-button"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>{t('reload')}</span>
      </button>
    </div>
  );
}
