-- Add updated_by columns to tables with mutation endpoints
-- Tracks who last modified each record for accountability

ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE negotiations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE evaluator_forms ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE episodic_evaluations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE detailed_one_liners ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE cross_team_shares ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE writer_engagements ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Change audit_logs.entity_id from UUID to TEXT
-- Some entities use non-UUID IDs (e.g., NEG-2025-0001, setting keys)
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;
