-- ============================================================================
-- ADD TEAM ISOLATION TO PENDING EVALUATIONS COUNT RPC
-- ============================================================================
-- Purpose: Add team_id filtering to get_pending_evaluations_count RPC
-- Problem: RPC counts ALL call reports from ALL teams
-- Solution: Add optional team_id parameter and filter
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_pending_evaluations_count(UUID);

-- Recreate with team_id parameter
CREATE OR REPLACE FUNCTION get_pending_evaluations_count(
  evaluator_user_id UUID,
  team_id_filter UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result_count INTEGER;
  user_team_id UUID;
BEGIN
  -- If no team_id provided, get it from user
  IF team_id_filter IS NULL THEN
    SELECT team_id INTO user_team_id
    FROM users
    WHERE id = evaluator_user_id;
  ELSE
    user_team_id := team_id_filter;
  END IF;

  -- Count pending evaluations with team filter
  SELECT COUNT(*)::INTEGER INTO result_count
  FROM call_reports cr
  WHERE cr.meeting_type = 'call_report'
  AND cr.status = 'ready_for_evaluation'
  -- TEAM ISOLATION: Filter by team
  AND (user_team_id IS NULL OR cr.team_id = user_team_id)
  AND NOT EXISTS (
    SELECT 1
    FROM evaluator_forms ef
    WHERE ef.call_report_id = cr.id
    AND ef.evaluator_id = evaluator_user_id
  );

  RETURN result_count;
END;
$$;

COMMENT ON FUNCTION get_pending_evaluations_count IS
  'Counts pending call reports for evaluator with team isolation';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
