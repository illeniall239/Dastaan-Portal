-- Redesign episodic evaluation criteria: 6 scores -> 9 scores
-- Add per-criterion comments, qualitative fields, and update trigger
-- New criteria: Main Event, Small Event, Dragness
-- New fields: freeze_ending_scene, scenes_remarks, characterization_remarks

-- ============================================================
-- STEP 1: Drop dependent view (required before ALTER TABLE)
-- ============================================================
DROP VIEW IF EXISTS episodic_evaluations_with_type;

-- ============================================================
-- STEP 2: Add new score columns
-- ============================================================
ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS main_event_score INT CHECK (main_event_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS small_event_score INT CHECK (small_event_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS dragness_score INT CHECK (dragness_score BETWEEN 1 AND 10);

-- ============================================================
-- STEP 3: Add per-criterion comment columns (9 criteria)
-- ============================================================
ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS conflict_of_content_comment TEXT,
  ADD COLUMN IF NOT EXISTS characterization_comment TEXT,
  ADD COLUMN IF NOT EXISTS story_progression_comment TEXT,
  ADD COLUMN IF NOT EXISTS main_event_comment TEXT,
  ADD COLUMN IF NOT EXISTS small_event_comment TEXT,
  ADD COLUMN IF NOT EXISTS dragness_comment TEXT,
  ADD COLUMN IF NOT EXISTS freezes_comment TEXT,
  ADD COLUMN IF NOT EXISTS whats_next_element_comment TEXT,
  ADD COLUMN IF NOT EXISTS overall_assessment_comment TEXT;

-- ============================================================
-- STEP 4: Add qualitative fields
-- ============================================================
ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS freeze_ending_scene TEXT,
  ADD COLUMN IF NOT EXISTS scenes_remarks TEXT,
  ADD COLUMN IF NOT EXISTS characterization_remarks TEXT;

-- ============================================================
-- STEP 5: Backfill new score columns with default value 5
-- ============================================================
UPDATE episodic_evaluations
SET main_event_score = 5
WHERE main_event_score IS NULL;

UPDATE episodic_evaluations
SET small_event_score = 5
WHERE small_event_score IS NULL;

UPDATE episodic_evaluations
SET dragness_score = 5
WHERE dragness_score IS NULL;

-- ============================================================
-- STEP 6: Update the auto-calculate trigger to use 9 scores
-- ============================================================
DROP TRIGGER IF EXISTS auto_calculate_scores ON episodic_evaluations;
DROP FUNCTION IF EXISTS auto_calculate_episodic_scores() CASCADE;

CREATE OR REPLACE FUNCTION auto_calculate_episodic_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate pages and scenes scores based on thresholds
  NEW.pages_score := calculate_pages_score(NEW.no_of_pages);
  NEW.scenes_score := calculate_scenes_score(NEW.no_of_scenes);

  -- Calculate overall average from all 9 scoring parameters
  NEW.overall_average := (
    COALESCE(NEW.conflict_of_content_score, 0) +
    COALESCE(NEW.characterization_score, 0) +
    COALESCE(NEW.story_progression_score, 0) +
    COALESCE(NEW.main_event_score, 0) +
    COALESCE(NEW.small_event_score, 0) +
    COALESCE(NEW.dragness_score, 0) +
    COALESCE(NEW.freezes_score, 0) +
    COALESCE(NEW.whats_next_element_score, 0) +
    COALESCE(NEW.overall_assessment_score, 0)
  )::DECIMAL / 9.0;

  -- Calculate grade based on overall average
  NEW.overall_grade := calculate_grade(NEW.overall_average);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_scores
  BEFORE INSERT OR UPDATE ON episodic_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_episodic_scores();

-- ============================================================
-- STEP 7: Recreate the view with all columns (including new ones)
-- ============================================================
CREATE OR REPLACE VIEW episodic_evaluations_with_type AS
SELECT
  ee.*,
  u.name AS evaluator_name,
  u.email AS evaluator_email,
  u.role AS evaluator_role,
  CASE
    WHEN u.role = 'programmer' THEN 'programmer'::TEXT
    WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'::TEXT
    ELSE 'evaluator'::TEXT
  END AS evaluation_type
FROM episodic_evaluations ee
INNER JOIN users u ON ee.evaluator_id = u.id;

-- Re-apply security settings
ALTER VIEW episodic_evaluations_with_type SET (security_invoker = on);
GRANT SELECT ON episodic_evaluations_with_type TO authenticated;

-- ============================================================
-- STEP 8: Recalculate averages for existing evaluations
-- ============================================================
UPDATE episodic_evaluations SET updated_at = NOW();
