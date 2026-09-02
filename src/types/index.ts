export type Tier = 'standard' | 'premium';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

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
  company?: string;
  outcomes?: string[];
  whyWorkWithMe?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  counselorId: string;
  studentFirstName: string;
  rating: number;
  reviewText: string;
  createdAt: string;
}

export interface ForumQuestion {
  id: string;
  studentNameOrAnonymous: string;
  email: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface ForumAnswer {
  id: string;
  questionId: string;
  counselorId: string;
  body: string;
  createdAt: string;
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
  paymentStatus?: PaymentStatus;
  paymentReceipt?: string;
  createdAt?: string;
}
