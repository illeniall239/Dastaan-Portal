-- Fix: evaluation average trigger divides by 7 (includes freezes_score and whats_next_score)
-- but the form only submits 5 scores. The two missing fields default to 0, dragging the average down.
-- E.g., all 5 sliders at 9 → (9+9+9+9+0+0+9)/7 = 6.4 instead of 9.0
-- Fix: divide by 5 (only the fields the form actually submits)

CREATE OR REPLACE FUNCTION calculate_evaluation_average()
RETURNS TRIGGER AS $$
BEGIN
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
