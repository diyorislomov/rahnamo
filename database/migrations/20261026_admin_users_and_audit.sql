-- 20261026_admin_users_and_audit.sql
-- Migration: Add user blocking/deletion flags and admin audit log with RLS

-- 1. Add admin columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_is_blocked_idx ON public.users(is_blocked);
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON public.users(deleted_at);

-- 2. Create admin_audit_log table (no personal data stored beyond target user id and IP hash)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_identifier TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('block_user', 'unblock_user', 'delete_user')),
  target_user_id UUID NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);

-- 3. Enable RLS on admin_audit_log with NO policies for anon or authenticated roles
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- No permissive policy created: only service role / direct db connections can query this table.
