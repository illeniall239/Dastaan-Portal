-- Add reminder system for evaluation progression
-- This migration adds functionality to wait 5 days after 3/5 evaluations are complete,
-- sending daily reminders to remaining evaluators, and proceeding with available evaluations after 5 days if not all are complete

-- Add columns to evaluator_assignments to track reminder system
ALTER TABLE evaluator_assignments 
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP,
ADD COLUMN IF NOT EXISTS first_3_completed_date TIMESTAMP;

-- Add column to call_reports to track the deadline for 5-day waiting period
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS evaluations_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS minimum_evaluations_reached BOOLEAN DEFAULT FALSE;

-- Update the process_evaluation_completion function to include new reminder logic
-- First, drop the existing function
DROP FUNCTION IF EXISTS process_evaluation_completion() CASCADE;

-- Create the updated function with reminder logic
CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_call_report RECORD;
  v_total_evaluations INTEGER;
  v_internal_evaluations INTEGER;
  v_external_evaluations INTEGER;
  v_avg_score DECIMAL(3,2);
  v_new_status evaluation_status;
  v_evaluations_after_deadline BOOLEAN := FALSE;
BEGIN
  v_call_report_id := NEW.call_report_id;

  -- Get call report details
  SELECT * INTO v_call_report
  FROM call_reports
  WHERE id = v_call_report_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Count completed evaluations by type
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

  -- Update current progress and score
  UPDATE call_reports
  SET
    completed_evaluations = v_total_evaluations,
    completed_internal_evaluations = v_internal_evaluations,
    completed_external_evaluations = v_external_evaluations,
    current_average_score = v_avg_score,
    average_score = v_avg_score
  WHERE id = v_call_report_id;

  -- Update evaluator assignment status
  UPDATE evaluator_assignments
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE call_report_id = v_call_report_id
  AND evaluator_id = NEW.evaluator_id;

  -- Check if minimum required internal evaluators (3) have completed - the new threshold
  -- This starts the 5-day countdown
  IF v_internal_evaluations >= 3 AND NOT v_call_report.minimum_evaluations_reached THEN
    -- Mark that minimum evaluations have been reached
    UPDATE call_reports
    SET 
      minimum_evaluations_reached = TRUE,
      evaluations_deadline = NOW() + INTERVAL '5 days'
    WHERE id = v_call_report_id;

    -- Record the date when first 3 evaluations were completed
    UPDATE evaluator_assignments
    SET first_3_completed_date = NOW()
    WHERE call_report_id = v_call_report_id;
  END IF;

  -- Check if we've passed the deadline and there are still pending evaluations
  IF v_call_report.evaluations_deadline IS NOT NULL AND NOW() > v_call_report.evaluations_deadline THEN
    v_evaluations_after_deadline = TRUE;
  END IF;

  -- Check if minimum required internal evaluators (5) have completed OR we've passed the deadline
  -- External evaluators are optional and don't block progression
  IF (v_internal_evaluations >= 5 OR (v_evaluations_after_deadline AND v_internal_evaluations >= 3)) THEN
    -- Determine final status based on average score
    IF v_avg_score >= 7.0 THEN
      v_new_status := 'accepted'::evaluation_status;
    ELSIF v_avg_score >= 5.0 THEN
      v_new_status := 'needs_improvement'::evaluation_status;
    ELSE
      v_new_status := 'rejected'::evaluation_status;
    END IF;

    -- Update call report with final evaluation status
    UPDATE call_reports
    SET
      evaluation_status = v_new_status,
      average_score = v_avg_score,
      -- Set to completed status regardless of how many evaluations were received
      evaluation_status = CASE 
        WHEN v_internal_evaluations >= 5 THEN evaluation_status
        ELSE 'completed_after_deadline'::evaluation_status -- We can define this as a new status or use existing
      END
    WHERE id = v_call_report_id;

    -- If rejected, archive it
    IF v_new_status = 'rejected'::evaluation_status THEN
      PERFORM archive_rejected_call_report(v_call_report_id);
    END IF;
  ELSE
    -- Still in progress
    UPDATE call_reports
    SET evaluation_status = 'in_progress'::evaluation_status
    WHERE id = v_call_report_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_evaluation_completion ON evaluator_forms;

CREATE TRIGGER trigger_evaluation_completion
AFTER INSERT OR UPDATE OF submitted_at ON evaluator_forms
FOR EACH ROW
WHEN (NEW.submitted_at IS NOT NULL)
EXECUTE FUNCTION process_evaluation_completion();

-- Function to send daily reminders to pending evaluators
CREATE OR REPLACE FUNCTION send_evaluation_reminders()
RETURNS void AS $$
DECLARE
  v_evaluator RECORD;
  v_call_report RECORD;
  v_assignment RECORD;
  v_deadline_passed BOOLEAN := FALSE;
BEGIN
  -- Loop through all call reports that have reached the minimum threshold but are not yet complete
  FOR v_call_report IN
    SELECT cr.*, ea.first_3_completed_date
    FROM call_reports cr
    JOIN evaluator_assignments ea ON cr.id = ea.call_report_id
    WHERE cr.minimum_evaluations_reached = TRUE 
    AND cr.evaluation_status = 'in_progress'::evaluation_status
    AND cr.evaluations_deadline IS NOT NULL
    GROUP BY cr.id, ea.first_3_completed_date
  LOOP
    -- Check if we've passed the deadline
    v_deadline_passed := NOW() > v_call_report.evaluations_deadline;

    -- Loop through all pending evaluators for this call report
    FOR v_assignment IN
      SELECT ea.*, u.name, u.email
      FROM evaluator_assignments ea
      JOIN users u ON ea.evaluator_id = u.id
      WHERE ea.call_report_id = v_call_report.id
      AND ea.status != 'completed'
      AND (ea.last_reminder_sent IS NULL OR ea.last_reminder_sent < NOW() - INTERVAL '1 day')
    LOOP
      -- Send reminder notification (in a real system this would call an email service)
      -- For now, we'll just update the reminder fields
      UPDATE evaluator_assignments
      SET 
        reminder_count = reminder_count + 1,
        last_reminder_sent = NOW()
      WHERE id = v_assignment.id;

      -- In a real implementation, this would send an email notification to the evaluator
      -- RAISE NOTICE 'Sending reminder email to evaluator % for call report %', v_assignment.name, v_call_report.call_report_id;
    END LOOP;

    -- If deadline has passed and we have at least 3 evaluations, we should proceed
    IF v_deadline_passed AND v_call_report.completed_internal_evaluations >= 3 THEN
      -- Update the call report status to reflect that we're proceeding after deadline
      UPDATE call_reports
      SET evaluation_status = 'completed_after_deadline'::evaluation_status
      WHERE id = v_call_report.id;

      -- Update all pending assignments to mark them as expired/ignored
      UPDATE evaluator_assignments
      SET status = 'expired_after_deadline'
      WHERE call_report_id = v_call_report.id
      AND status != 'completed';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run the reminder system (can be called by a scheduled job)
CREATE OR REPLACE FUNCTION run_daily_evaluation_reminders()
RETURNS void AS $$
BEGIN
  -- Call the function to send reminders
  PERFORM send_evaluation_reminders();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION send_evaluation_reminders() IS 'Sends daily reminders to evaluators who have not completed their evaluations after 3/5 have been completed.';
COMMENT ON FUNCTION run_daily_evaluation_reminders() IS 'Wrapper function to run the daily reminder system, intended to be called by a scheduled job.';