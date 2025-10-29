-- =====================================================
-- Add Evaluation Deadline Tracking & Dual-Threshold Auto-Decision
-- =====================================================
-- Adds deadline tracking and updates auto-decision logic to support:
-- 1. Immediate decision at 5/5 evaluations
-- 2. Deadline-based decision at 3/5 evaluations after 5 days
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Add deadline tracking columns to call_reports
-- =====================================================

-- Add evaluation deadline column (default: 5 days from creation)
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS evaluation_deadline TIMESTAMP;

-- Add column to track when final decision was made
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS final_decision_made_at TIMESTAMP;

-- Add column for required number of evaluations (default: 5)
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS required_evaluations INTEGER DEFAULT 5;

-- Add column for minimum evaluations needed for deadline-based decision (default: 3)
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS minimum_evaluations_for_deadline INTEGER DEFAULT 3;

-- Set evaluation_deadline for existing call reports (5 days from created_at)
UPDATE call_reports
SET evaluation_deadline = created_at + INTERVAL '5 days'
WHERE evaluation_deadline IS NULL;

-- Make evaluation_deadline NOT NULL with default
ALTER TABLE call_reports
ALTER COLUMN evaluation_deadline SET DEFAULT (NOW() + INTERVAL '5 days');

ALTER TABLE call_reports
ALTER COLUMN evaluation_deadline SET NOT NULL;

COMMENT ON COLUMN call_reports.evaluation_deadline IS 'Deadline for evaluations (5 days from creation by default)';
COMMENT ON COLUMN call_reports.final_decision_made_at IS 'Timestamp when auto-decision was made (NULL if still pending)';
COMMENT ON COLUMN call_reports.required_evaluations IS 'Total number of evaluations required (default: 5)';
COMMENT ON COLUMN call_reports.minimum_evaluations_for_deadline IS 'Minimum evaluations needed for deadline-based decision (default: 3)';

-- =====================================================
-- 2. Update auto-decision trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_internal_count INTEGER;
  v_decision TEXT;
  v_required_evaluations INTEGER;
  v_min_for_deadline INTEGER;
  v_evaluation_deadline TIMESTAMP;
  v_final_decision_made_at TIMESTAMP;
  v_should_decide BOOLEAN := FALSE;
BEGIN
  v_call_report_id := NEW.call_report_id;

  -- Get call report settings
  SELECT
    required_evaluations,
    minimum_evaluations_for_deadline,
    evaluation_deadline,
    final_decision_made_at
  INTO
    v_required_evaluations,
    v_min_for_deadline,
    v_evaluation_deadline,
    v_final_decision_made_at
  FROM call_reports
  WHERE id = v_call_report_id;

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

  -- Check if decision should be made (only if not already decided)
  IF v_final_decision_made_at IS NULL THEN
    -- Condition 1: All required evaluations completed (5/5)
    IF v_internal_count >= v_required_evaluations THEN
      v_should_decide := TRUE;

    -- Condition 2: Minimum evaluations met + deadline passed (3/5 after 5 days)
    ELSIF v_internal_count >= v_min_for_deadline AND NOW() > v_evaluation_deadline THEN
      v_should_decide := TRUE;
    END IF;
  END IF;

  -- Calculate and apply decision if conditions met
  IF v_should_decide THEN
    v_decision := calculate_evaluation_decision(v_call_report_id);

    -- Mark decision timestamp
    UPDATE call_reports
    SET final_decision_made_at = NOW()
    WHERE id = v_call_report_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_evaluation_completion IS 'Handles evaluation completion with dual-threshold auto-decision: immediate at 5/5 or deadline-based at 3/5 after 5 days';

-- Recreate trigger (already exists from previous migration, just ensuring it's current)
DROP TRIGGER IF EXISTS trigger_evaluation_completion ON evaluator_forms;

CREATE TRIGGER trigger_evaluation_completion
AFTER INSERT OR UPDATE OF submitted_at ON evaluator_forms
FOR EACH ROW
WHEN (NEW.submitted_at IS NOT NULL)
EXECUTE FUNCTION process_evaluation_completion();

-- =====================================================
-- 3. Create function to check for deadline-based decisions
-- =====================================================
-- This function can be called manually or via cron job
-- to catch call reports that hit deadline without new submissions

CREATE OR REPLACE FUNCTION check_evaluation_deadlines()
RETURNS TABLE (
  call_report_id UUID,
  evaluations_completed INTEGER,
  decision_made TEXT
) AS $$
DECLARE
  v_report RECORD;
  v_internal_count INTEGER;
  v_decision TEXT;
BEGIN
  -- Find call reports that:
  -- 1. Haven't had final decision made yet
  -- 2. Have passed their deadline
  -- 3. Have at least minimum required evaluations
  FOR v_report IN
    SELECT
      cr.id,
      cr.required_evaluations,
      cr.minimum_evaluations_for_deadline,
      cr.evaluation_deadline
    FROM call_reports cr
    WHERE cr.final_decision_made_at IS NULL
    AND cr.evaluation_deadline < NOW()
  LOOP
    -- Count completed evaluations for this report
    SELECT COUNT(*) INTO v_internal_count
    FROM evaluator_forms ef
    WHERE ef.call_report_id = v_report.id
    AND ef.submitted_at IS NOT NULL
    AND ef.decision IS NOT NULL;

    -- If minimum threshold met, make decision
    IF v_internal_count >= v_report.minimum_evaluations_for_deadline THEN
      -- Calculate decision
      v_decision := calculate_evaluation_decision(v_report.id);

      -- Mark decision timestamp
      UPDATE call_reports
      SET final_decision_made_at = NOW()
      WHERE id = v_report.id;

      -- Return info about this decision
      call_report_id := v_report.id;
      evaluations_completed := v_internal_count;
      decision_made := v_decision;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_evaluation_deadlines IS 'Checks for call reports past deadline with minimum evaluations and auto-decides. Can be called manually or via cron job.';

COMMIT;
