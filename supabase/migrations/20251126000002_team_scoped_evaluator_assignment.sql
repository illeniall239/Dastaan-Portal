-- ============================================================================
-- TEAM-SCOPED EVALUATOR ASSIGNMENT (5 Internal Evaluators)
-- ============================================================================
-- Migration: 20251126000002_team_scoped_evaluator_assignment.sql
-- Purpose: Update auto_assign_evaluators to only assign 5 internal evaluators
--          from the same team as the call report (team isolation)
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS auto_assign_evaluators(UUID);

-- Create team-scoped version with 5 internal evaluators only
CREATE OR REPLACE FUNCTION auto_assign_evaluators(p_call_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_call_report_team_id UUID;
  v_internal_evaluators UUID[];
  v_evaluator_id UUID;
  v_evaluator_count INTEGER;
BEGIN
  -- Get the team_id of the call report
  SELECT team_id INTO v_call_report_team_id
  FROM call_reports
  WHERE id = p_call_report_id;

  -- If no team assigned, log warning and skip auto-assignment
  IF v_call_report_team_id IS NULL THEN
    RAISE WARNING 'Call report % has no team_id assigned, skipping auto-assignment', p_call_report_id;
    RETURN;
  END IF;

  -- Get 5 random internal evaluators FROM SAME TEAM ONLY
  SELECT ARRAY(
    SELECT id
    FROM users
    WHERE role = 'evaluator'
    AND evaluator_type = 'internal'
    AND team_id = v_call_report_team_id  -- TEAM ISOLATION
    AND status = 'active'
    ORDER BY RANDOM()
    LIMIT 5
  ) INTO v_internal_evaluators;

  -- Count how many evaluators were found
  v_evaluator_count := COALESCE(array_length(v_internal_evaluators, 1), 0);

  -- Log warning if insufficient evaluators in team
  IF v_evaluator_count < 5 THEN
    RAISE WARNING 'Team % has only % internal evaluators (need 5 for full evaluation)',
      v_call_report_team_id, v_evaluator_count;
  END IF;

  -- Insert internal evaluator assignments
  FOREACH v_evaluator_id IN ARRAY v_internal_evaluators
  LOOP
    INSERT INTO evaluator_assignments (
      call_report_id,
      evaluator_id,
      evaluator_type,
      team_id,
      status
    ) VALUES (
      p_call_report_id,
      v_evaluator_id,
      'internal',
      v_call_report_team_id,
      'pending'
    ) ON CONFLICT (call_report_id, evaluator_id) DO NOTHING;
  END LOOP;

  -- Update call_report with required evaluators (5 internal, 0 external)
  UPDATE call_reports
  SET
    required_evaluators = 5,
    required_internal_evaluators = 5,
    required_external_evaluators = 0
  WHERE id = p_call_report_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_assign_evaluators(UUID) IS
'Automatically assigns 5 internal evaluators FROM SAME TEAM ONLY to a call report. External evaluators are not auto-assigned.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
