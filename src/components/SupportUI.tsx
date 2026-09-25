'use client';

import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export function SupportShell({ children }: { children: ReactNode }) {
  return <div className="ui-page flex min-h-screen flex-col"><Navbar /><main className="ui-container flex-1 py-10 sm:py-16">{children}</main><Footer /></div>;
}

export function SupportHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="mb-8 max-w-3xl"><p className="ui-eyebrow mb-3">{eyebrow}</p><h1 className="font-serif text-3xl font-semibold leading-tight text-amber-950 sm:text-5xl">{title}</h1><p className="ui-muted mt-4 text-base leading-relaxed sm:text-lg">{description}</p></header>;
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><label htmlFor={id} className="ui-label">{label}</label>{children}{hint && <p id={`${id}-hint`} className="ui-muted text-sm leading-relaxed">{hint}</p>}{error && <p id={`${id}-error`} className="text-sm font-medium text-red-800" role="alert">{error}</p>}</div>;
}

export function Notice({ children, success = false }: { children: ReactNode; success?: boolean }) {
  const Icon = success ? CheckCircle2 : AlertCircle;
  return <div role={success ? 'status' : 'alert'} style={success ? {borderColor:'#a7d9bc', backgroundColor:'#f0faf4', color:'#14532d'} : undefined} className={`ui-alert flex items-start gap-3 ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : ''}`}><Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0 text-sm leading-relaxed">{children}</div></div>;
}

export function Busy({ label }: { label: string }) {
  return <div role="status" className="ui-muted flex items-center gap-3 py-6"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{label}</div>;
}

export class SupportApiError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

export async function supportRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({ success: false, error: 'invalid_response' }));
  if (!response.ok || result.success === false) throw new SupportApiError(result.error || 'request_failed', response.status);
  return result as T;
}
