import type { CounselorService } from '@/types';

export const SERVICE_TYPES = new Set([
  'quick_call',
  'career_session',
  'cv_review',
  'mock_interview',
  'grant_guidance',
  'monthly_mentorship',
  'custom',
]);

export interface CounselorServiceRow {
  id: string;
  counselor_id: string;
  title: string;
  description: string;
  service_type: CounselorService['serviceType'];
  duration_minutes: number;
  price: number;
  active: boolean;
}

export function mapService(row: CounselorServiceRow): CounselorService {
  return {
    id: row.id,
    counselorId: row.counselor_id,
    title: row.title,
    description: row.description,
    serviceType: row.service_type,
    durationMinutes: row.duration_minutes,
    price: row.price,
    active: row.active,
  };
}

export function serviceInput(input: Record<string, unknown>) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const serviceType = typeof input.serviceType === 'string' && SERVICE_TYPES.has(input.serviceType)
    ? input.serviceType as CounselorService['serviceType']
    : null;
  const durationMinutes = Number(input.durationMinutes);
  const price = Number(input.price);
  if (
    title.length < 3 || title.length > 120 ||
    description.length > 1000 ||
    !serviceType ||
    !Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 180 ||
    !Number.isInteger(price) || price <= 0 || price > 100_000_000
  ) return null;
  return { title, description, serviceType, durationMinutes, price };
}
