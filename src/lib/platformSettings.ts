import 'server-only';

import { one } from './database';

export const DEFAULT_GLOBAL_LAUNCH_DATE = '2026-11-01T00:00:00.000Z';

export interface PlatformSettings {
  global_launch_date: string; // ISO string
}

export async function getGlobalLaunchDate(): Promise<Date> {
  try {
    const { data, error } = await one("SELECT value FROM platform_settings WHERE key='global_launch_date'");

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
    const { error } = await one("INSERT INTO platform_settings(key,value) VALUES('global_launch_date',$1::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now() RETURNING key", [JSON.stringify(parsed.toISOString())]);

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
