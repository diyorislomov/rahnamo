'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, Plus, Power, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    let active = true;
    fetch('/api/mentor/services')
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
    const response = await fetch('/api/mentor/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch('/api/mentor/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...service, active }),
    });
    const result = await response.json();
    if (response.ok && result.service) {
      setServices((current) => current.map((item) => item.id === service.id ? result.service : item));
    } else setError(t('saveFailed'));
  };

  const deleteService = async (service: CounselorService) => {
    if (!window.confirm(t('deleteConfirm', { title: service.title }))) return;
    const response = await fetch('/api/mentor/services', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: service.id }),
    });
    if (response.ok) setServices((current) => current.filter((item) => item.id !== service.id));
    else setError(t('saveFailed'));
  };

  return (
    <section className="surface-card p-6 md:p-8 rounded-2xl space-y-5 mt-6">
      <div>
        <h2 className="font-serif font-bold text-lg text-[#18181B]">{t('title')}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{t('subtitle')}</p>
      </div>

      {loading ? <p className="text-xs text-zinc-500">{t('loading')}</p> : (
        <div className="space-y-2.5">
          {services.length === 0 && (
            <p className="text-xs text-zinc-500 bg-[#FFF8E7] border border-zinc-900/10 rounded-xl p-3.5">
              {t('empty')}
            </p>
          )}
          {services.map((service) => (
            <div key={service.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF8E7]/60 border border-zinc-900/10 rounded-xl p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#18181B]">{service.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    service.active
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}>
                    {service.active ? t('active') : t('hidden')}
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  {t(`types.${service.serviceType}`)} · {service.durationMinutes} {t('minutes')} · {service.price.toLocaleString()} UZS
                </p>
                {service.description && <p className="text-xs text-zinc-600 mt-1">{service.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => updateService(service, !service.active)}
                  className="p-2 rounded-lg bg-white border border-zinc-900/10 text-zinc-700 hover:border-[#0F4C5C]/40 hover:text-[#0F4C5C] cursor-pointer transition-colors"
                  title={service.active ? t('hide') : t('show')}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteService(service)}
                  className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 cursor-pointer transition-colors"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={createService} className="pt-5 border-t border-zinc-900/8 space-y-3.5">
        <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-[#0F4C5C] font-semibold">{t('newService')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('typeLabel')}</label>
            <select
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value as CounselorService['serviceType'])}
              className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl text-[#18181B] focus:bg-white focus:border-[#0F4C5C] outline-none"
            >
              {SERVICE_TYPES.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('titleLabel')}</label>
            <input
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl text-[#18181B] focus:bg-white focus:border-[#0F4C5C] outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('descriptionLabel')}</label>
          <textarea
            rows={2}
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl text-[#18181B] focus:bg-white focus:border-[#0F4C5C] outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('durationLabel')}</label>
            <input
              type="number"
              min={15}
              max={180}
              step={5}
              required
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl text-[#18181B] focus:bg-white focus:border-[#0F4C5C] outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 block mb-1.5">{t('priceLabel')}</label>
            <input
              type="number"
              min={1}
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#FFF8E7]/60 border border-zinc-900/12 rounded-xl text-[#18181B] focus:bg-white focus:border-[#0F4C5C] outline-none"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C5C] hover:bg-[#09323D] text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-[#D4A84B]" /> : <Plus className="w-4 h-4" />}
          {saved ? t('saved') : t('add')}
        </button>
      </form>
    </section>
  );
}
