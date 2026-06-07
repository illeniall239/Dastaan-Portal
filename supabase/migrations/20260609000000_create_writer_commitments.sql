-- Create writer_commitments table for tracking per-project writer delivery commitments
CREATE TABLE IF NOT EXISTS writer_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id UUID NOT NULL REFERENCES writers(id) ON DELETE RESTRICT,
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  commitment_type TEXT NOT NULL CHECK (commitment_type IN ('verbal', 'contractual')),
  commitment_schedule TEXT NOT NULL,
  -- e.g. '1_per_week', '2_per_week', '3_per_week', '4_per_week', '1_per_month', '2_per_month', '3_per_month', 'custom'
  commitment_schedule_custom TEXT,          -- free text, only used when commitment_schedule = 'custom'
  project_initiation_date DATE NOT NULL,
  commitment_date DATE NOT NULL,            -- agreed delivery deadline / start date
  revised_commitment_date DATE,             -- set if writer renegotiates
  revision_reason TEXT,                     -- explanation for the revision
  is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at DATE,
  delay_notes TEXT,                         -- free-text notes about delays
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(writer_id, call_report_id)         -- one commitment record per writer per project
);

CREATE INDEX IF NOT EXISTS idx_writer_commitments_writer ON writer_commitments(writer_id);
CREATE INDEX IF NOT EXISTS idx_writer_commitments_call_report ON writer_commitments(call_report_id);
CREATE INDEX IF NOT EXISTS idx_writer_commitments_created_by ON writer_commitments(created_by);

ALTER TABLE writer_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users" ON writer_commitments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON writer_commitments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON writer_commitments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON writer_commitments
  FOR DELETE TO authenticated USING (true);
