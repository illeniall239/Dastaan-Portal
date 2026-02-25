-- Create call_report_discussions table
-- Flat discussion thread on each call report for cross-team communication
CREATE TABLE call_report_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 2000),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups ordered by time
CREATE INDEX idx_call_report_discussions_call_report_id
  ON call_report_discussions(call_report_id, created_at ASC);

-- Enable RLS
ALTER TABLE call_report_discussions ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can view discussions
CREATE POLICY "call_report_discussions_select"
  ON call_report_discussions FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: authenticated users can post (user_id must match caller)
CREATE POLICY "call_report_discussions_insert"
  ON call_report_discussions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: only the message author can edit their own messages
CREATE POLICY "call_report_discussions_update"
  ON call_report_discussions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: own messages OR admin/management can delete any
CREATE POLICY "call_report_discussions_delete"
  ON call_report_discussions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management')
    )
  );
