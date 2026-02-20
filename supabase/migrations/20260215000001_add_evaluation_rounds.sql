-- ============================================================================
-- ADD EVALUATION ROUNDS SYSTEM
-- ============================================================================
-- Enables re-evaluation of call reports and episodes after revisions.
-- Each re-evaluation request increments the evaluation_round counter.
-- Old evaluations are preserved with their round number for history.
-- ============================================================================

-- ============================================================================
-- A. Add evaluation_round to call_reports
-- ============================================================================
ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS evaluation_round INT NOT NULL DEFAULT 1;

-- ============================================================================
-- B. Add evaluation_round to evaluator_forms
-- ============================================================================
-- Note: evaluator_forms has NO unique constraint on (call_report_id, evaluator_id)
-- so no constraint changes needed here.
ALTER TABLE evaluator_forms ADD COLUMN IF NOT EXISTS evaluation_round INT NOT NULL DEFAULT 1;

-- ============================================================================
-- C. Add evaluation_round to episodes
-- ============================================================================
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS evaluation_round INT NOT NULL DEFAULT 1;

-- ============================================================================
-- D. Modify episodic_evaluations unique constraint
-- ============================================================================
ALTER TABLE episodic_evaluations ADD COLUMN IF NOT EXISTS evaluation_round INT NOT NULL DEFAULT 1;

-- Drop old unique constraint that prevents re-evaluation
ALTER TABLE episodic_evaluations DROP CONSTRAINT IF EXISTS unique_evaluator_episode;

-- New unique: one evaluation per evaluator per episode PER ROUND
ALTER TABLE episodic_evaluations ADD CONSTRAINT unique_evaluator_episode_per_round
  UNIQUE(episode_id, evaluator_id, evaluation_round);

-- ============================================================================
-- E. Modify evaluator_assignments unique constraint
-- ============================================================================
ALTER TABLE evaluator_assignments ADD COLUMN IF NOT EXISTS evaluation_round INT NOT NULL DEFAULT 1;

-- Drop old unique constraint
ALTER TABLE evaluator_assignments DROP CONSTRAINT IF EXISTS evaluator_assignments_call_report_id_evaluator_id_key;

-- New unique: one assignment per evaluator per call report PER ROUND
ALTER TABLE evaluator_assignments ADD CONSTRAINT evaluator_assignments_unique_per_round
  UNIQUE(call_report_id, evaluator_id, evaluation_round);

-- ============================================================================
-- F. Update process_evaluation_completion() trigger
-- ============================================================================
-- Must only count evaluations from the CURRENT round of the call report.
CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_current_round INT;
  v_total_evaluations INTEGER;
  v_avg_score NUMERIC;
  v_new_status evaluation_status;
BEGIN
  v_call_report_id := NEW.call_report_id;

  -- Get current evaluation round for this call report
  SELECT evaluation_round INTO v_current_round
  FROM call_reports
  WHERE id = v_call_report_id;

  -- Count submitted evaluations for the CURRENT round only
  SELECT COUNT(*), AVG(ef.average_score)
  INTO v_total_evaluations, v_avg_score
  FROM evaluator_forms ef
  WHERE ef.call_report_id = v_call_report_id
    AND ef.submitted_at IS NOT NULL
    AND ef.evaluation_round = v_current_round;

  -- Update call report with unified counts
  UPDATE call_reports
  SET
    completed_evaluations = COALESCE(v_total_evaluations, 0),
    completed_internal_evaluations = COALESCE(v_total_evaluations, 0),
    completed_external_evaluations = 0,
    current_average_score = v_avg_score,
    average_score = v_avg_score,
    updated_at = NOW()
  WHERE id = v_call_report_id;

  -- Determine status relative to required_internal_evaluators (default 5)
  IF COALESCE(v_total_evaluations, 0) >= (
      SELECT COALESCE(required_internal_evaluators, 5) FROM call_reports WHERE id = v_call_report_id
    ) THEN
    IF v_avg_score >= 7.0 THEN
      v_new_status := 'completed'::evaluation_status;
    ELSIF v_avg_score >= 5.0 THEN
      v_new_status := 'needs_improvement'::evaluation_status;
    ELSE
      v_new_status := 'rejected'::evaluation_status;
    END IF;
  ELSIF COALESCE(v_total_evaluations, 0) > 0 THEN
    v_new_status := 'in_progress'::evaluation_status;
  ELSE
    v_new_status := 'pending'::evaluation_status;
  END IF;

  UPDATE call_reports
  SET evaluation_status = v_new_status,
      updated_at = NOW()
  WHERE id = v_call_report_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS evaluation_completion_trigger ON evaluator_forms;

CREATE TRIGGER evaluation_completion_trigger
  AFTER INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION process_evaluation_completion();

-- ============================================================================
-- G. Update get_pending_evaluations_count() RPC
-- ============================================================================
-- Must only check for evaluations matching the CURRENT round.
DROP FUNCTION IF EXISTS get_pending_evaluations_count(UUID);
DROP FUNCTION IF EXISTS get_pending_evaluations_count(UUID, UUID);

CREATE OR REPLACE FUNCTION get_pending_evaluations_count(
  evaluator_user_id UUID,
  team_id_filter UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_count INTEGER;
  user_team_id UUID;
BEGIN
  -- If no team_id provided, get it from user
  IF team_id_filter IS NULL THEN
    SELECT team_id INTO user_team_id
    FROM users
    WHERE id = evaluator_user_id;
  ELSE
    user_team_id := team_id_filter;
  END IF;

  -- Count unevaluated call reports for the CURRENT round
  SELECT COUNT(*)::INTEGER INTO result_count
  FROM call_reports cr
  WHERE cr.meeting_type = 'call_report'
  -- TEAM ISOLATION: Filter by team
  AND (user_team_id IS NULL OR cr.team_id = user_team_id)
  -- Exclude already evaluated IN THE CURRENT ROUND
  AND NOT EXISTS (
    SELECT 1
    FROM evaluator_forms ef
    WHERE ef.call_report_id = cr.id
    AND ef.evaluator_id = evaluator_user_id
    AND ef.evaluation_round = cr.evaluation_round
  );

  RETURN result_count;
END;
$$;

COMMENT ON FUNCTION get_pending_evaluations_count IS
  'Counts unevaluated call reports (current round) for evaluator with team isolation.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
