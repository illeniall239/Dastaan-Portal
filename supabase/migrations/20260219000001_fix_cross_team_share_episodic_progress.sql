-- Fix cross-team share progress tracking to include episodic evaluations
--
-- The original trigger on evaluator_forms only counted call-report evaluations.
-- Episode-only evaluations (via episodic_evaluations) never incremented
-- completed_evaluations or changed the share status.
--
-- Fix: update the function to count distinct evaluators across BOTH tables,
-- and add a matching trigger on episodic_evaluations.

CREATE OR REPLACE FUNCTION update_cross_team_share_progress()
RETURNS TRIGGER AS $$
DECLARE
  eval_count INT;
  required INT;
  current_first_eval TIMESTAMPTZ;
BEGIN
  IF NEW.cross_team_share_id IS NOT NULL THEN
    -- Count distinct evaluators across call-report evals AND episodic evals
    SELECT COUNT(DISTINCT evaluator_id) INTO eval_count
    FROM (
      SELECT evaluator_id FROM evaluator_forms
        WHERE cross_team_share_id = NEW.cross_team_share_id
      UNION
      SELECT evaluator_id FROM episodic_evaluations
        WHERE cross_team_share_id = NEW.cross_team_share_id
    ) AS combined_evals;

    SELECT cts.required_evaluations, cts.first_evaluation_at
    INTO required, current_first_eval
    FROM cross_team_shares cts
    WHERE cts.id = NEW.cross_team_share_id;

    UPDATE cross_team_shares SET
      completed_evaluations = eval_count,
      first_evaluation_at   = COALESCE(current_first_eval, NOW()),
      status = CASE
        WHEN eval_count >= required THEN 'completed'
        ELSE 'in_progress'
      END,
      completed_at = CASE
        WHEN eval_count >= required THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = NEW.cross_team_share_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the matching trigger on episodic_evaluations
DROP TRIGGER IF EXISTS trg_update_cross_team_share_episodic ON episodic_evaluations;
CREATE TRIGGER trg_update_cross_team_share_episodic
  AFTER INSERT ON episodic_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_cross_team_share_progress();
