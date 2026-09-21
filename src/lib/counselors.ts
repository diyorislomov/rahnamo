import { Counselor } from '@/types';

export { isSupabaseConfigured } from './supabase';

interface CounselorRow {
  id: string;
  full_name: string;
  headline: string;
  avatar_url: string;
  specialties: string[];
  bio: string;
  standard_price: number;
  premium_price: number;
  rating: number;
  reviews_count: number;
  available_slots: string[];
  company: string | null;
  why_work_with_me: string | null;
  joined_at: string | null;
  commission_free_until: string | null;
}

// Live Supabase rows never carry responseTime/totalSessions/outcomes -- those
// are decorative fields only the seeded mock counselors have. All three are
// optional on the Counselor type and already rendered conditionally.
export function mapCounselorRow(r: CounselorRow): Counselor {
  return {
    id: r.id,
    fullName: r.full_name,
    headline: r.headline,
    avatarUrl: r.avatar_url,
    specialties: r.specialties || [],
    bio: r.bio,
    standardPrice: r.standard_price,
    premiumPrice: r.premium_price,
    rating: r.rating,
    reviewsCount: r.reviews_count,
    availableSlots: r.available_slots || [],
    company: r.company || undefined,
    whyWorkWithMe: r.why_work_with_me || undefined,
    joinedAt: r.joined_at || undefined,
    commissionFreeUntil: r.commission_free_until || undefined,
  };
}
