-- Fix Overall Assessment to be a calculated average instead of a scorable field
-- This migration updates the average calculation to exclude overall_assessment_score
-- Also fixes the process_evaluation_completion() function bug with evaluation_status type

-- Temporarily disable triggers to avoid errors during migration
DROP TRIGGER IF EXISTS on_evaluation_submitted ON evaluator_forms;
DROP TRIGGER IF EXISTS evaluation_completion_trigger ON evaluator_forms;

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS auto_calculate_evaluation_average ON evaluator_forms;
DROP FUNCTION IF EXISTS calculate_evaluation_average();

-- Create updated function to calculate average from only 5 criteria
-- Excludes overall_assessment_score from calculation
CREATE OR REPLACE FUNCTION calculate_evaluation_average()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average from only the 5 evaluation criteria
  -- overall_assessment_score is now deprecated and not used in calculation
  NEW.average_score := ROUND(
    (
      COALESCE(NEW.premise_conflict_score, 0) +
      COALESCE(NEW.storyline_plot_score, 0) +
      COALESCE(NEW.episodic_progression_score, 0) +
      COALESCE(NEW.characters_score, 0) +
      COALESCE(NEW.dialogues_score, 0)
    )::DECIMAL / 5, 1
  );

  -- Set overall_assessment_score to NULL for new evaluations
  -- This field is kept for backward compatibility but should not be used
  IF TG_OP = 'INSERT' THEN
    NEW.overall_assessment_score := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to auto-calculate average on insert/update
CREATE TRIGGER auto_calculate_evaluation_average
  BEFORE INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  EXECUTE FUNCTION calculate_evaluation_average();

-- Fix the process_evaluation_completion() function with correct enum type
CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_call_report RECORD;
  v_total_evaluations INTEGER;
  v_avg_score NUMERIC;
  v_new_status evaluation_status;  -- FIXED: Changed from TEXT to evaluation_status
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
      v_new_status := 'completed'::evaluation_status;
    ELSIF v_avg_score >= 5.0 THEN
      v_new_status := 'needs_improvement'::evaluation_status;
    ELSE
      v_new_status := 'rejected'::evaluation_status;
    END IF;
  ELSIF v_total_evaluations > 0 THEN
    -- Some evaluations done but not all
    v_new_status := 'in_progress'::evaluation_status;
  ELSE
    -- No evaluations yet
    v_new_status := 'pending'::evaluation_status;
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

-- Make overall_assessment_score nullable (if not already)
ALTER TABLE evaluator_forms
  ALTER COLUMN overall_assessment_score DROP NOT NULL;

-- Update existing records to recalculate averages correctly
UPDATE evaluator_forms
SET average_score = ROUND(
  (
    COALESCE(premise_conflict_score, 0) +
    COALESCE(storyline_plot_score, 0) +
    COALESCE(episodic_progression_score, 0) +
    COALESCE(characters_score, 0) +
    COALESCE(dialogues_score, 0)
  )::DECIMAL / 5, 1
)
WHERE premise_conflict_score IS NOT NULL
  OR storyline_plot_score IS NOT NULL
  OR episodic_progression_score IS NOT NULL
  OR characters_score IS NOT NULL
  OR dialogues_score IS NOT NULL;

-- Update comment to reflect the change
COMMENT ON COLUMN evaluator_forms.overall_assessment_score IS 'DEPRECATED: Overall assessment is now calculated as the average of the 5 criteria scores. This field is kept for backward compatibility only.';
COMMENT ON COLUMN evaluator_forms.average_score IS 'Automatically calculated average of 5 evaluation criteria (premise_conflict, storyline_plot, episodic_progression, characters, dialogues)';

-- Re-enable the evaluation completion trigger (using correct trigger name)
CREATE TRIGGER evaluation_completion_trigger
  AFTER INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION process_evaluation_completion();

-- Add comments
COMMENT ON FUNCTION process_evaluation_completion() IS
'Automatically updates call report evaluation counts and status when evaluations are submitted.
All submitted evaluations count toward the required 5, regardless of user role or evaluator_type.
FIXED: v_new_status now properly typed as evaluation_status enum instead of TEXT.';
