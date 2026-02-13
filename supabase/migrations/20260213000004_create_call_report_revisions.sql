-- Create call_report_revisions table (same pattern as episode_revisions / one_liner_revisions)
CREATE TABLE call_report_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  revision_number INT NOT NULL CHECK (revision_number > 0),
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  comment TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(call_report_id, revision_number)
);

-- Index for fast lookups
CREATE INDEX idx_call_report_revisions_call_report_id ON call_report_revisions(call_report_id);

-- Enable RLS
ALTER TABLE call_report_revisions ENABLE ROW LEVEL SECURITY;

-- Select: authenticated users can view
CREATE POLICY "call_report_revisions_select"
  ON call_report_revisions FOR SELECT
  TO authenticated
  USING (true);

-- Insert: authenticated users can add revisions
CREATE POLICY "call_report_revisions_insert"
  ON call_report_revisions FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Delete: uploader or elevated roles
CREATE POLICY "call_report_revisions_delete"
  ON call_report_revisions FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('content_manager', 'admin', 'management', 'programmer', 'gcm')
    )
  );
