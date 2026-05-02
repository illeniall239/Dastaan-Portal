-- Dragness is a reverse metric: higher score = more drag = worse episode.
-- Fix the overall_average calculation to use (11 - dragness_score) so that
-- high dragness reduces the average instead of inflating it.
--
-- A dragness score of 8 (very draggy) now contributes 3 to the average,
-- correctly penalising poor pacing.

CREATE OR REPLACE FUNCTION auto_calculate_episodic_scores()
RETURNS TRIGGER AS $$
BEGIN
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

-- Recalculate all existing evaluations with the corrected formula
UPDATE episodic_evaluations SET updated_at = NOW();
