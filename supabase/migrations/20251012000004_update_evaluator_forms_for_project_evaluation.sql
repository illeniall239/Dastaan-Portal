-- Update evaluator_forms table to match project evaluation requirements
-- This migration modifies the existing evaluator_forms table to support the evaluation workflow

-- Drop old score columns that don't match the new requirements
ALTER TABLE evaluator_forms
  DROP COLUMN IF EXISTS originality_score,
  DROP COLUMN IF EXISTS market_potential_score,
  DROP COLUMN IF EXISTS execution_feasibility_score,
  DROP COLUMN IF EXISTS audience_appeal_score,
  DROP COLUMN IF EXISTS budget_viability_score,
  DROP COLUMN IF EXISTS cultural_relevance_score,
  DROP COLUMN IF EXISTS competitive_advantage_score,
  DROP COLUMN IF EXISTS production_complexity_score,
  DROP COLUMN IF EXISTS overall_comments,
  DROP COLUMN IF EXISTS strengths,
  DROP COLUMN IF EXISTS weaknesses,
  DROP COLUMN IF EXISTS key_changes,
  DROP COLUMN IF EXISTS decision;

-- Add new fields for project information
ALTER TABLE evaluator_forms
  ADD COLUMN producer_name TEXT,
  ADD COLUMN genre TEXT,
  ADD COLUMN slot TEXT,
  ADD COLUMN big_idea TEXT,
  ADD COLUMN theme TEXT;

-- Add new score fields (1-10 scale)
ALTER TABLE evaluator_forms
  ADD COLUMN premise_conflict_score INT CHECK (premise_conflict_score BETWEEN 1 AND 10),
  ADD COLUMN storyline_plot_score INT CHECK (storyline_plot_score BETWEEN 1 AND 10),
  ADD COLUMN episodic_progression_score INT CHECK (episodic_progression_score BETWEEN 1 AND 10),
  ADD COLUMN characters_score INT CHECK (characters_score BETWEEN 1 AND 10),
  ADD COLUMN dialogues_score INT CHECK (dialogues_score BETWEEN 1 AND 10),
  ADD COLUMN overall_assessment_score INT CHECK (overall_assessment_score BETWEEN 1 AND 10);

-- Add comments field for additional notes
ALTER TABLE evaluator_forms
  ADD COLUMN comments TEXT;

-- Create function to calculate average score automatically
CREATE OR REPLACE FUNCTION calculate_evaluation_average()
RETURNS TRIGGER AS $$
BEGIN
  NEW.average_score := ROUND(
    (
      COALESCE(NEW.premise_conflict_score, 0) +
      COALESCE(NEW.storyline_plot_score, 0) +
      COALESCE(NEW.episodic_progression_score, 0) +
      COALESCE(NEW.characters_score, 0) +
      COALESCE(NEW.dialogues_score, 0) +
      COALESCE(NEW.overall_assessment_score, 0)
    )::DECIMAL / 6, 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate average on insert/update
DROP TRIGGER IF EXISTS auto_calculate_evaluation_average ON evaluator_forms;
CREATE TRIGGER auto_calculate_evaluation_average
  BEFORE INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  EXECUTE FUNCTION calculate_evaluation_average();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_evaluator_id ON evaluator_forms(evaluator_id);

-- Add comments
COMMENT ON COLUMN evaluator_forms.producer_name IS 'Producer associated with the project';
COMMENT ON COLUMN evaluator_forms.genre IS 'Genre of the project';
COMMENT ON COLUMN evaluator_forms.slot IS 'Time slot or scheduling information';
COMMENT ON COLUMN evaluator_forms.big_idea IS 'The big idea or main topic of the project';
COMMENT ON COLUMN evaluator_forms.theme IS 'Central theme of the project';
COMMENT ON COLUMN evaluator_forms.premise_conflict_score IS 'Score for premise and conflict (1-10)';
COMMENT ON COLUMN evaluator_forms.storyline_plot_score IS 'Score for storyline and plot (1-10)';
COMMENT ON COLUMN evaluator_forms.episodic_progression_score IS 'Score for episodic progression (1-10)';
COMMENT ON COLUMN evaluator_forms.characters_score IS 'Score for character development (1-10)';
COMMENT ON COLUMN evaluator_forms.dialogues_score IS 'Score for dialogue quality (1-10)';
COMMENT ON COLUMN evaluator_forms.overall_assessment_score IS 'Overall assessment score (1-10)';
COMMENT ON COLUMN evaluator_forms.average_score IS 'Automatically calculated average of all scores';
