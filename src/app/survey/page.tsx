'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Send } from 'lucide-react';
import RahnamoLogo from '@/components/RahnamoLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Field, Notice, SupportHeader, SupportApiError, supportRequest } from '@/components/SupportUI';

export default function SurveyPage() {
  const t = useTranslations('support.survey');
  const c = useTranslations('support.common');
  const configured = isSupabaseConfigured();
  const [interest, setInterest] = useState('');
  const [advice, setAdvice] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || '').trim();
    const contact = value('contact_info');
    if (!value('interested_in_service') || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^@?[a-zA-Z][\w]{4,31}$/.test(contact))) {
      setError(t('requiredError')); return;
    }
    setBusy(true); setError('');
    try {
      await supportRequest('/api/survey', {
        age_range: value('age_range') || null, status: value('status') || null,
        field_of_study: value('field_of_study') || null,
        interest_area: (interest === 'Other' ? value('interest_other') : interest) || null,
        biggest_challenge: value('biggest_challenge') || null,
        prior_advice_source: (advice === 'Other' ? value('advice_other') : advice) || null,
        interested_in_service: value('interested_in_service'), price_willingness: value('price_willingness') || null,
        preferred_format: value('preferred_format') || null, contact_info: contact,
        willing_to_refer: data.get('willing_to_refer') === 'on',
      });
      setSubmitted(true);
    } catch (err) { setError(err instanceof SupportApiError && err.status === 429 ? c('rateLimit') : c('error')); }
    finally { setBusy(false); }
  }

  const select = (name: string, label: string, options: [string,string][], required = false, onChange?: (value: string) => void) => <Field id={name} label={label}><select id={name} name={name} className="ui-input" required={required} defaultValue="" onChange={onChange ? e => onChange(e.target.value) : undefined}><option value="">{c('choose')}</option>{options.map(([value,key]) => <option key={value} value={value}>{t(key)}</option>)}</select></Field>;

  return <div className="ui-page min-h-screen">
    <header className="border-b border-amber-950/10"><div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-5"><Link href="/" aria-label={c('back')}><RahnamoLogo className="h-10" /></Link><LanguageSwitcher /></div></header>
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <SupportHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      {submitted ? <section className="ui-panel p-7 sm:p-10"><CheckCircle2 className="mb-5 h-10 w-10 text-emerald-700" aria-hidden="true" /><h2 className="font-serif text-2xl font-semibold">{t('successTitle')}</h2><p role="status" className="ui-muted mt-3 leading-relaxed">{t('successBody')}</p><Link href="/" className="ui-button mt-6 inline-flex">{c('back')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></section> : <form className="ui-panel p-5 sm:p-8" onSubmit={submit} aria-busy={busy}>
        <h2 className="font-serif text-2xl font-semibold">{t('form')}</h2><p className="ui-muted mt-2 mb-6 text-sm">{c('required')}</p>
        {!configured && <div className="mb-6"><Notice>{c('demo')}</Notice></div>}
        <fieldset disabled={busy || !configured} className="space-y-8 disabled:opacity-70">
          <section className="space-y-5"><h3 className="ui-eyebrow">{t('background')}</h3><div className="grid gap-5 sm:grid-cols-2">
            {select('age_range', t('age'), [['Under 18','age0'],['18-24','age1'],['25-34','age2'],['35-44','age3'],['45+','age4']])}
            {select('status', t('status'), [['student','student'],['graduate','graduate'],['working','working'],['other','otherOption']])}
          </div><Field id="field_of_study" label={t('study')}><input id="field_of_study" name="field_of_study" className="ui-input" maxLength={300} /></Field>
          {select('interest_area', t('interest'), [['Medicine','medicine'],['Law','law'],['Architecture','architecture'],['IT/Programming','tech'],['Grants & Scholarships','grants'],['Agriculture','agriculture'],['Business','business'],['Other','otherOption']], false, setInterest)}
          {interest === 'Other' && <Field id="interest_other" label={t('other')}><input id="interest_other" name="interest_other" className="ui-input" maxLength={300} required /></Field>}
          </section>
          <section className="space-y-5 border-t border-amber-950/10 pt-6"><h3 className="ui-eyebrow">{t('preferences')}</h3>
            <Field id="biggest_challenge" label={t('challenge')}><textarea id="biggest_challenge" name="biggest_challenge" rows={4} maxLength={3000} className="ui-input" /></Field>
            {select('prior_advice_source', t('advice'), [['Friends','friends'],['Family','family'],['Internet forums','forums'],['No one','nobody'],['Other','otherOption']], false, setAdvice)}
            {advice === 'Other' && <Field id="advice_other" label={t('other')}><input id="advice_other" name="advice_other" className="ui-input" required maxLength={300} /></Field>}
            {select('interested_in_service', t('interested'), [['Yes definitely','definitely'],['Maybe','maybe'],['Not interested','notInterested']], true)}
            <div className="grid gap-5 sm:grid-cols-2">{select('price_willingness', t('price'), [['Under 30,000','price0'],['30,000-100,000','price1'],['100,000-300,000','price2'],['300,000-600,000','price3'],['600,000+','price4']])}{select('preferred_format', t('format'), [['Text chat','text'],['Video call','video']])}</div>
          </section>
          <section className="space-y-5 border-t border-amber-950/10 pt-6"><h3 className="ui-eyebrow">{t('contactSection')}</h3><Field id="contact_info" label={t('contact')} hint={t('contactHint')}><input id="contact_info" name="contact_info" required maxLength={254} className="ui-input" aria-describedby="contact_info-hint" autoComplete="email" /></Field><label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" name="willing_to_refer" className="mt-1 h-5 w-5 shrink-0 accent-amber-900" /><span>{t('refer')}</span></label></section>
          <button className="ui-button w-full sm:w-auto" type="submit"><Send className="h-4 w-4" aria-hidden="true" />{busy ? c('saving') : t('submit')}</button>
        </fieldset>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      </form>}
    </main>
  </div>;
}
