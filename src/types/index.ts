export type Tier = 'standard' | 'premium';

export interface Counselor {
  id: string;
  fullName: string;
  headline: string;
  avatarUrl: string;
  specialties: string[];
  bio: string;
  standardPrice: number;
  premiumPrice: number;
  rating: number;
  reviewsCount: number;
  availableSlots: string[];
  responseTime?: string;
  totalSessions?: number;
  companyBadge?: string;
  outcomes?: string[];
}
