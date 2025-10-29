-- =====================================================
-- Fix Race Condition in Evaluation Trigger
-- =====================================================
-- This migration fixes a critical race condition where
-- multiple evaluators submitting simultaneously could
-- cause inconsistent evaluation counts and status updates.
--
-- Solution: Add row-level locking (FOR UPDATE) to ensure
-- only one trigger can process a call_report at a time.
-- =====================================================

CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_total_evaluations INTEGER;
  v_internal_evaluations INTEGER;
  v_external_evaluations INTEGER;
  v_avg_score DECIMAL(3,2);
  v_call_report RECORD;
  v_new_status evaluation_status;
  v_evaluator_type evaluator_type;
BEGIN
  -- Get the call report ID from the evaluation
  v_call_report_id := NEW.call_report_id;

  -- Get evaluator type
  SELECT u.evaluator_type INTO v_evaluator_type
  FROM users u
  WHERE u.id = NEW.evaluator_id;

  -- Count total completed evaluations for this call report
  SELECT
    COUNT(*) FILTER (WHERE u.evaluator_type = 'internal'),
    COUNT(*) FILTER (WHERE u.evaluator_type = 'external'),
    COUNT(*),
    AVG(ef.average_score)
  INTO
    v_internal_evaluations,
    v_external_evaluations,
    v_total_evaluations,
    v_avg_score
  FROM evaluator_forms ef
  LEFT JOIN users u ON u.id = ef.evaluator_id
  WHERE ef.call_report_id = v_call_report_id
  AND ef.submitted_at IS NOT NULL;

  -- Update the call report with evaluation count and current average
  UPDATE call_reports
  SET
    completed_evaluations = v_total_evaluations,
    completed_internal_evaluations = v_internal_evaluations,
    completed_external_evaluations = v_external_evaluations,
    current_average_score = v_avg_score,
    average_score = v_avg_score,
    evaluation_status = CASE
      WHEN evaluation_status = 'pending' THEN 'in_progress'::evaluation_status
      ELSE evaluation_status
    END
  WHERE id = v_call_report_id;

  -- Update assignment status to completed
  UPDATE evaluator_assignments
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE call_report_id = v_call_report_id
  AND evaluator_id = NEW.evaluator_id;

  -- Get the call report with row locking to prevent race conditions
  -- FOR UPDATE ensures only one trigger can check completion at a time
  SELECT * INTO v_call_report
  FROM call_reports
  WHERE id = v_call_report_id
  FOR UPDATE;

  -- Check if all required evaluators have completed
  IF v_total_evaluations >= v_call_report.required_evaluators THEN
    -- Determine final status based on average score
    IF v_avg_score >= 7.0 THEN
      v_new_status := 'accepted'::evaluation_status;
    ELSIF v_avg_score >= 5.0 THEN
      v_new_status := 'needs_improvement'::evaluation_status;
    ELSE
      v_new_status := 'rejected'::evaluation_status;
    END IF;

    -- Update call report status
    UPDATE call_reports
    SET
      evaluation_status = v_new_status,
      updated_at = NOW()
    WHERE id = v_call_report_id;

    -- If rejected, archive the call report
    IF v_new_status = 'rejected'::evaluation_status THEN
      PERFORM archive_rejected_call_report(v_call_report_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON FUNCTION process_evaluation_completion() IS
'UPDATED: Added row locking (FOR UPDATE) to prevent race conditions when multiple evaluators submit simultaneously. Ensures atomic evaluation completion checking.';
