-- Per-Revision Evaluation System
-- Adds initial_assessment to revision tables and revision_id to evaluation tables

-- ============================================================
-- A. Add initial_assessment columns to revision tables
-- ============================================================

ALTER TABLE call_report_revisions
  ADD COLUMN IF NOT EXISTS initial_assessment INT CHECK (initial_assessment >= 1 AND initial_assessment <= 10),
  ADD COLUMN IF NOT EXISTS assessed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMPTZ;

ALTER TABLE episode_revisions
  ADD COLUMN IF NOT EXISTS initial_assessment INT CHECK (initial_assessment >= 1 AND initial_assessment <= 10),
  ADD COLUMN IF NOT EXISTS assessed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMPTZ;

-- ============================================================
-- B. Add revision_id to evaluation tables
-- ============================================================

ALTER TABLE evaluator_forms
  ADD COLUMN IF NOT EXISTS revision_id UUID REFERENCES call_report_revisions(id) ON DELETE SET NULL;

ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS revision_id UUID REFERENCES episode_revisions(id) ON DELETE SET NULL;

-- Index for fast lookup of evaluations by revision
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_revision_id ON evaluator_forms(revision_id) WHERE revision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_revision_id ON episodic_evaluations(revision_id) WHERE revision_id IS NOT NULL;

-- ============================================================
-- C. Update unique constraint on episodic_evaluations
-- ============================================================

-- Drop old constraint: one eval per evaluator per episode
ALTER TABLE episodic_evaluations DROP CONSTRAINT IF EXISTS unique_evaluator_episode;
-- Also drop the round-based one if it somehow exists
ALTER TABLE episodic_evaluations DROP CONSTRAINT IF EXISTS unique_evaluator_episode_per_round;

-- Partial unique indexes for revision-aware uniqueness:
-- One eval per evaluator per episode when no revision (base evaluation)
CREATE UNIQUE INDEX IF NOT EXISTS idx_episodic_eval_unique_no_rev
  ON episodic_evaluations(episode_id, evaluator_id) WHERE revision_id IS NULL;
-- One eval per evaluator per episode per revision
CREATE UNIQUE INDEX IF NOT EXISTS idx_episodic_eval_unique_with_rev
  ON episodic_evaluations(episode_id, evaluator_id, revision_id) WHERE revision_id IS NOT NULL;

-- ============================================================
-- D. RLS policies for revision assessment updates
-- ============================================================

-- Allow authenticated users with appropriate roles to update revision assessments
CREATE POLICY "revision_assessment_update_cr" ON call_report_revisions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('content_manager', 'content_creator', 'admin', 'management', 'programmer', 'gcm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('content_manager', 'content_creator', 'admin', 'management', 'programmer', 'gcm')
    )
  );

CREATE POLICY "revision_assessment_update_ep" ON episode_revisions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('content_manager', 'content_creator', 'admin', 'management', 'programmer', 'gcm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('content_manager', 'content_creator', 'admin', 'management', 'programmer', 'gcm')
    )
  );

-- ============================================================
-- E. Update process_evaluation_completion() trigger
-- Only count base evaluations (revision_id IS NULL) for call report status
-- ============================================================

CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_total_evaluators INT;
  v_completed_count INT;
  v_avg_score NUMERIC;
BEGIN
  v_call_report_id := NEW.call_report_id;

  -- Skip revision-specific evaluations for status tracking
  IF NEW.revision_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Count total assigned evaluators
  SELECT COUNT(*) INTO v_total_evaluators
  FROM evaluator_assignments
  WHERE call_report_id = v_call_report_id;

  -- Count completed evaluations (base only, no revision)
  SELECT COUNT(*) INTO v_completed_count
  FROM evaluator_forms
  WHERE call_report_id = v_call_report_id
    AND submitted_at IS NOT NULL
    AND revision_id IS NULL;

  -- Calculate average score (base evaluations only)
  SELECT AVG(average_score) INTO v_avg_score
  FROM evaluator_forms
  WHERE call_report_id = v_call_report_id
    AND submitted_at IS NOT NULL
    AND average_score IS NOT NULL
    AND revision_id IS NULL;

  -- Update call report with evaluation progress
  UPDATE call_reports
  SET
    completed_evaluations = v_completed_count,
    current_average_score = ROUND(v_avg_score, 2),
    evaluation_status = CASE
      WHEN v_total_evaluators = 0 THEN 'pending'
      WHEN v_completed_count >= v_total_evaluators THEN 'completed'
      ELSE 'in_progress'
    END,
    updated_at = now()
  WHERE id = v_call_report_id;

  -- Mark evaluator assignment as completed
  UPDATE evaluator_assignments
  SET
    status = 'completed',
    completed_at = now()
  WHERE call_report_id = v_call_report_id
    AND evaluator_id = NEW.evaluator_id
    AND status != 'completed';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
