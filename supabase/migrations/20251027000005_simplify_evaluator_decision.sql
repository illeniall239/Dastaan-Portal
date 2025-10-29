-- =====================================================
-- Simplify Evaluator Decision System (Approve/Reject Only)
-- =====================================================
-- Updates evaluator_forms decision field to only allow approve/reject
-- Adds decision_notes for reject justification
-- Creates automatic decision calculation logic
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Update evaluator_forms table
-- =====================================================

-- Add decision column if it doesn't exist
ALTER TABLE evaluator_forms
ADD COLUMN IF NOT EXISTS decision TEXT;

-- Add decision_notes column if it doesn't exist
ALTER TABLE evaluator_forms
ADD COLUMN IF NOT EXISTS decision_notes TEXT;

-- Update decision constraint to only allow approve/reject
ALTER TABLE evaluator_forms
DROP CONSTRAINT IF EXISTS evaluator_forms_decision_check;

ALTER TABLE evaluator_forms
ADD CONSTRAINT evaluator_forms_decision_check
CHECK (decision IN ('approve', 'reject'));

-- Add constraint: decision_notes required when decision='reject'
ALTER TABLE evaluator_forms
DROP CONSTRAINT IF EXISTS decision_notes_required_for_reject;

ALTER TABLE evaluator_forms
ADD CONSTRAINT decision_notes_required_for_reject
CHECK (
  decision != 'reject' OR
  (decision = 'reject' AND decision_notes IS NOT NULL AND LENGTH(TRIM(decision_notes)) > 0)
);

-- Make decision required when submitted
ALTER TABLE evaluator_forms
DROP CONSTRAINT IF EXISTS decision_required_when_submitted;

ALTER TABLE evaluator_forms
ADD CONSTRAINT decision_required_when_submitted
CHECK (submitted_at IS NULL OR decision IS NOT NULL);

COMMENT ON COLUMN evaluator_forms.decision IS 'Evaluator decision: approve or reject';
COMMENT ON COLUMN evaluator_forms.decision_notes IS 'Required justification for reject decisions';

-- =====================================================
-- 2. Update evaluation_logs table
-- =====================================================

-- Add story_id if it doesn't exist (for easier tracking)
ALTER TABLE evaluation_logs
ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES stories(id) ON DELETE CASCADE;

-- Add decision_reason column
ALTER TABLE evaluation_logs
ADD COLUMN IF NOT EXISTS decision_reason TEXT;

-- Note: The table already has:
-- - total_evaluators
-- - approval_count (not approve_count)
-- - rejection_count (not reject_count)
-- - aggregate_average_score
-- - final_decision
-- - created_at (not decided_at)

-- Update final_decision constraint
ALTER TABLE evaluation_logs
DROP CONSTRAINT IF EXISTS evaluation_logs_final_decision_check;

ALTER TABLE evaluation_logs
ADD CONSTRAINT evaluation_logs_final_decision_check
CHECK (final_decision IN ('approved', 'rejected', 'pending'));

-- =====================================================
-- 3. Create decision calculation function
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_evaluation_decision(p_call_report_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_story_id UUID;
  v_total_evaluators INTEGER;
  v_approve_count INTEGER;
  v_reject_count INTEGER;
  v_avg_score DECIMAL(3,2);
  v_final_decision TEXT;
  v_decision_reason TEXT;
BEGIN
  -- Get story ID from call report
  SELECT cr.story_id INTO v_story_id
  FROM call_reports cr
  WHERE cr.id = p_call_report_id;

  -- Count votes by decision type
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE decision = 'approve'),
    COUNT(*) FILTER (WHERE decision = 'reject'),
    AVG(average_score)
  INTO
    v_total_evaluators,
    v_approve_count,
    v_reject_count,
    v_avg_score
  FROM evaluator_forms
  WHERE call_report_id = p_call_report_id
  AND submitted_at IS NOT NULL
  AND decision IS NOT NULL;

  -- Apply decision logic

  -- Rule 1: Score < 5.0 = REJECTED (regardless of votes)
  IF v_avg_score < 5.0 THEN
    v_final_decision := 'rejected';
    v_decision_reason := 'Average score ' || ROUND(v_avg_score, 2)::text || ' below threshold of 5.0';

  -- Rule 2: Score >= 7.0 AND majority approve = APPROVED
  ELSIF v_avg_score >= 7.0 AND v_approve_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'approved';
    v_decision_reason := 'Score ' || ROUND(v_avg_score, 2)::text || ' >= 7.0 with ' || v_approve_count::text || '/' || v_total_evaluators::text || ' approvals';

  -- Rule 3: Majority approve (score 5.0-6.9)
  ELSIF v_approve_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'approved';
    v_decision_reason := 'Majority approval: ' || v_approve_count::text || '/' || v_total_evaluators::text || ' votes (score: ' || ROUND(v_avg_score, 2)::text || ')';

  -- Rule 4: Majority reject
  ELSIF v_reject_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'rejected';
    v_decision_reason := 'Majority rejection: ' || v_reject_count::text || '/' || v_total_evaluators::text || ' votes (score: ' || ROUND(v_avg_score, 2)::text || ')';

  -- Rule 5: Split decision = PENDING
  ELSE
    v_final_decision := 'pending';
    v_decision_reason := 'Split decision: ' || v_approve_count::text || ' approve, ' || v_reject_count::text || ' reject (score: ' || ROUND(v_avg_score, 2)::text || ')';
  END IF;

  -- Delete existing log for this call report (if any)
  DELETE FROM evaluation_logs WHERE call_report_id = p_call_report_id;

  -- Insert new evaluation log
  INSERT INTO evaluation_logs (
    call_report_id,
    story_id,
    total_evaluators,
    approval_count,
    rejection_count,
    aggregate_average_score,
    final_decision,
    decision_reason
  ) VALUES (
    p_call_report_id,
    v_story_id,
    v_total_evaluators,
    v_approve_count,
    v_reject_count,
    v_avg_score,
    v_final_decision,
    v_decision_reason
  );

  -- Update story status based on decision
  IF v_final_decision = 'approved' THEN
    UPDATE stories
    SET
      status = 'approved',
      current_stage = 'ready_for_negotiation',
      updated_at = NOW()
    WHERE id = v_story_id;

  ELSIF v_final_decision = 'rejected' THEN
    UPDATE stories
    SET
      status = 'rejected',
      current_stage = 'archived_rejected_evaluation',
      updated_at = NOW()
    WHERE id = v_story_id;

  ELSIF v_final_decision = 'pending' THEN
    UPDATE stories
    SET
      status = 'in_evaluation',
      current_stage = 'pending_evaluation',
      updated_at = NOW()
    WHERE id = v_story_id;
  END IF;

  -- Update call report evaluation status
  -- Map final_decision to evaluation_status enum values
  UPDATE call_reports
  SET
    evaluation_status = CASE
      WHEN v_final_decision = 'approved' THEN 'completed'::evaluation_status
      WHEN v_final_decision = 'rejected' THEN 'completed'::evaluation_status
      ELSE 'in_progress'::evaluation_status
    END,
    updated_at = NOW()
  WHERE id = p_call_report_id;

  RETURN v_final_decision;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_evaluation_decision IS 'Calculates final decision based on evaluator votes and scores';

-- =====================================================
-- 4. Update evaluation completion trigger
-- =====================================================

CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_internal_count INTEGER;
  v_decision TEXT;
BEGIN
  v_call_report_id := NEW.call_report_id;

  -- Count internal evaluators who have submitted with decisions
  SELECT COUNT(*) INTO v_internal_count
  FROM evaluator_forms ef
  WHERE ef.call_report_id = v_call_report_id
  AND ef.submitted_at IS NOT NULL
  AND ef.decision IS NOT NULL;

  -- Update call report with evaluation counts
  UPDATE call_reports
  SET
    completed_evaluations = v_internal_count,
    updated_at = NOW()
  WHERE id = v_call_report_id;

  -- Calculate decision if we have at least 3 evaluations
  -- (minimum required for decision making)
  IF v_internal_count >= 3 THEN
    -- Calculate and apply decision
    v_decision := calculate_evaluation_decision(v_call_report_id);

    -- Decision is automatically applied in calculate_evaluation_decision function
    -- which updates call_reports.evaluation_status and stories.status
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (drop and create to ensure latest version)
DROP TRIGGER IF EXISTS trigger_evaluation_completion ON evaluator_forms;

CREATE TRIGGER trigger_evaluation_completion
AFTER INSERT OR UPDATE OF submitted_at ON evaluator_forms
FOR EACH ROW
WHEN (NEW.submitted_at IS NOT NULL)
EXECUTE FUNCTION process_evaluation_completion();

COMMIT;
