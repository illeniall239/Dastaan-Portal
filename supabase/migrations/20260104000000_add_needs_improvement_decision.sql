-- Migration: Add "Needs Improvement" as Third Decision Option
-- Created: 2026-01-04
-- Description: Updates evaluator_forms to support 'needs_improvement' decision,
--              adds needs_improvement_count to evaluation_logs,
--              and updates aggregation logic

-- Step 1: Drop existing CHECK constraint on decision field
ALTER TABLE evaluator_forms
DROP CONSTRAINT IF EXISTS evaluator_forms_decision_check;

-- Step 2: Add new CHECK constraint with three options
ALTER TABLE evaluator_forms
ADD CONSTRAINT evaluator_forms_decision_check
CHECK (decision IN ('approve', 'reject', 'needs_improvement'));

-- Step 3: Update decision_notes constraint to require notes for both reject AND needs_improvement
ALTER TABLE evaluator_forms
DROP CONSTRAINT IF EXISTS evaluator_forms_decision_notes_check;

ALTER TABLE evaluator_forms
ADD CONSTRAINT evaluator_forms_decision_notes_check
CHECK (
  (decision IN ('reject', 'needs_improvement') AND decision_notes IS NOT NULL AND LENGTH(TRIM(decision_notes)) > 0)
  OR (decision = 'approve')
);

-- Step 4: Add needs_improvement_count to evaluation_logs table
ALTER TABLE evaluation_logs
ADD COLUMN IF NOT EXISTS needs_improvement_count INTEGER DEFAULT 0 NOT NULL;

-- Step 5: Update final_decision enum to support 'needs_improvement'
-- Note: evaluation_logs.final_decision is TEXT, not enum, so no constraint update needed

-- Step 6: Update calculate_evaluation_decision() function
CREATE OR REPLACE FUNCTION calculate_evaluation_decision(p_call_report_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_total_evaluators INTEGER;
  v_approve_count INTEGER;
  v_reject_count INTEGER;
  v_needs_improvement_count INTEGER;
  v_avg_score DECIMAL(3,2);
  v_final_decision TEXT;
  v_decision_reason TEXT;
  v_story_id UUID;
BEGIN
  -- Count votes by decision type
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE decision = 'approve'),
    COUNT(*) FILTER (WHERE decision = 'reject'),
    COUNT(*) FILTER (WHERE decision = 'needs_improvement'),
    AVG(average_score)
  INTO
    v_total_evaluators,
    v_approve_count,
    v_reject_count,
    v_needs_improvement_count,
    v_avg_score
  FROM evaluator_forms
  WHERE call_report_id = p_call_report_id
  AND submitted_at IS NOT NULL
  AND decision IS NOT NULL;

  -- NEW Decision Rules (incorporating needs_improvement):

  -- Rule 1: Average score < 5.0 = REJECTED (regardless of votes)
  IF v_avg_score < 5.0 THEN
    v_final_decision := 'rejected';
    v_decision_reason := 'Average score below 5.0 threshold';

  -- Rule 2: Majority "needs_improvement" = NEEDS_IMPROVEMENT
  ELSIF v_needs_improvement_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'needs_improvement';
    v_decision_reason := format('Majority voted for improvements (%s/%s)', v_needs_improvement_count, v_total_evaluators);

  -- Rule 3: Average score >= 7.0 AND majority approve = APPROVED
  ELSIF v_avg_score >= 7.0 AND v_approve_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'approved';
    v_decision_reason := format('High score (%.1f) with majority approval (%s/%s)', v_avg_score, v_approve_count, v_total_evaluators);

  -- Rule 4: Majority approve (score 5.0-6.9)
  ELSIF v_approve_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'approved';
    v_decision_reason := format('Majority approval (%s/%s)', v_approve_count, v_total_evaluators);

  -- Rule 5: Majority reject
  ELSIF v_reject_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'rejected';
    v_decision_reason := format('Majority rejection (%s/%s)', v_reject_count, v_total_evaluators);

  -- Rule 6: Split decision (no clear majority) = PENDING
  ELSE
    v_final_decision := 'pending';
    v_decision_reason := format('Split decision: %s approve, %s reject, %s needs improvement',
                                  v_approve_count, v_reject_count, v_needs_improvement_count);
  END IF;

  -- Get story_id for this call report
  SELECT story_id INTO v_story_id
  FROM call_reports
  WHERE id = p_call_report_id;

  -- Insert or update evaluation log
  INSERT INTO evaluation_logs (
    call_report_id,
    story_id,
    total_evaluators,
    approval_count,
    rejection_count,
    needs_improvement_count,
    aggregate_average_score,
    final_decision,
    decision_reason,
    updated_at
  ) VALUES (
    p_call_report_id,
    v_story_id,
    v_total_evaluators,
    v_approve_count,
    v_reject_count,
    v_needs_improvement_count,
    v_avg_score,
    v_final_decision,
    v_decision_reason,
    NOW()
  )
  ON CONFLICT (call_report_id)
  DO UPDATE SET
    total_evaluators = EXCLUDED.total_evaluators,
    approval_count = EXCLUDED.approval_count,
    rejection_count = EXCLUDED.rejection_count,
    needs_improvement_count = EXCLUDED.needs_improvement_count,
    aggregate_average_score = EXCLUDED.aggregate_average_score,
    final_decision = EXCLUDED.final_decision,
    decision_reason = EXCLUDED.decision_reason,
    updated_at = NOW();

  RETURN v_final_decision;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN evaluation_logs.needs_improvement_count IS 'Count of evaluators who selected needs_improvement decision';
