-- Migration: User Sessions Tracking
-- Tracks login events and session duration per user
-- Date: 2026-02-21

CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id  ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON user_sessions(login_at DESC);

-- RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can read all sessions
CREATE POLICY "admins_select" ON user_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role handles inserts and updates (server-side only via admin client)
CREATE POLICY "service_insert" ON user_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_update" ON user_sessions
  FOR UPDATE USING (true);
