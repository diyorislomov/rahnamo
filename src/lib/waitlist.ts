export const CAREER_GOALS = ['job', 'internship', 'study_abroad', 'startup', 'switch_career'] as const;
export const EXPERIENCE_LEVELS = ['student', 'entry', 'mid', 'senior', 'founder'] as const;

export type CareerGoal = (typeof CAREER_GOALS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export interface WaitlistInput {
  fullName: string;
  contact: string;
  goal: CareerGoal;
  field: string;
  experienceLevel: ExperienceLevel;
  locale: 'uz' | 'ru' | 'en';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM = /^@?[A-Za-z0-9_]{5,32}$/;

export function parseWaitlistInput(value: unknown): WaitlistInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const rawContact = typeof input.contact === 'string' ? input.contact.trim() : '';
  const goal = typeof input.goal === 'string' ? input.goal : '';
  const field = typeof input.field === 'string' ? input.field.trim() : '';
  const experienceLevel = typeof input.experienceLevel === 'string' ? input.experienceLevel : '';
  const locale = input.locale === 'ru' || input.locale === 'en' ? input.locale : 'uz';

  if (fullName.length < 2 || fullName.length > 120) return null;
  if (field.length < 2 || field.length > 120) return null;
  if (!CAREER_GOALS.includes(goal as CareerGoal)) return null;
  if (!EXPERIENCE_LEVELS.includes(experienceLevel as ExperienceLevel)) return null;

  const contact = EMAIL.test(rawContact)
    ? rawContact.toLowerCase()
    : TELEGRAM.test(rawContact)
      ? `@${rawContact.replace(/^@/, '').toLowerCase()}`
      : '';
  if (!contact || contact.length > 254) return null;

  return {
    fullName,
    contact,
    goal: goal as CareerGoal,
    field,
    experienceLevel: experienceLevel as ExperienceLevel,
    locale,
  };
}
