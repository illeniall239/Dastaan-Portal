-- Add decision and decision_notes columns to episodic_evaluations
-- Nullable to preserve existing rows; form requires it for new submissions

ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IN ('approve', 'reject', 'needs_revision')),
  ADD COLUMN IF NOT EXISTS decision_notes TEXT;
