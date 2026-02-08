-- Create error_logs table for production error tracking
-- This table stores all application errors with context for debugging and monitoring

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp 
  ON error_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity 
  ON error_logs(severity) 
  WHERE severity IN ('error', 'critical');

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
  ON error_logs(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type 
  ON error_logs(error_type);

CREATE INDEX IF NOT EXISTS idx_error_logs_resolved 
  ON error_logs(resolved) 
  WHERE resolved = FALSE;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_timestamp 
  ON error_logs(severity, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Management and admins can view all error logs
DROP POLICY IF EXISTS "error_logs_select_policy" ON error_logs;
CREATE POLICY "error_logs_select_policy" 
  ON error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'programmer')
    )
  );

-- System can insert error logs (using service role)
DROP POLICY IF EXISTS "error_logs_insert_policy" ON error_logs;
CREATE POLICY "error_logs_insert_policy" 
  ON error_logs FOR INSERT
  WITH CHECK (true); -- Service role will handle this

-- Only admins can update error logs (mark as resolved)
DROP POLICY IF EXISTS "error_logs_update_policy" ON error_logs;
CREATE POLICY "error_logs_update_policy" 
  ON error_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'programmer')
    )
  );

-- Comments for documentation
COMMENT ON TABLE error_logs IS 'Application error logs for monitoring and debugging';
COMMENT ON COLUMN error_logs.severity IS 'Error severity: debug, info, warning, error, critical';
COMMENT ON COLUMN error_logs.error_type IS 'Error category/type for classification';
COMMENT ON COLUMN error_logs.context IS 'JSON context including function name, metadata, etc.';
COMMENT ON COLUMN error_logs.resolved IS 'Whether the error has been acknowledged/fixed';
COMMENT ON INDEX idx_error_logs_timestamp IS 'Fast time-based queries for recent errors';
COMMENT ON INDEX idx_error_logs_severity IS 'Quick filtering of critical errors';
