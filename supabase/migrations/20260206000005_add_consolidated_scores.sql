-- Migration: Add Freezes and What's Next Scores
-- Description: Adds granular scoring columns to evaluator_forms as required by the Consolidated CMS
-- Date: 2026-02-06

-- Add new score fields (1-10 scale)
ALTER TABLE evaluator_forms
  ADD COLUMN IF NOT EXISTS freezes_score INT CHECK (freezes_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS whats_next_score INT CHECK (whats_next_score BETWEEN 1 AND 10);

-- Update the auto-calculation function to include these new scores
CREATE OR REPLACE FUNCTION calculate_evaluation_average()
RETURNS TRIGGER AS $$
BEGIN
  NEW.average_score := ROUND(
    (
      COALESCE(NEW.premise_conflict_score, 0) +
      COALESCE(NEW.storyline_plot_score, 0) +
      COALESCE(NEW.episodic_progression_score, 0) +
      COALESCE(NEW.characters_score, 0) +
      COALESCE(NEW.freezes_score, 0) +
      COALESCE(NEW.whats_next_score, 0) +
      COALESCE(NEW.overall_assessment_score, 0)
    )::DECIMAL / 7, 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON COLUMN evaluator_forms.freezes_score IS 'Score for freezes / climaxes (1-10)';
COMMENT ON COLUMN evaluator_forms.whats_next_score IS 'Score for the whats next element (1-10)';
