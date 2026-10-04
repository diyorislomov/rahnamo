'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, Plus, Power, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CounselorService } from '@/types';

const SERVICE_TYPES: CounselorService['serviceType'][] = [
  'quick_call',
  'career_session',
  'cv_review',
  'mock_interview',
  'grant_guidance',
  'monthly_mentorship',
  'custom',
];

export default function MentorServicesEditor() {
  const t = useTranslations('mentorServices');
  const [services, setServices] = useState<CounselorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState<CounselorService['serviceType']>('career_session');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [price, setPrice] = useState('');

  const authHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) throw new Error('unauthorized');
        return fetch('/api/mentor/services', { headers: { Authorization: `Bearer ${token}` } });
      })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!active) return;
        if (response.ok && result.success) setServices(result.services || []);
        else setError(t('loadFailed'));
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError(t('loadFailed'));
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [t]);

  const createService = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    const auth = await authHeaders();
    if (!auth) { setSaving(false); setError(t('saveFailed')); return; }
    const response = await fetch('/api/mentor/services', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, serviceType, durationMinutes: Number(durationMinutes), price: Number(price) }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok || !result.service) { setError(t('invalidService')); return; }
    setServices((current) => [...current, result.service]);
    setTitle(''); setDescription(''); setDurationMinutes('30'); setPrice('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateService = async (service: CounselorService, active: boolean) => {
    const auth = await authHeaders();
    if (!auth) return;
    const response = await fetch('/api/mentor/services', {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...service, active }),
    });
    const result = await response.json();
    if (response.ok && result.service) {
      setServices((current) => current.map((item) => item.id === service.id ? result.service : item));
    } else setError(t('saveFailed'));
  };

  const deleteService = async (service: CounselorService) => {
    if (!window.confirm(t('deleteConfirm', { title: service.title }))) return;
    const auth = await authHeaders();
    if (!auth) return;
    const response = await fetch('/api/mentor/services', {
      method: 'DELETE',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: service.id }),
    });
    if (response.ok) setServices((current) => current.filter((item) => item.id !== service.id));
    else setError(t('saveFailed'));
  };

  return (
    <section className="bg-white/95 p-6 md:p-8 rounded-3xl border border-amber-900/10 shadow-sm space-y-5 mt-6">
      <div>
        <h2 className="font-serif font-extrabold text-xl text-amber-950">{t('title')}</h2>
        <p className="text-xs text-stone-500 mt-1">{t('subtitle')}</p>
      </div>

      {loading ? <p className="text-xs text-stone-500">{t('loading')}</p> : (
        <div className="space-y-2">
          {services.length === 0 && <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-3">{t('empty')}</p>}
          {services.map((service) => (
            <div key={service.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 border border-amber-900/10 rounded-2xl p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">{service.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${service.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                    {service.active ? t('active') : t('hidden')}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">{t(`types.${service.serviceType}`)} · {service.durationMinutes} {t('minutes')} · {service.price.toLocaleString()} UZS</p>
                {service.description && <p className="text-xs text-stone-600 mt-1">{service.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" onClick={() => updateService(service, !service.active)} className="p-2 rounded-xl bg-white border border-amber-900/15 text-amber-900 cursor-pointer" title={service.active ? t('hide') : t('show')}>
                  <Power className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => deleteService(service)} className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 cursor-pointer" title={t('delete')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={createService} className="pt-5 border-t border-amber-900/10 space-y-3">
        <h3 className="text-sm font-bold text-amber-950">{t('newService')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">{t('typeLabel')}</label>
            <select value={serviceType} onChange={(event) => setServiceType(event.target.value as CounselorService['serviceType'])} className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl">
              {SERVICE_TYPES.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">{t('titleLabel')}</label>
            <input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-700 block mb-1">{t('descriptionLabel')}</label>
          <textarea rows={2} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">{t('durationLabel')}</label>
            <input type="number" min={15} max={180} step={5} required value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">{t('priceLabel')}</label>
            <input type="number" min={1} required value={price} onChange={(event) => setPrice(event.target.value)} className="w-full p-3 text-xs bg-amber-50/40 border border-amber-900/15 rounded-xl" />
          </div>
        </div>
        {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-900 text-amber-50 text-xs font-bold cursor-pointer disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Plus className="w-4 h-4" />}
          {saved ? t('saved') : t('add')}
        </button>
      </form>
    </section>
  );
}
