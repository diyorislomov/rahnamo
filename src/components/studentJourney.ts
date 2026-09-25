import { supabase } from '@/lib/supabase';
import { ensureStudentAuth } from '@/lib/threadAuth';

export interface StudentBooking {
  id: string;
  counselor_id: string;
  counselor_name: string;
  counselor_headline?: string;
  counselor_avatar?: string;
  tier: 'standard' | 'premium' | 'text_qa';
  price: number;
  slot: string;
  student_name: string;
  email: string;
  payment_method: string;
  payment_receipt?: string | null;
  payment_status: string;
  status: string;
  meet_link?: string | null;
  created_at: string;
  demo?: boolean;
}

export async function studentAccessToken() {
  await ensureStudentAuth();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('authentication_failed');
  return data.session.access_token;
}

const DEMO_KEY = 'rahnamo_demo_bookings_v1';
export function readDemoBookings(): StudentBooking[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
    return Array.isArray(value) ? value.filter((b): b is StudentBooking => b?.demo === true && typeof b.id === 'string') : [];
  } catch { return []; }
}
export function saveDemoBooking(booking: StudentBooking) {
  localStorage.setItem(DEMO_KEY, JSON.stringify([booking, ...readDemoBookings().filter((b) => b.id !== booking.id)]));
}
