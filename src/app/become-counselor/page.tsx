'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SPECIALTY_CONFIG } from '@/lib/specialties';
import { formatInteger } from '@/lib/format';
import { SupportShell, SupportHeader, Field, Notice, SupportApiError, supportRequest } from '@/components/SupportUI';

const CATEGORIES = Object.keys(SPECIALTY_CONFIG).filter((key) => key !== 'All');
const positiveInteger = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 100_000_000;

export default function BecomeCounselorPage() {
  const t = useTranslations('becomeCounselor');
  const s = useTranslations('support.application');
  const c = useTranslations('support.common');
  const specialties = useTranslations('specialties');
  const locale = useLocale();
  const configured = isSupabaseConfigured();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [sessions, setSessions] = useState(5);
  const [examplePrice, setExamplePrice] = useState('50000');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) || '').trim();
    setError('');
    if (![value('expected_standard_price'), value('expected_premium_price')].every(positiveInteger) || (value('expected_price_per_question') && !positiveInteger(value('expected_price_per_question')))) {
      setError(s('priceError')); return;
    }
    if (value('expected_soft_cap') && (!positiveInteger(value('expected_soft_cap')) || Number(value('expected_soft_cap')) > 100 || !value('expected_price_per_question'))) {
      setError(s('capError')); return;
    }
    setBusy(true);
    try {
      const result = await supportRequest<{ success: boolean; application: { id: string } }>('/api/applications', {
        full_name: value('full_name'), headline: value('headline'), bio: value('bio'),
        specialties: [value('category'), value('specialties')].filter(Boolean).join(', '),
        email: value('email'), phone: value('phone'), telegram: value('telegram'),
        expected_standard_price: Number(value('expected_standard_price')),
        expected_premium_price: Number(value('expected_premium_price')),
        expected_price_per_question: value('expected_price_per_question') ? Number(value('expected_price_per_question')) : null,
        expected_soft_cap: value('expected_soft_cap') ? Number(value('expected_soft_cap')) : null,
      });
      if (!result.application?.id) throw new Error('missing_application');
      setReference(result.application.id);
    } catch (err) {
      setError(err instanceof SupportApiError && err.status === 429 ? c('rateLimit') : c('error'));
    } finally { setBusy(false); }
  }

  const input = (name: string, label: string, options: { type?: string; minLength?: number; optional?: boolean; initial?: string; hint?: string; maxLength?: number; max?: number } = {}) => <Field key={name} id={name} label={label} hint={options.hint}><input id={name} name={name} type={options.type || 'text'} required={!options.optional} minLength={options.minLength} maxLength={options.maxLength || 250} defaultValue={options.initial} min={options.type === 'number' ? 1 : undefined} step={options.type === 'number' ? 1 : undefined} max={options.type === 'number' ? options.max || 100_000_000 : undefined} inputMode={options.type === 'number' ? 'numeric' : undefined} aria-describedby={options.hint ? `${name}-hint` : undefined} autoComplete={name === 'full_name' ? 'name' : name === 'email' ? 'email' : name === 'phone' ? 'tel' : undefined} className="ui-input" /></Field>;

  return <SupportShell>
    <SupportHeader eyebrow={s('eyebrow')} title={s('title')} description={s('description')} />
    {reference ? <section className="ui-panel max-w-2xl p-6 sm:p-10" aria-labelledby="application-success"><CheckCircle2 aria-hidden="true" className="mb-5 h-10 w-10 text-emerald-700" /><h2 id="application-success" className="font-serif text-2xl font-semibold" tabIndex={-1}>{s('successTitle')}</h2><p role="status" className="ui-muted mt-3 leading-relaxed">{s('successBody')}</p><p className="mt-5 break-all rounded-xl bg-amber-50 p-3 text-sm">{s('reference', { id: reference })}</p><Link href="/" className="ui-button mt-6 inline-flex">{c('back')}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></section> : <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={submit} className="ui-panel p-5 sm:p-8" aria-busy={busy}>
        <h2 className="font-serif text-2xl font-semibold">{s('form')}</h2><p className="ui-muted mt-2 mb-6 text-sm">{c('required')}</p>
        {!configured && <div className="mb-6"><Notice>{c('demo')}</Notice></div>}
        <fieldset disabled={busy || !configured} className="space-y-8 disabled:opacity-70">
          <section className="space-y-5"><h3 className="ui-eyebrow">{s('profile')}</h3><div className="grid gap-5 sm:grid-cols-2">{input('full_name', t('form.fullNameLabel'), {minLength: 3})}{input('headline', t('form.headlineLabel'), {minLength: 5})}</div>
            <Field id="category" label={t('form.categoryLabel')} hint={t('form.categoryHint')}><select id="category" name="category" className="ui-input" aria-describedby="category-hint" required>{CATEGORIES.map(key => <option key={key} value={key}>{specialties(key)}</option>)}</select></Field>
            {input('specialties', t('form.specialtiesLabel'))}
            <Field id="bio" label={t('form.bioLabel')}><textarea id="bio" name="bio" className="ui-input min-h-36" required minLength={20} maxLength={5000} rows={5} /></Field>
          </section>
          <section className="space-y-5 border-t border-amber-950/10 pt-6"><h3 className="ui-eyebrow">{s('contact')}</h3>{input('email', t('form.emailLabel'), {type: 'email'})}<div className="grid gap-5 sm:grid-cols-2">{input('phone', t('form.phoneLabel'), {type: 'tel', minLength: 9, maxLength: 100})}{input('telegram', t('form.telegramLabel'), {minLength: 3})}</div></section>
          <section className="space-y-5 border-t border-amber-950/10 pt-6"><h3 className="ui-eyebrow">{s('pricing')}</h3><p className="ui-muted text-sm">{s('pricingHint')}</p><div className="grid gap-5 sm:grid-cols-2">{input('expected_standard_price', t('form.standardPriceLabel'), {type: 'number', initial: '45000'})}{input('expected_premium_price', t('form.premiumPriceLabel'), {type: 'number', initial: '130000'})}{input('expected_price_per_question', t('form.pricePerQuestionLabel'), {type: 'number', optional: true, hint: t('form.pricePerQuestionHint')})}{input('expected_soft_cap', t('form.softCapLabel'), {type: 'number', optional: true, max: 100})}</div></section>
          <button type="submit" className="ui-button w-full sm:w-auto"><Send className="h-4 w-4" aria-hidden="true" />{busy ? t('form.submitting') : t('form.submit')}</button>
        </fieldset>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      </form>
      <aside className="space-y-6">
        <section className="ui-panel p-6"><h2 className="font-serif text-xl font-semibold">{s('steps')}</h2><ol className="mt-5 space-y-4">{[1,2,3].map(n => <li key={n} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-950">{n}</span><p className="ui-muted text-sm leading-relaxed">{s(`step${n}`)}</p></li>)}</ol></section>
        <section className="rounded-3xl bg-amber-950 p-6 text-amber-50"><p className="text-xs font-bold uppercase tracking-widest text-amber-200">{t('calculator.badge')}</p><h2 className="mt-2 font-serif text-2xl">{t('calculator.heading')}</h2><label htmlFor="example-price" className="mt-5 block text-sm">{t('calculator.priceLabel')}</label><input id="example-price" type="number" min="1" step="1" value={examplePrice} onChange={e => setExamplePrice(e.target.value)} className="ui-input mt-2 text-stone-900" /><label htmlFor="sessions" className="mt-5 block text-sm">{t('calculator.sessionsCount', {count: sessions})}</label><input id="sessions" type="range" min="1" max="20" value={sessions} onChange={e => setSessions(Number(e.target.value))} className="mt-3 w-full accent-amber-300" /><p className="mt-5 text-sm text-amber-200">{t('calculator.monthlyLabel')}</p><p className="mt-1 text-3xl font-semibold tabular-nums">{formatInteger(Math.round((positiveInteger(examplePrice) ? Number(examplePrice) : 0) * sessions * 4 * 0.85), locale)} <span className="text-sm">UZS</span></p><p className="mt-4 text-sm leading-relaxed text-amber-100/85">{t('calculator.commissionNote')}</p><p className="mt-3 text-xs leading-relaxed text-amber-100/75">{s('calculatorNote')}</p></section>
      </aside>
    </div>}
  </SupportShell>;
}
