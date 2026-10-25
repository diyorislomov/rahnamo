import 'server-only';

import { getServiceRoleClient } from './supabaseServiceRole';

export const DEFAULT_GLOBAL_LAUNCH_DATE = '2026-11-01T00:00:00.000Z';

export interface PlatformSettings {
  global_launch_date: string; // ISO string
}

export async function getGlobalLaunchDate(): Promise<Date> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'global_launch_date')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = new Date(data.value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[PLATFORM_SETTINGS_READ_FALLBACK]', err);
  }
  return new Date(DEFAULT_GLOBAL_LAUNCH_DATE);
}

export async function setGlobalLaunchDate(dateIso: string): Promise<boolean> {
  const parsed = new Date(dateIso);
  if (isNaN(parsed.getTime())) {
    throw new Error('invalid_date');
  }

  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.from('platform_settings').upsert({
      key: 'global_launch_date',
      value: parsed.toISOString(),
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch (err) {
    console.error('[PLATFORM_SETTINGS_UPDATE_FAILED]', err);
    return false;
  }
}

/**
 * Phase 6: commission_free_until = (the later of approval date and global launch date) + 3 months
 */
export function calculateCommissionFreeUntil(approvalDate: Date | string, launchDate: Date | string): Date {
  const app = approvalDate instanceof Date ? approvalDate : new Date(approvalDate);
  const lch = launchDate instanceof Date ? launchDate : new Date(launchDate);
  const base = app.getTime() > lch.getTime() ? app : lch;
  const result = new Date(base);
  result.setMonth(result.getMonth() + 3);
  return result;
}
