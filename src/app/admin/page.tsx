'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, LockKeyhole, LogOut, RefreshCw, Search } from 'lucide-react';
import { SupportShell, SupportHeader, Field, Notice, Busy, SupportApiError, supportRequest } from '@/components/SupportUI';

interface Booking { id: string; student_name: string; counselor_name: string; email: string; phone: string; telegram: string; slot: string; tier: string; price: number; payment_method: string; payment_status: string; payment_receipt?: string; status: string; question?: string; education?: string; meet_link?: string; created_at: string }
interface Application { id: string; full_name: string; headline: string; specialties: string; bio: string; email: string; phone: string; telegram: string; status: string; expected_standard_price: number; expected_premium_price: number; expected_price_per_question?: number | null; expected_soft_cap?: number | null; created_at: string }
interface Question { id: string; student_name_or_anonymous: string; email?: string; title: string; body: string; category: string; created_at: string }
interface Answer { id: string; question_id: string; counselor_id: string; body: string; created_at: string }
interface Mentor { id: string; full_name: string; headline: string; specialties: string[]; standard_price: number; premium_price: number; price_per_question?: number | null; commission_free_until?: string; available_slots?: string[] }
interface Survey { id: string; created_at: string; age_range?: string; status?: string; field_of_study?: string; interest_area?: string; biggest_challenge?: string; prior_advice_source?: string; interested_in_service: string; price_willingness?: string; preferred_format?: string; contact_info: string; willing_to_refer?: boolean }
interface Thread { id: string; booking_id: string; questions_used: number; total_owed: number; payment_status: string; payment_receipt?: string; created_at: string; booking?: {student_name: string; email: string; telegram: string} | null; counselor?: {full_name: string; headline: string} | null }
interface AdminData { truncated?: boolean; bookings: Booking[]; applications: Application[]; forumQuestions: Question[]; forumAnswers: Answer[]; surveyResponses: Survey[]; counselors: Mentor[]; threads: Thread[] }
type Tab = 'bookings' | 'applications' | 'threads' | 'forum' | 'survey' | 'counselors';
const EMPTY: AdminData = {bookings:[],applications:[],forumQuestions:[],forumAnswers:[],surveyResponses:[],counselors:[],threads:[]};
const TABS: Tab[] = ['bookings','applications','threads','forum','survey','counselors'];
const safeHttps = (value?: string) => { try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : null; } catch { return null; } };

export default function AdminDashboardPage() {
  const t = useTranslations('support.admin');
  const c = useTranslations('support.common');
  const survey = useTranslations('support.survey');
  const locale = useLocale();
  const [auth, setAuth] = useState<'checking'|'signedOut'|'signedIn'>('checking');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [data, setData] = useState<AdminData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<Tab>('bookings');
  const [query, setQuery] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string,string>>({});
  const [warnings, setWarnings] = useState<Record<string,string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const expireSession = useCallback(() => { setAuth('signedOut'); setData(EMPTY); setError(t('sessionExpired')); }, [t]);
  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await supportRequest<AdminData & {success:boolean}>('/api/admin/data');
      for (const key of Object.keys(EMPTY) as (keyof AdminData)[]) if (!Array.isArray(result[key])) throw new Error('invalid_data');
      setData(result);
    } catch (err) {
      if (err instanceof SupportApiError && err.status === 401) expireSession();
      else setError(t('loadFailed'));
    } finally { setLoading(false); }
  }, [expireSession, t]);

  useEffect(() => {
    let active = true;
    supportRequest<{authenticated:boolean}>('/api/admin/check').then(result => {
      if (!active) return;
      if (result.authenticated) { setAuth('signedIn'); void loadData(); }
      else setAuth('signedOut');
    }).catch(() => { if (active) { setAuth('signedOut'); setError(c('loadError')); } });
    return () => { active = false; };
  }, [loadData, c]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (loginBusy) return;
    setLoginBusy(true); setError('');
    try { await supportRequest('/api/admin/login', {password}); setPassword(''); setAuth('signedIn'); await loadData(); }
    catch (err) { setError(err instanceof SupportApiError && err.status === 429 ? c('rateLimit') : t('loginError')); }
    finally { setLoginBusy(false); }
  }

  async function logout() {
    setLogoutBusy(true); setError('');
    try { await supportRequest('/api/admin/logout', {}); setAuth('signedOut'); setData(EMPTY); setRowErrors({}); setWarnings({}); setSuccess(''); }
    catch { setError(c('error')); }
    finally { setLogoutBusy(false); }
  }

  async function action(kind: 'bookings'|'applications'|'threads', id: string, actionName: string) {
    if (busyKey) return;
    const key = `${kind}:${id}`;
    setBusyKey(key); setSuccess(''); setRowErrors(prev => ({...prev,[key]:''})); setWarnings(prev => ({...prev,[key]:''}));
    try {
      const result = await supportRequest<{success:boolean; booking?: Booking | Booking[]; thread?: {id:string;payment_status:string}; counselorId?:string; warning?:string}>(`/api/admin/${kind}`, {
        action: actionName, ...(kind === 'bookings' ? {bookingId:id} : kind === 'applications' ? {applicationId:id} : {threadId:id}),
      });
      // Reflect acknowledged writes only. Refresh below reconciles joined data.
      setData(prev => {
        if (kind === 'applications') return {...prev, applications: actionName === 'delete' ? prev.applications.filter(a => a.id !== id) : prev.applications.map(a => a.id === id ? {...a,status:actionName === 'approve' ? 'approved':'rejected'} : a)};
        if (kind === 'bookings') {
          const saved = Array.isArray(result.booking) ? result.booking[0] : result.booking;
          return {...prev,bookings:prev.bookings.map(b => b.id === id ? {...b,...saved,...(!saved ? actionName === 'confirm_payment' ? {payment_status:'confirmed'} : {status:'completed'} : {})} : b)};
        }
        return {...prev,threads:prev.threads.map(th => th.id === id ? {...th,payment_status:result.thread?.payment_status || (actionName === 'flag' ? 'awaiting_payment':'closed')} : th)};
      });
      setDeleteId(null); setSuccess(c('saved'));
      if (result.warning) setWarnings(prev => ({...prev,[key]:t('paymentWarning')}));
      await loadData();
    } catch (err) {
      if (err instanceof SupportApiError && err.status === 401) expireSession();
      else setRowErrors(prev => ({...prev,[key]:err instanceof SupportApiError && err.status === 429 ? c('rateLimit') : c('error')}));
    } finally { setBusyKey(null); }
  }

  const money = (amount: number | null | undefined) => c('money', {amount:Number(amount || 0).toLocaleString(locale)});
  const date = (value?: string) => { const d = new Date(value || ''); return Number.isNaN(d.getTime()) ? t('unknown') : d.toLocaleString(locale, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
  const status = (value?: string) => t.has(value || '') ? t(value || '') : value || t('unknown');
  const statusBadge = (value?: string) => <span className={`ui-status ${value === 'confirmed' || value === 'approved' || value === 'completed' || value === 'closed' ? 'bg-emerald-50 text-emerald-900' : ''}`}>{status(value)}</span>;
  const detail = (label: string, value: React.ReactNode) => <div className="min-w-0"><dt className="ui-muted text-xs">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{value === null || value === undefined || value === '' ? t('unknown') : value}</dd></div>;
  const receipt = (value?: string) => <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-900">{c('receipt')}</p><p className="mt-2 whitespace-pre-wrap break-all text-sm font-medium">{safeHttps(value) ? <a href={safeHttps(value)!} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{value}</a> : value || c('noReceipt')}</p></div>;
  const rowFeedback = (kind: string,id: string) => <>{rowErrors[`${kind}:${id}`] && <Notice>{rowErrors[`${kind}:${id}`]}</Notice>}{warnings[`${kind}:${id}`] && <Notice>{warnings[`${kind}:${id}`]}</Notice>}</>;
  const button = (kind: 'bookings'|'applications'|'threads',id: string, actionName: string,label:string,secondary = false) => <button type="button" className={secondary ? 'ui-button-secondary':'ui-button'} disabled={!!busyKey || loading || logoutBusy} onClick={() => void action(kind,id,actionName)}>{busyKey === `${kind}:${id}` ? c('saving') : label}</button>;
  const matched = useCallback((row: object) => JSON.stringify(row).toLocaleLowerCase().includes(query.toLocaleLowerCase()),[query]);
  const rows = useMemo(() => ({bookings:data.bookings.filter(matched),applications:data.applications.filter(matched),threads:data.threads.filter(matched),forum:data.forumQuestions.filter(matched),survey:data.surveyResponses.filter(matched),counselors:data.counselors.filter(matched)}),[data,matched]);
  const counts: Record<Tab,number> = {bookings:data.bookings.length,applications:data.applications.length,threads:data.threads.length,forum:data.forumQuestions.length,survey:data.surveyResponses.length,counselors:data.counselors.length};

  if (auth === 'checking') return <SupportShell><Busy label={c('loading')} /></SupportShell>;
  if (auth === 'signedOut') return <SupportShell><section className="ui-panel mx-auto max-w-md p-6 sm:p-9"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-950"><LockKeyhole aria-hidden="true" className="h-6 w-6" /></div><h1 className="font-serif text-3xl font-semibold">{t('loginTitle')}</h1><p className="ui-muted mt-3 text-sm leading-relaxed">{t('loginDescription')}</p><form onSubmit={login} className="mt-7 space-y-5" aria-busy={loginBusy}><Field id="admin-password" label={t('password')}><input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={loginBusy} className="ui-input" /></Field><button type="submit" disabled={loginBusy} className="ui-button w-full">{loginBusy ? t('signingIn') : t('signIn')}</button>{error && <Notice>{error}</Notice>}</form></section></SupportShell>;

  return <SupportShell>
    <div className="flex flex-wrap items-start justify-between gap-5"><SupportHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} /><div className="flex flex-wrap gap-2"><button type="button" className="ui-button-secondary" onClick={() => void loadData()} disabled={loading || !!busyKey || logoutBusy}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin':''}`} aria-hidden="true" />{c('refresh')}</button><button type="button" className="ui-button-secondary" disabled={logoutBusy || !!busyKey} onClick={() => void logout()}><LogOut className="h-4 w-4" aria-hidden="true" />{t('logout')}</button></div></div>
    <div className="mb-7 grid gap-3 sm:grid-cols-3">{[
      [t('pendingPayments'),data.bookings.filter(b => b.payment_status === 'pending').length],
      [t('pendingApplications'),data.applications.filter(a => a.status === 'pending').length],
      [t('activeThreads'),data.threads.filter(th => th.payment_status !== 'closed').length],
    ].map(([label,count]) => <div key={label} className="ui-panel p-5"><p className="ui-muted text-sm">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{count}</p></div>)}</div>
    {data.truncated && <div className="mb-5"><Notice>{t('truncated')}</Notice></div>}{error && <div className="mb-5"><Notice>{error}</Notice></div>}{success && <div className="mb-5"><Notice success>{success}</Notice></div>}
    <nav className="mb-6 flex flex-wrap gap-2" aria-label={t('eyebrow')}>{TABS.map(item => <button type="button" key={item} onClick={() => {setTab(item);setQuery('');setDeleteId(null);}} aria-pressed={tab === item} className={tab === item ? 'ui-button':'ui-button-secondary'}>{t(item)}<span className="ml-1 text-xs opacity-75">{counts[item]}</span></button>)}</nav>
    <div className="mb-6 max-w-xl"><Field id="admin-search" label={c('search')}><div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3 h-5 w-5 text-stone-500" aria-hidden="true" /><input id="admin-search" className="ui-input" style={{paddingLeft:40}} type="search" value={query} onChange={e => setQuery(e.target.value)} /></div></Field></div>
    <section aria-label={t(tab)} aria-busy={loading} className="space-y-5">
      {loading && <Busy label={c('loading')} />}
      {!loading && !error && rows[tab].length === 0 && <div className="ui-panel p-8"><p className="ui-muted">{query ? c('noResults'):t('noData')}</p></div>}
      {tab === 'bookings' && rows.bookings.map(b => <article key={b.id} className="ui-panel space-y-5 p-5 sm:p-7"><header className="flex flex-wrap items-start justify-between gap-3"><div><p className="ui-muted text-xs">{b.id}</p><h2 className="mt-1 font-serif text-2xl font-semibold">{b.student_name}</h2><p className="ui-muted mt-1 text-sm">{b.counselor_name}</p></div><div className="flex flex-wrap gap-4"><div><p className="ui-muted mb-1 text-xs">{t('payment')}</p>{statusBadge(b.payment_status)}</div><div><p className="ui-muted mb-1 text-xs">{c('status')}</p>{statusBadge(b.status)}</div></div></header><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{detail(t('amount'),money(b.price))}{detail(t('slot'),b.slot)}{detail(t('package'),status(b.tier))}{detail(t('payment'),b.payment_method)}{detail(t('contact'),[b.email,b.phone,b.telegram].filter(Boolean).join('\n'))}{detail(c('created'),date(b.created_at))}{detail(t('question'),b.question)}{detail(t('mentor'),safeHttps(b.meet_link) ? <a href={safeHttps(b.meet_link)!} target="_blank" rel="noopener noreferrer" className="break-all text-amber-900 underline">{b.meet_link}</a> : b.counselor_name)}</dl>{receipt(b.payment_receipt)}<div className="space-y-3"><p className="ui-muted text-sm">{t('receiptHint')}</p><div className="flex flex-wrap gap-3">{b.payment_status === 'pending' && b.tier !== 'text_qa' && button('bookings',b.id,'confirm_payment',t('confirmPayment'))}{b.payment_status === 'confirmed' && b.status !== 'completed' && button('bookings',b.id,'complete',t('complete'),true)}</div></div>{rowFeedback('bookings',b.id)}</article>)}
      {tab === 'applications' && rows.applications.map(a => <article key={a.id} className="ui-panel space-y-5 p-5 sm:p-7"><header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl font-semibold">{a.full_name}</h2><p className="ui-muted mt-1">{a.headline}</p></div>{statusBadge(a.status)}</header><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{detail(t('contact'),[a.email,a.phone,a.telegram].filter(Boolean).join('\n'))}{detail(t('mentor'),a.specialties)}{detail(c('created'),date(a.created_at))}{detail(t('standard'),money(a.expected_standard_price))}{detail(t('premium'),money(a.expected_premium_price))}{a.expected_price_per_question ? detail(t('perQuestion'),money(a.expected_price_per_question)) : null}</dl><div><h3 className="ui-label">{t('bio')}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{a.bio}</p></div><p className="ui-muted text-sm">{t('approvalHint')}</p><div className="flex flex-wrap gap-3">{a.status === 'pending' && button('applications',a.id,'approve',t('approve'))}{a.status === 'pending' && button('applications',a.id,'reject',t('reject'),true)}<button type="button" disabled={!!busyKey || loading} onClick={() => setDeleteId(a.id)} className="ui-button-secondary text-red-800">{t('delete')}</button></div>{deleteId === a.id && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="mb-3 text-sm font-medium text-red-900">{t('deleteConfirm')}</p><div className="flex flex-wrap gap-2">{button('applications',a.id,'delete',t('confirmDelete'),true)}<button type="button" className="ui-button-secondary" onClick={() => setDeleteId(null)} disabled={!!busyKey}>{c('cancel')}</button></div></div>}{rowFeedback('applications',a.id)}</article>)}
      {tab === 'threads' && rows.threads.map(th => <article key={th.id} className="ui-panel space-y-5 p-5 sm:p-7"><header className="flex flex-wrap justify-between gap-3"><div><h2 className="font-serif text-2xl font-semibold">{th.booking?.student_name || th.booking_id}</h2><p className="ui-muted mt-1">{th.counselor?.full_name}</p></div>{statusBadge(th.payment_status)}</header><dl className="grid gap-4 sm:grid-cols-3">{detail(t('totalOwed'),money(th.total_owed))}{detail(t('questionsUsed'),th.questions_used)}{detail(t('contact'),[th.booking?.email,th.booking?.telegram].filter(Boolean).join('\n'))}</dl>{receipt(th.payment_receipt)}{th.payment_status !== 'closed' && <><p className="ui-muted text-sm">{t('threadHint')}</p><div className="flex flex-wrap gap-3">{th.payment_status === 'active' && th.questions_used > 0 && button('threads',th.id,'flag',t('flag'),true)}{th.payment_status === 'awaiting_payment' && button('threads',th.id,'confirm_payment',t('closeThread'))}</div></>}{rowFeedback('threads',th.id)}</article>)}
      {tab === 'forum' && rows.forum.map(q => <article key={q.id} className="ui-panel space-y-4 p-5 sm:p-7"><p className="ui-muted text-xs">{t('readOnly')} · {date(q.created_at)}</p><h2 className="font-serif text-2xl font-semibold">{q.title}</h2><p className="ui-muted text-sm">{q.student_name_or_anonymous} · {q.email}</p><p className="whitespace-pre-wrap break-words leading-relaxed">{q.body}</p>{data.forumAnswers.filter(a => a.question_id === q.id).map(a => <div key={a.id} className="rounded-2xl bg-amber-50 p-4"><p className="text-sm font-semibold">{data.counselors.find(m => m.id === a.counselor_id)?.full_name || t('mentor')}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{a.body}</p></div>)}</article>)}
      {tab === 'survey' && rows.survey.map(row => <article key={row.id} className="ui-panel p-5 sm:p-7"><header className="mb-5 flex flex-wrap justify-between gap-3"><h2 className="break-all font-semibold">{row.contact_info}</h2><span className="ui-muted text-sm">{date(row.created_at)}</span></header><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{detail(survey('age'),row.age_range)}{detail(survey('status'),row.status)}{detail(survey('study'),row.field_of_study)}{detail(survey('interest'),row.interest_area)}{detail(survey('challenge'),row.biggest_challenge)}{detail(survey('advice'),row.prior_advice_source)}{detail(survey('interested'),row.interested_in_service)}{detail(survey('price'),row.price_willingness)}{detail(survey('format'),row.preferred_format)}{detail(survey('refer'),row.willing_to_refer ? c('yes'):c('no'))}</dl></article>)}
      {tab === 'counselors' && <div className="grid gap-5 sm:grid-cols-2">{rows.counselors.map(m => <article key={m.id} className="ui-panel space-y-4 p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">{m.full_name}</h2><p className="ui-muted">{m.headline}</p><p className="ui-muted text-sm">{m.specialties?.join(' · ')}</p><dl className="grid gap-4 sm:grid-cols-2">{detail(t('standard'),money(m.standard_price))}{detail(t('premium'),money(m.premium_price))}{m.price_per_question ? detail(t('perQuestion'),money(m.price_per_question)):null}{m.commission_free_until ? detail(t('commissionUntil'),date(m.commission_free_until)):null}</dl><Link href={`/counselors/${encodeURIComponent(m.id)}`} className="ui-button-secondary inline-flex"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{t('viewProfile')}</Link></article>)}</div>}
    </section>
  </SupportShell>;
}
