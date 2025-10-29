-- Update evaluator system to 5 internal evaluators
-- External evaluators are optional and assigned per project basis

-- Update call_reports default values
ALTER TABLE call_reports
ALTER COLUMN required_evaluators SET DEFAULT 5,
ALTER COLUMN required_internal_evaluators SET DEFAULT 5,
ALTER COLUMN required_external_evaluators SET DEFAULT 0;

-- Update existing call reports to new defaults (if not already assigned)
UPDATE call_reports
SET
  required_evaluators = 5,
  required_internal_evaluators = 5,
  required_external_evaluators = 0
WHERE required_evaluators = 20; -- Only update old 20-evaluator records

-- Drop and recreate auto_assign_evaluators function for 5 internal evaluators
DROP FUNCTION IF EXISTS auto_assign_evaluators(UUID);

CREATE OR REPLACE FUNCTION auto_assign_evaluators(p_call_report_id UUID)
RETURNS void AS $$
DECLARE
  v_internal_evaluators UUID[];
  v_evaluator_id UUID;
BEGIN
  -- Get 5 random internal evaluators
  SELECT ARRAY(
    SELECT id
    FROM users
    WHERE role = 'evaluator'
    AND evaluator_type = 'internal'
    AND status = 'active'
    ORDER BY RANDOM()
    LIMIT 5
  ) INTO v_internal_evaluators;

  -- Insert internal evaluator assignments
  FOREACH v_evaluator_id IN ARRAY v_internal_evaluators
  LOOP
    INSERT INTO evaluator_assignments (
      call_report_id,
      evaluator_id,
      evaluator_type,
      status
    ) VALUES (
      p_call_report_id,
      v_evaluator_id,
      'internal',
      'pending'
    ) ON CONFLICT (call_report_id, evaluator_id) DO NOTHING;
  END LOOP;

  -- Update call_report with required evaluators
  UPDATE call_reports
  SET
    required_evaluators = 5,
    required_internal_evaluators = 5,
    required_external_evaluators = 0
  WHERE id = p_call_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update process_evaluation_completion trigger to work with 5+ evaluators
-- External evaluators are optional, so we only check if minimum internal are complete
DROP FUNCTION IF EXISTS process_evaluation_completion() CASCADE;

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

  -- Check if minimum required internal evaluators (5) have completed
  -- External evaluators are optional and don't block progression
  IF v_internal_evaluations >= v_call_report.required_internal_evaluators THEN
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
      average_score = v_avg_score
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

-- Update get_evaluation_progress function to reflect new structure
DROP FUNCTION IF EXISTS get_evaluation_progress(UUID);

CREATE OR REPLACE FUNCTION get_evaluation_progress(p_call_report_id UUID)
RETURNS TABLE (
  total_required INTEGER,
  total_completed INTEGER,
  internal_required INTEGER,
  internal_completed INTEGER,
  external_required INTEGER,
  external_completed INTEGER,
  progress_percentage DECIMAL(5,2),
  current_average DECIMAL(3,2),
  is_complete BOOLEAN
) AS $$
DECLARE
  v_call_report RECORD;
  v_internal_completed INTEGER;
  v_external_completed INTEGER;
  v_total_completed INTEGER;
  v_current_avg DECIMAL(3,2);
BEGIN
  -- Get call report
  SELECT
    cr.required_evaluators,
    cr.required_internal_evaluators,
    cr.required_external_evaluators,
    cr.completed_evaluations,
    cr.completed_internal_evaluations,
    cr.completed_external_evaluations,
    cr.current_average_score,
    cr.evaluation_status
  INTO v_call_report
  FROM call_reports cr
  WHERE cr.id = p_call_report_id;

  IF NOT FOUND THEN
    -- Return default values if call report not found
    RETURN QUERY SELECT
      5::INTEGER,
      0::INTEGER,
      5::INTEGER,
      0::INTEGER,
      0::INTEGER,
      0::INTEGER,
      0::DECIMAL(5,2),
      NULL::DECIMAL(3,2),
      FALSE::BOOLEAN;
    RETURN;
  END IF;

  v_internal_completed := COALESCE(v_call_report.completed_internal_evaluations, 0);
  v_external_completed := COALESCE(v_call_report.completed_external_evaluations, 0);
  v_total_completed := COALESCE(v_call_report.completed_evaluations, 0);
  v_current_avg := v_call_report.current_average_score;

  -- Calculate progress percentage based on internal evaluators only
  -- External evaluators don't affect completion percentage
  RETURN QUERY SELECT
    v_call_report.required_evaluators,
    v_total_completed,
    v_call_report.required_internal_evaluators,
    v_internal_completed,
    COALESCE(v_call_report.required_external_evaluators, 0),
    v_external_completed,
    CASE
      WHEN v_call_report.required_internal_evaluators > 0 THEN
        (v_internal_completed::DECIMAL / v_call_report.required_internal_evaluators::DECIMAL * 100)
      ELSE 0
    END,
    v_current_avg,
    (v_internal_completed >= v_call_report.required_internal_evaluators)::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_evaluation_progress IS 'Returns evaluation progress. External evaluators are optional and do not block completion.';
