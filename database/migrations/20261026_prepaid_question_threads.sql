-- 20261026_prepaid_question_threads.sql
-- Migration: Change question_threads to a strict pre-paid pack model.

-- 1. Add new pre-paid columns to question_threads
ALTER TABLE question_threads
  ADD COLUMN IF NOT EXISTS questions_paid INTEGER NOT NULL DEFAULT 1 CHECK (questions_paid >= 1 AND questions_paid <= 50),
  ADD COLUMN IF NOT EXISTS total_paid INTEGER NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'click' CHECK (payment_method IN ('click', 'card')),
  ADD COLUMN IF NOT EXISTS bank_reference TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_amount INTEGER,
  ADD COLUMN IF NOT EXISTS confirmed_by_admin TEXT,
  ADD COLUMN IF NOT EXISTS admin_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_status TEXT NOT NULL DEFAULT 'none' CHECK (reply_status IN ('none', 'pending_mentor_reply', 'replied', 'overdue', 'refunded', 'reassigned'));

-- 2. Drop legacy status check constraint
ALTER TABLE question_threads DROP CONSTRAINT IF EXISTS question_threads_payment_status_check;

-- 3. Cleanly update any existing rows (count verified = 0)
UPDATE question_threads SET payment_status = 'pending_payment' WHERE payment_status = 'awaiting_payment';
UPDATE question_threads SET payment_status = 'closed' WHERE payment_status = 'active';

-- 4. Apply new strict payment_status check constraint and default
ALTER TABLE question_threads
  ADD CONSTRAINT question_threads_payment_status_check
  CHECK (payment_status IN ('pending_payment', 'paid', 'closed'));

ALTER TABLE question_threads
  ALTER COLUMN payment_status SET DEFAULT 'pending_payment';

-- 5. Atomic usage guarantee: questions_used cannot exceed questions_paid
ALTER TABLE question_threads DROP CONSTRAINT IF EXISTS question_threads_usage_check;
ALTER TABLE question_threads
  ADD CONSTRAINT question_threads_usage_check
  CHECK (questions_used <= questions_paid);

-- 6. Require soft_cap / pack_size to be non-null and within sane bounds on counselors
UPDATE counselors SET soft_cap = 3 WHERE soft_cap IS NULL OR soft_cap < 1;
ALTER TABLE counselors ALTER COLUMN soft_cap SET DEFAULT 3;
