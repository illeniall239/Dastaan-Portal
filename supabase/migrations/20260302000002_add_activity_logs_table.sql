-- Activity Logs Table
-- Tracks client-side events: page views, clicks, and client-side JS errors
-- Written via the track API (authenticated session), read by admins only via RLS

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('page_view', 'click', 'client_error')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,             -- random ID from sessionStorage, groups a browser session
  route TEXT,                  -- current page path when event occurred

  -- Click-specific
  element_tag TEXT,            -- 'button' | 'a' | 'select' etc.
  element_text TEXT,           -- visible text of element (truncated to 100 chars)
  element_id TEXT,             -- HTML id attribute if present

  -- Error-specific
  error_message TEXT,
  error_stack TEXT,

  -- Common
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_route ON activity_logs(route);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Admins can view activity logs'
  ) THEN
    CREATE POLICY "Admins can view activity logs"
      ON activity_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Authenticated users can insert activity logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert activity logs"
      ON activity_logs FOR INSERT
      WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;
