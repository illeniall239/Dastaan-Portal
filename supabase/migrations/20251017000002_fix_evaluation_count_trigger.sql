-- Fix evaluation count trigger to properly count all evaluations
-- The previous trigger filtered by evaluator_type which failed for content_creator users
-- Since external evaluators are now optional, all submitted evaluations count toward the required 5

CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_call_report RECORD;
  v_total_evaluations INTEGER;
  v_avg_score NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Get the call report ID from the evaluation
  v_call_report_id := NEW.call_report_id;

  -- Get call report details
  SELECT * INTO v_call_report
  FROM call_reports
  WHERE id = v_call_report_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Count all submitted evaluations (no type filtering needed)
  -- Since external evaluators are optional, all evaluations count toward completion
  SELECT
    COUNT(*),
    AVG(ef.average_score)
  INTO v_total_evaluations, v_avg_score
  FROM evaluator_forms ef
  WHERE ef.call_report_id = v_call_report_id
  AND ef.submitted_at IS NOT NULL;

  -- Update call report with counts
  -- All evaluations count as "internal" since we removed the external requirement
  UPDATE call_reports
  SET
    completed_evaluations = v_total_evaluations,
    completed_internal_evaluations = v_total_evaluations,
    completed_external_evaluations = 0,
    current_average_score = v_avg_score,
    average_score = v_avg_score,
    updated_at = NOW()
  WHERE id = v_call_report_id;

  -- Determine evaluation status based on completion
  -- Required evaluators is now 5 internal only
  IF v_total_evaluations >= COALESCE(v_call_report.required_internal_evaluators, 5) THEN
    -- All required evaluations completed - determine final status based on score
    IF v_avg_score >= 7.0 THEN
      v_new_status := 'completed';
    ELSIF v_avg_score >= 5.0 THEN
      v_new_status := 'needs_improvement';
    ELSE
      v_new_status := 'rejected';
    END IF;
  ELSIF v_total_evaluations > 0 THEN
    -- Some evaluations done but not all
    v_new_status := 'in_progress';
  ELSE
    -- No evaluations yet
    v_new_status := 'pending';
  END IF;

  -- Update evaluation status
  UPDATE call_reports
  SET
    evaluation_status = v_new_status,
    updated_at = NOW()
  WHERE id = v_call_report_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS evaluation_completion_trigger ON evaluator_forms;

CREATE TRIGGER evaluation_completion_trigger
  AFTER INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION process_evaluation_completion();

COMMENT ON FUNCTION process_evaluation_completion() IS
'Automatically updates call report evaluation counts and status when evaluations are submitted.
All submitted evaluations count toward the required 5, regardless of user role or evaluator_type.';
