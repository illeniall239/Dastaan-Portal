-- Error Logs Table
-- Stores all API errors with full context: route, method, user, IP, timestamp
-- Written via admin client (service role), read by admins only via RLS

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  route TEXT,
  method TEXT,
  status_code INTEGER NOT NULL DEFAULT 500,
  error_message TEXT NOT NULL,
  error_type TEXT,         -- VALIDATION_ERROR | AUTH_ERROR | DB_ERROR | INTERNAL_ERROR
  error_stack TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  context JSONB
);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_route ON error_logs(route);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_status_code ON error_logs(status_code);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read; all writes go through service role (admin client) which bypasses RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'error_logs' AND policyname = 'Admins can view error logs'
  ) THEN
    CREATE POLICY "Admins can view error logs"
      ON error_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
