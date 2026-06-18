-- =====================================================
-- Add is_feedback_only flag to episodic evaluations.
-- When TRUE the evaluation carries only email/document
-- feedback — the trigger nulls overall_average and
-- overall_grade so the row is excluded from content
-- aging and other score-based reports.
-- =====================================================

-- 1. Add the column
ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS is_feedback_only BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Allow NULLs on computed columns so feedback-only rows can clear them
ALTER TABLE episodic_evaluations ALTER COLUMN pages_score DROP NOT NULL;
ALTER TABLE episodic_evaluations ALTER COLUMN scenes_score DROP NOT NULL;
ALTER TABLE episodic_evaluations ALTER COLUMN overall_average DROP NOT NULL;
ALTER TABLE episodic_evaluations ALTER COLUMN overall_grade DROP NOT NULL;

-- 3. Replace the trigger function with a guard for feedback-only rows
CREATE OR REPLACE FUNCTION auto_calculate_episodic_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Feedback-only evaluations carry no scores
  IF NEW.is_feedback_only THEN
    NEW.overall_average := NULL;
    NEW.overall_grade := NULL;
    NEW.pages_score := NULL;
    NEW.scenes_score := NULL;
    RETURN NEW;
  END IF;

  -- Calculate pages and scenes scores based on thresholds
  NEW.pages_score := calculate_pages_score(NEW.no_of_pages);
  NEW.scenes_score := calculate_scenes_score(NEW.no_of_scenes);

  -- Calculate overall average from all 9 scoring parameters.
  -- Dragness is reversed: (11 - dragness_score) so higher dragness = lower contribution.
  NEW.overall_average := (
    COALESCE(NEW.conflict_of_content_score, 0) +
    COALESCE(NEW.characterization_score, 0) +
    COALESCE(NEW.story_progression_score, 0) +
    COALESCE(NEW.main_event_score, 0) +
    COALESCE(NEW.small_event_score, 0) +
    (11 - COALESCE(NEW.dragness_score, 6)) +
    COALESCE(NEW.freezes_score, 0) +
    COALESCE(NEW.whats_next_element_score, 0) +
    COALESCE(NEW.overall_assessment_score, 0)
  )::DECIMAL / 9.0;

  -- Calculate grade based on overall average
  NEW.overall_grade := calculate_grade(NEW.overall_average);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Retroactively mark existing feedback-only evaluations
--    Criteria: all 9 scores stuck at default (5) AND has feedback content
UPDATE episodic_evaluations
SET is_feedback_only = TRUE,
    overall_average = NULL,
    overall_grade = NULL,
    pages_score = NULL,
    scenes_score = NULL
WHERE conflict_of_content_score = 5
  AND characterization_score = 5
  AND story_progression_score = 5
  AND main_event_score = 5
  AND small_event_score = 5
  AND dragness_score = 5
  AND freezes_score = 5
  AND whats_next_element_score = 5
  AND overall_assessment_score = 5
  AND (
    feedback_attachments != '[]'::jsonb
    OR feedback_text IS NOT NULL
  );
