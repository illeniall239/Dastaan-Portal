-- Add active_minutes to user_sessions to track actual foreground tab time
-- This replaces the inflated last_seen_at - login_at calculation

ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS active_minutes INT NOT NULL DEFAULT 0;
