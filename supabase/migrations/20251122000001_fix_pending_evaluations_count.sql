-- Migration: Fix get_pending_evaluations_count function
-- This ensures only call reports with status 'ready_for_evaluation' are counted

CREATE OR REPLACE FUNCTION get_pending_evaluations_count(evaluator_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM call_reports cr
  WHERE cr.meeting_type = 'call_report'
  AND cr.status = 'ready_for_evaluation'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluator_forms ef
    WHERE ef.call_report_id = cr.id
    AND ef.evaluator_id = evaluator_user_id
  );
$$;
