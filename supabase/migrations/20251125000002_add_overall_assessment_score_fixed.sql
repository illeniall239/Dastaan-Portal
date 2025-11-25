-- Add overall_assessment_score to both evaluator_forms and episodic_evaluations
-- This version uses IF NOT EXISTS to handle partially applied migrations

-- ============================================================
-- PART 1: EVALUATOR_FORMS (Writer Engagement Evaluations)
-- ============================================================

-- Add overall_assessment_score column (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluator_forms'
    AND column_name = 'overall_assessment_score'
  ) THEN
    ALTER TABLE evaluator_forms
      ADD COLUMN overall_assessment_score INT CHECK (overall_assessment_score BETWEEN 1 AND 10);

    COMMENT ON COLUMN evaluator_forms.overall_assessment_score IS 'Overall assessment score for the project (1-10 scale)';
  END IF;
END $$;

-- Update trigger to calculate average from 5 scores instead of 4
DROP TRIGGER IF EXISTS calculate_evaluation_average_trigger ON evaluator_forms;
DROP TRIGGER IF EXISTS auto_calculate_evaluation_average ON evaluator_forms;
DROP FUNCTION IF EXISTS calculate_evaluation_average();

CREATE OR REPLACE FUNCTION calculate_evaluation_average()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average from all 5 scoring parameters
  NEW.average_score := ROUND(
    (
      COALESCE(NEW.premise_conflict_score, 0) +
      COALESCE(NEW.storyline_plot_score, 0) +
      COALESCE(NEW.episodic_progression_score, 0) +
      COALESCE(NEW.characters_score, 0) +
      COALESCE(NEW.overall_assessment_score, 0)
    )::DECIMAL / 5, 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_evaluation_average_trigger
  BEFORE INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  EXECUTE FUNCTION calculate_evaluation_average();

-- Backfill existing records with default value of 5 and recalculate averages
UPDATE evaluator_forms
SET overall_assessment_score = 5
WHERE overall_assessment_score IS NULL;

-- ============================================================
-- PART 2: EPISODIC_EVALUATIONS (Episode Evaluations)
-- ============================================================

-- Add overall_assessment_score column (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodic_evaluations'
    AND column_name = 'overall_assessment_score'
  ) THEN
    ALTER TABLE episodic_evaluations
      ADD COLUMN overall_assessment_score INT CHECK (overall_assessment_score BETWEEN 1 AND 10);

    COMMENT ON COLUMN episodic_evaluations.overall_assessment_score IS 'Overall assessment score for the episode (1-10 scale)';
  END IF;
END $$;

-- Update trigger to calculate average from 6 scores instead of 5
DROP TRIGGER IF EXISTS auto_calculate_scores ON episodic_evaluations;
DROP FUNCTION IF EXISTS auto_calculate_episodic_scores();

CREATE OR REPLACE FUNCTION auto_calculate_episodic_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate pages and scenes scores based on thresholds
  NEW.pages_score := calculate_pages_score(NEW.no_of_pages);
  NEW.scenes_score := calculate_scenes_score(NEW.no_of_scenes);

  -- Calculate overall average from all 6 scoring parameters
  NEW.overall_average := (
    NEW.conflict_of_content_score +
    NEW.characterization_score +
    NEW.story_progression_score +
    NEW.freezes_score +
    NEW.whats_next_element_score +
    COALESCE(NEW.overall_assessment_score, 0)
  )::DECIMAL / 6.0;

  -- Calculate grade based on overall average
  NEW.overall_grade := calculate_grade(NEW.overall_average);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_scores
  BEFORE INSERT OR UPDATE ON episodic_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_episodic_scores();

-- Backfill existing records with default value of 5 and recalculate averages
UPDATE episodic_evaluations
SET overall_assessment_score = 5
WHERE overall_assessment_score IS NULL;
