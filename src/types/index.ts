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

export interface BookingTicketData {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorHeadline: string;
  counselorAvatar: string;
  tier: Tier;
  price: number;
  paymentMethod: string;
  slot: string;
  studentName: string;
  email: string;
  phone: string;
  telegram: string;
  education: string;
  question: string;
  meetLink?: string;
  createdAt?: string;
}
