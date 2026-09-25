'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, RefreshCw } from 'lucide-react';

export default function PaymentInstructions({ onReady, showDetails = true }: { onReady?: (ready: boolean) => void; showDetails?: boolean }) {
  const t = useTranslations('journeys');
  const [config, setConfig] = useState<{ cardNumber: string; cardHolder: string } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    onReady?.(false);
    fetch('/api/payment-config', { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.configured || !data.cardNumber || !data.cardHolder) throw new Error('unconfigured');
        if (controller.signal.aborted) return;
        setConfig(data); setState('ready'); onReady?.(true);
      })
      .catch(() => { if (!controller.signal.aborted) { setState('error'); onReady?.(false); } });
    return () => controller.abort();
  }, [attempt, onReady]);
  if (state === 'loading') return <p className="ui-muted" role="status">{t('paymentLoading')}</p>;
  if (state === 'error' || !config) return <div className="ui-alert" role="alert"><p>{t('paymentUnavailable')}</p><button type="button" className="ui-button-secondary mt-3" onClick={() => { setState('loading'); setAttempt((n) => n + 1); }}><RefreshCw size={16} aria-hidden />{t('retry')}</button></div>;
  if (!showDetails) return <p className="ui-alert">{t('transferAfterSave')}</p>;
  return <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
    <p className="ui-eyebrow">{t('manualTransfer')}</p>
    <div className="flex items-center justify-between gap-3 flex-wrap"><span className="font-mono text-lg font-semibold tracking-wide select-all">{config.cardNumber}</span><button type="button" className="ui-button-secondary" aria-label={t('copyAccount')} onClick={async () => { try { await navigator.clipboard.writeText(config.cardNumber.replace(/\s/g, '')); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? t('copied') : t('copy')}</button></div>
    <p className="text-sm">{config.cardHolder}</p><p className="text-sm leading-relaxed text-stone-600">{t('manualTransferHelp')}</p>
    {copyError && <p role="status" className="text-sm">{t('copyFailed')}</p>}
  </div>;
}
