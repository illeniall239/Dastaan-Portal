-- Normalize evaluation counts: treat all submitted evaluations as internal
-- and recompute counts reliably. Overrides previous function versions.

-- Ensure the evaluation completion function implements unified counting
CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_total_evaluations INTEGER;
  v_avg_score NUMERIC;
  v_new_status evaluation_status;
BEGIN
  v_call_report_id := NEW.call_report_id;

  -- Count all submitted evaluations and compute average
  SELECT COUNT(*), AVG(ef.average_score)
  INTO v_total_evaluations, v_avg_score
  FROM evaluator_forms ef
  WHERE ef.call_report_id = v_call_report_id
    AND ef.submitted_at IS NOT NULL;

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

-- Ensure trigger exists and uses the function above
DROP TRIGGER IF EXISTS on_evaluation_submitted ON evaluator_forms;
DROP TRIGGER IF EXISTS evaluation_completion_trigger ON evaluator_forms;

CREATE TRIGGER evaluation_completion_trigger
  AFTER INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION process_evaluation_completion();

-- Backfill existing call_reports to recompute counts and averages now
WITH stats AS (
  SELECT
    call_report_id,
    COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) AS total,
    AVG(average_score) FILTER (WHERE submitted_at IS NOT NULL) AS avg
  FROM evaluator_forms
  GROUP BY call_report_id
)
UPDATE call_reports cr
SET
  completed_evaluations = COALESCE(s.total, 0),
  completed_internal_evaluations = COALESCE(s.total, 0),
  completed_external_evaluations = 0,
  current_average_score = s.avg,
  average_score = s.avg,
  updated_at = NOW()
FROM stats s
WHERE cr.id = s.call_report_id;


