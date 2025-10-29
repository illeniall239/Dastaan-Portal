-- Update average calculation to exclude dialogues_score after dropping the column

-- Drop and recreate calculate_evaluation_average without dialogues_score
DROP TRIGGER IF EXISTS auto_calculate_evaluation_average ON evaluator_forms;
DROP FUNCTION IF EXISTS calculate_evaluation_average();

CREATE OR REPLACE FUNCTION calculate_evaluation_average()
RETURNS TRIGGER AS $$
BEGIN
  NEW.average_score := ROUND(
    (
      COALESCE(NEW.premise_conflict_score, 0) + 
      COALESCE(NEW.storyline_plot_score, 0) +
      COALESCE(NEW.episodic_progression_score, 0) +
      COALESCE(NEW.characters_score, 0)
    )::DECIMAL / 4, 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_evaluation_average
  BEFORE INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  EXECUTE FUNCTION calculate_evaluation_average();

-- Backfill existing rows
UPDATE evaluator_forms
SET average_score = ROUND(
  (
    COALESCE(premise_conflict_score, 0) +
    COALESCE(storyline_plot_score, 0) +
    COALESCE(episodic_progression_score, 0) +
    COALESCE(characters_score, 0)
  )::DECIMAL / 4, 1
);


