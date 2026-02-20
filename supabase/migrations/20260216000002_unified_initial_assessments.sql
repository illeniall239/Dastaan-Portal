-- ============================================================================
-- UNIFIED PER-USER INITIAL ASSESSMENT SYSTEM
-- ============================================================================
-- Replaces single-value episodes.initial_assessment & call_reports.overall_rating
-- with a per-user scoring table so multiple team members can each score an entity.
-- ============================================================================

-- 1. Create the initial_assessments table
CREATE TABLE IF NOT EXISTS initial_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('call_report', 'episode')),
  entity_id UUID NOT NULL,
  assessor_id UUID NOT NULL REFERENCES users(id),
  score INT NOT NULL CHECK (score >= 1 AND score <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, assessor_id)
);

CREATE INDEX IF NOT EXISTS idx_initial_assessments_entity
  ON initial_assessments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_initial_assessments_assessor
  ON initial_assessments(assessor_id);

-- 2. Add denormalized columns to call_reports
ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS average_initial_assessment DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS assessment_count INT DEFAULT 0;

-- 3. Add denormalized columns to episodes
ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS average_initial_assessment DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS assessment_count INT DEFAULT 0;

-- 4. Trigger function to keep denormalized columns in sync
CREATE OR REPLACE FUNCTION update_entity_assessment_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_avg DECIMAL(4,2);
  v_count INT;
BEGIN
  -- Determine which entity to update based on NEW or OLD
  IF TG_OP = 'DELETE' THEN
    SELECT ROUND(AVG(score)::NUMERIC, 2), COUNT(*)
    INTO v_avg, v_count
    FROM initial_assessments
    WHERE entity_type = OLD.entity_type AND entity_id = OLD.entity_id;

    IF OLD.entity_type = 'call_report' THEN
      UPDATE call_reports SET
        average_initial_assessment = v_avg,
        assessment_count = v_count
      WHERE id = OLD.entity_id;
    ELSIF OLD.entity_type = 'episode' THEN
      UPDATE episodes SET
        average_initial_assessment = v_avg,
        assessment_count = v_count
      WHERE id = OLD.entity_id;
    END IF;
  ELSE
    SELECT ROUND(AVG(score)::NUMERIC, 2), COUNT(*)
    INTO v_avg, v_count
    FROM initial_assessments
    WHERE entity_type = NEW.entity_type AND entity_id = NEW.entity_id;

    IF NEW.entity_type = 'call_report' THEN
      UPDATE call_reports SET
        average_initial_assessment = v_avg,
        assessment_count = v_count
      WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'episode' THEN
      UPDATE episodes SET
        average_initial_assessment = v_avg,
        assessment_count = v_count
      WHERE id = NEW.entity_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_assessment_stats ON initial_assessments;
CREATE TRIGGER trg_update_assessment_stats
  AFTER INSERT OR UPDATE OR DELETE ON initial_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_assessment_stats();

-- 5. Enable RLS
ALTER TABLE initial_assessments ENABLE ROW LEVEL SECURITY;

-- Select: authenticated users can see assessments for entities they can access
CREATE POLICY "initial_assessments_select" ON initial_assessments
  FOR SELECT TO authenticated
  USING (true);  -- Visibility controlled at API layer (team isolation)

-- Insert: authenticated users with allowed roles
CREATE POLICY "initial_assessments_insert" ON initial_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    assessor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('content_manager', 'content_creator', 'admin',
                   'management', 'programmer', 'gcm', 'evaluator')
    )
  );

-- Update: only the assessor can update their own assessment
CREATE POLICY "initial_assessments_update" ON initial_assessments
  FOR UPDATE TO authenticated
  USING (assessor_id = auth.uid())
  WITH CHECK (assessor_id = auth.uid());

-- Delete: only the assessor or admin/management
CREATE POLICY "initial_assessments_delete" ON initial_assessments
  FOR DELETE TO authenticated
  USING (
    assessor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('admin', 'management')
    )
  );

-- 6. Backfill from existing call_reports.overall_rating
INSERT INTO initial_assessments (entity_type, entity_id, assessor_id, score, created_at, updated_at)
SELECT
  'call_report',
  cr.id,
  cr.created_by,
  cr.overall_rating,
  cr.created_at,
  COALESCE(cr.updated_at, cr.created_at)
FROM call_reports cr
WHERE cr.overall_rating IS NOT NULL
  AND cr.created_by IS NOT NULL
ON CONFLICT (entity_type, entity_id, assessor_id) DO NOTHING;

-- 7. Backfill from existing episodes.initial_assessment
INSERT INTO initial_assessments (entity_type, entity_id, assessor_id, score, created_at, updated_at)
SELECT
  'episode',
  e.id,
  e.logged_by,
  e.initial_assessment,
  e.created_at,
  COALESCE(e.updated_at, e.created_at)
FROM episodes e
WHERE e.initial_assessment IS NOT NULL
  AND e.logged_by IS NOT NULL
ON CONFLICT (entity_type, entity_id, assessor_id) DO NOTHING;

-- 8. Compute initial denormalized values for call_reports
UPDATE call_reports cr SET
  average_initial_assessment = sub.avg_score,
  assessment_count = sub.cnt
FROM (
  SELECT entity_id, ROUND(AVG(score)::NUMERIC, 2) AS avg_score, COUNT(*) AS cnt
  FROM initial_assessments
  WHERE entity_type = 'call_report'
  GROUP BY entity_id
) sub
WHERE cr.id = sub.entity_id;

-- 9. Compute initial denormalized values for episodes
UPDATE episodes e SET
  average_initial_assessment = sub.avg_score,
  assessment_count = sub.cnt
FROM (
  SELECT entity_id, ROUND(AVG(score)::NUMERIC, 2) AS avg_score, COUNT(*) AS cnt
  FROM initial_assessments
  WHERE entity_type = 'episode'
  GROUP BY entity_id
) sub
WHERE e.id = sub.entity_id;

-- 10. Add comments
COMMENT ON TABLE initial_assessments IS
  'Per-user initial assessment scores for call reports and episodes';
COMMENT ON COLUMN initial_assessments.entity_type IS
  'Type of entity being assessed: call_report or episode';
COMMENT ON COLUMN initial_assessments.score IS
  'Assessment score from 1-10';
COMMENT ON COLUMN call_reports.average_initial_assessment IS
  'Denormalized average of all initial assessments from the initial_assessments table';
COMMENT ON COLUMN call_reports.assessment_count IS
  'Denormalized count of assessments from the initial_assessments table';
COMMENT ON COLUMN episodes.average_initial_assessment IS
  'Denormalized average of all initial assessments from the initial_assessments table';
COMMENT ON COLUMN episodes.assessment_count IS
  'Denormalized count of assessments from the initial_assessments table';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
